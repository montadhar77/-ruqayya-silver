"""Stage 8: the Cloudflare Pages build, run locally with wrangler (Cloudflare's own local
runtime): only public files are published, headers are right, and the cached catalogue
proxy works (MISS → HIT, stale served while the database is down). Skipped when wrangler
is not installed (set RQ_WRANGLER to its path)."""
import json
import os
import shutil
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import pytest

import harness
import stack

ROOT = Path(__file__).resolve().parents[2]
WRANGLER = os.environ.get("RQ_WRANGLER") or shutil.which("wrangler")
PORT = 8789
pytestmark = pytest.mark.skipif(not WRANGLER, reason="wrangler not installed (RQ_WRANGLER)")


def get(path, method="GET", data=None):
    req = urllib.request.Request(f"http://127.0.0.1:{PORT}{path}", method=method, data=data)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, {k.lower(): v for k, v in r.headers.items()}, r.read()
    except urllib.error.HTTPError as e:
        return e.code, {k.lower(): v for k, v in e.headers.items()}, e.read()


@pytest.fixture(scope="module")
def pages(stk):
    out = Path(tempfile.mkdtemp(prefix="rq_dist_"))
    subprocess.run(["node", str(ROOT / "scripts" / "build.mjs"), str(out)], check=True, env=dict(os.environ, RQ_KEEP_LOCAL="1"),
                   capture_output=True)
    env = dict(os.environ, WRANGLER_SEND_METRICS="false", NO_PROXY="127.0.0.1,localhost", no_proxy="127.0.0.1,localhost")
    log = open(out.parent / f"wrangler_{PORT}.log", "wb")
    p = subprocess.Popen([WRANGLER, "pages", "dev", str(out), "--port", str(PORT), "--ip", "127.0.0.1", "--persist-to", str(out) + "_state",
                          "--binding", f"SUPABASE_URL={stk['gateway']}", "--binding", f"SUPABASE_KEY={stack.PUBLISHABLE}", "--binding", "RQ_TTL_SECONDS=2"],
                         cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT)
    deadline = time.time() + 90
    while time.time() < deadline:
        try:
            if get("/")[0] == 200:
                break
        except OSError:
            pass
        time.sleep(0.5)
    else:
        p.terminate()
        raise RuntimeError("wrangler did not start: " + (out.parent / f"wrangler_{PORT}.log").read_text()[-2000:])
    yield {"out": out, "site": f"http://127.0.0.1:{PORT}"}
    p.terminate()
    try:
        p.wait(10)
    except subprocess.TimeoutExpired:
        p.kill()
    shutil.rmtree(out, ignore_errors=True)
    shutil.rmtree(str(out) + "_state", ignore_errors=True)


def test_only_public_files_are_published(pages):
    for path in ("/tests/db/harness.py", "/supabase/schema.sql", "/supabase/migrations/0001_inventory_idempotency.sql",
                 "/scripts/backup.sh", "/docs/RUNBOOK.md", "/README.md", "/.github/workflows/test.yml"):
        status, _, body = get(path)
        assert status == 404, (path, status)
        assert b"create table" not in body.lower() and b"import harness" not in body
    assert get("/robots.txt")[0] == 200


def test_security_and_cache_headers(pages):
    s, h, body = get("/")
    assert s == 200 and b"127.0.0.1" in body                                  # (local build keeps the test origin)
    assert h["x-content-type-options"] == "nosniff" and "max-age=31536000" in h["strict-transport-security"]
    assert h["x-frame-options"] == "SAMEORIGIN" and "must-revalidate" in h["cache-control"]
    assert "camera=()" in h["permissions-policy"]
    s, h, body = get("/admin/")
    assert s == 200 and h["x-frame-options"] == "DENY" and "frame-ancestors 'none'" in h["content-security-policy"]
    assert "noindex" in h["x-robots-tag"] and h["cache-control"] == "no-store"
    html = (pages["out"] / "index.html").read_text()
    ref = html.split('src="assets/js/site.js?v=')[1].split('"')[0]
    s, h, _ = get(f"/assets/js/site.js?v={ref}")
    assert s == 200 and "immutable" in h["cache-control"]
    s, h, _ = get("/admin")
    assert s in (301, 308, 200)


def test_catalogue_proxy_caches_and_survives_a_database_outage(pages, stk):
    s1, h1, b1 = get("/api/rpc/catalog_home?p_limit=60&ignored=1")
    assert s1 == 200 and h1["x-rq-proxy"] == "1" and h1["x-rq-cache"] in ("MISS", "HIT", "STALE")
    assert json.loads(b1)["total"] >= 1 and "max-age=2" in h1["cache-control"]      # (TTL shortened to 2 s for this test)
    s2, h2, b2 = get("/api/rpc/catalog_home?p_limit=60")
    assert s2 == 200 and h2["x-rq-cache"] == "HIT" and b2 == b1                 # second visitor: from the edge cache
    # database down after the entry went stale: the last good catalogue is still served at once
    time.sleep(2.5)
    procs = stk["procs"]
    procs[0].send_signal(19)                                                     # SIGSTOP PostgREST
    try:
        t0 = time.time()
        s3, h3, b3 = get("/api/rpc/catalog_home?p_limit=60")
        assert s3 == 200 and h3["x-rq-cache"] == "STALE" and b3 == b1 and time.time() - t0 < 3
    finally:
        procs[0].send_signal(18)                                                 # SIGCONT


def test_proxy_refuses_everything_else(pages):
    assert get("/api/rpc/admin_orders")[0] == 404
    assert get("/api/rpc/place_order")[0] == 404
    assert get("/api/rpc/catalog_home", method="POST", data=b"{}")[0] == 405
    assert get("/api/rpc/search_products?p_q=" + urllib.parse.quote("ا" * 200))[0] == 400
    s, h, b = get("/api/rpc/product_page?p_id=not-a-uuid")
    assert s == 400 and h["x-rq-proxy"] == "1"                                    # database error passed through, not cached


def test_site_runs_on_pages_build_through_the_proxy(pages, stk, tab):
    t = tab(width=390, height=844)
    t.ctx.add_init_script("sessionStorage.setItem('rq_api', '/api/rpc')")
    t.page.goto(f"{pages['site']}/index.html?backend=local#/shop")
    t.page.wait_for_selector(".card")
    assert t.page.locator(".card").count() >= 1
    t.page.goto(f"{pages['site']}/index.html?backend=local#/p/6c96ae41-cd0b-40d5-bb79-79e309025b72")
    t.page.wait_for_selector("#addBtn")
    assert not t.errors, t.errors
