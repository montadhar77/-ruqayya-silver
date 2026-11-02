"""The backup is encrypted, and a restore drill brings every order back (local databases only)."""
import json
import os
import re
import shutil
import subprocess
from pathlib import Path

import pytest

import harness

AGE_DIR = os.environ.get("RQ_AGE_DIR") or str(Path("/tmp/claude-0/-home-claude/b9834369-8d56-5eee-b70e-e6b01d8d4a10/scratchpad/tools/age/age"))
AGE = shutil.which("age") or os.path.join(AGE_DIR, "age")
KEYGEN = shutil.which("age-keygen") or os.path.join(AGE_DIR, "age-keygen")
pytestmark = pytest.mark.skipif(not os.path.exists(AGE), reason="age not installed")
P1 = "20000000-0000-4000-8000-000000000001"
P2 = "20000000-0000-4000-8000-000000000002"


def uri(db):
    return f"postgresql://{harness.USER}@/{db}?host={harness.HOST}&port={harness.PORT}"


def test_backup_is_encrypted_and_restores_everything(db, tmp_path):
    with harness.session(db) as s:
        for i in range(3):
            s.one("select public.place_order(%s::jsonb, %s::jsonb)",
                  (json.dumps({"name": f"زبون النسخة {i}", "phone": f"0770000010{i}"}), json.dumps([{"id": P1}, {"id": P2}])))
        s.q("insert into public.inquiries (name, phone, body) values ('زائر النسخة', '', 'سؤال للنسخة الاحتياطية')")
    harness.admin_sql(db, "update private.rate_rules set max_count = 7 where kind = 'order' and scope = 'ip' and window_seconds = 600")
    harness.admin_sql(db, "drop table private.rate_rules_shipped")   # test-only helper table, not part of the real schema
    key = tmp_path / "key.txt"
    subprocess.run([KEYGEN, "-o", str(key)], check=True, capture_output=True)
    recipient = re.search(r"public key: (age1\w+)", key.read_text()).group(1)
    env = dict(os.environ, SUPABASE_DB_URL=uri(db), AGE_RECIPIENT=recipient, AGE=AGE)
    out = subprocess.run(["scripts/backup.sh", str(tmp_path)], cwd=harness.ROOT, env=env, check=True, capture_output=True, text=True)
    backup = Path(out.stdout.strip().splitlines()[-1])
    raw = backup.read_bytes()
    assert raw.startswith(b"age-encryption.org/v1")
    assert "زبون النسخة".encode() not in raw and b"07700000100" not in raw

    drill = subprocess.run(["scripts/restore-drill.sh", str(backup), str(key)], cwd=harness.ROOT,
                           env=dict(os.environ, AGE=AGE), capture_output=True, text=True)
    assert drill.returncode == 0, drill.stderr[-2000:]
    got = dict(l.split("=", 1) for l in drill.stdout.splitlines() if "=" in l and not l.startswith("restored"))
    src = harness.admin_sql(db, "select count(*), max(order_no) from public.orders")[0]
    assert got["orders"] == str(src[0]) == "3" and got["last_order"] == str(src[1])
    assert got["products"] == "5" and got["inquiries"] == "1" and got["rls_tables_without_rls"] == "0"
    target = re.search(r"dbname=|/(rq_restore_\w+)\?", drill.stdout).group(1)
    try:
        # owner's customised limit and stock state came back exactly; new orders continue the numbering
        assert harness.admin_sql(target, "select max_count from private.rate_rules where kind = 'order' and scope = 'ip' and window_seconds = 600") == [(7,)]
        assert harness.admin_sql(target, f"select stock from public.products where id = '{P2}'") == [(2,)]
        with harness.session(target) as s:
            harness.admin_sql(target, "update private.rate_rules set max_count = 1000000")
            nxt = s.one("select public.place_order(%s::jsonb, %s::jsonb)", (json.dumps({"name": "بعد الاستعادة", "phone": "07700000199"}), json.dumps([{"id": P1}])))
        assert nxt["order_no"] == src[1] + 1
    finally:
        harness.drop_db(target)


def test_wrong_key_cannot_open_the_backup(db, tmp_path):
    k1, k2 = tmp_path / "k1.txt", tmp_path / "k2.txt"
    for k in (k1, k2):
        subprocess.run([KEYGEN, "-o", str(k)], check=True, capture_output=True)
    recipient = re.search(r"public key: (age1\w+)", k1.read_text()).group(1)
    env = dict(os.environ, SUPABASE_DB_URL=uri(db), AGE_RECIPIENT=recipient, AGE=AGE)
    out = subprocess.run(["scripts/backup.sh", str(tmp_path)], cwd=harness.ROOT, env=env, check=True, capture_output=True, text=True)
    backup = out.stdout.strip().splitlines()[-1]
    drill = subprocess.run(["scripts/restore-drill.sh", backup, str(k2)], cwd=harness.ROOT, env=dict(os.environ, AGE=AGE), capture_output=True, text=True)
    assert drill.returncode != 0 and "no identity matched" in drill.stderr
