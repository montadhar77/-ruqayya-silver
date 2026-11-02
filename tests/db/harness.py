"""Local database harness: builds throw-away databases on a local PostgreSQL
cluster, applies the Supabase stand-in + every migration, and runs code as the
same roles the Supabase API uses (anon / authenticated / service_role).

It never connects to Supabase. Connection settings come from the environment:
  RQ_PG_HOST (default /tmp/pgrq)  RQ_PG_PORT (default 54329)  RQ_PG_USER (default postgres)
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import uuid
from contextlib import contextmanager
from pathlib import Path

import psycopg

ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = ROOT / "supabase" / "migrations"
ROLLBACKS = ROOT / "supabase" / "rollbacks"
STUB = ROOT / "supabase" / "tests" / "stub.sql"
FIXTURES = Path(__file__).with_name("fixtures.sql")

HOST = os.environ.get("RQ_PG_HOST", "/tmp/pgrq")
PORT = os.environ.get("RQ_PG_PORT", "54329")
USER = os.environ.get("RQ_PG_USER", "postgres")

ADMIN_ID = "00000000-0000-4000-8000-0000000000a1"
USER_ID = "00000000-0000-4000-8000-0000000000b2"


def dsn(db: str) -> str:
    return f"host={HOST} port={PORT} user={USER} dbname={db}"


def migrations(upto: str | None = None) -> list[Path]:
    files = sorted(p for p in MIGRATIONS.glob("*.sql") if re.match(r"^\d{4}_", p.name))
    if upto is not None:
        files = [p for p in files if p.name[:4] <= upto]
    return files


def rollback_for(migration: Path) -> Path:
    return ROLLBACKS / migration.name.replace(".sql", ".down.sql")


def run_sql_file(db: str, path: Path) -> None:
    with psycopg.connect(dsn(db), autocommit=True) as c:
        c.execute(path.read_text())


def create_db(name: str | None = None, template: str | None = None) -> str:
    name = name or f"rq_t_{uuid.uuid4().hex[:10]}"
    with psycopg.connect(dsn("postgres"), autocommit=True) as c:
        c.execute(f'create database "{name}"' + (f' template "{template}"' if template else ""))
    return name


def drop_db(name: str) -> None:
    with psycopg.connect(dsn("postgres"), autocommit=True) as c:
        c.execute("select pg_terminate_backend(pid) from pg_stat_activity where datname = %s and pid <> pg_backend_pid()", (name,))
        c.execute(f'drop database if exists "{name}"')


def build(upto: str | None = None, fixtures: bool = True, name: str | None = None) -> str:
    """Fresh database with the stand-in, migrations up to `upto` (inclusive) and test fixtures."""
    db = create_db(name)
    run_sql_file(db, STUB)
    for m in migrations(upto):
        run_sql_file(db, m)
    if fixtures:
        run_sql_file(db, FIXTURES)
    return db


def schema_dump(db: str) -> str:
    """Schema-only dump of the app schemas, normalised so two builds can be compared."""
    out = subprocess.run(
        ["pg_dump", "-h", HOST, "-p", PORT, "-U", USER, "--schema-only", "--no-owner",
         "-n", "public", "-n", "private", "-n", "storage", db],
        check=True, capture_output=True, text=True).stdout
    lines = [l for l in out.splitlines() if l and not l.startswith("--") and not l.startswith("\\")
             and not l.startswith("SET ") and not l.startswith("SELECT pg_catalog.set_config")]
    return "\n".join(lines)


class Session:
    """One connection that runs statements as an API role, the way PostgREST does
    (SET LOCAL ROLE + request.jwt.claims inside a transaction)."""

    def __init__(self, db: str, role: str = "anon", uid: str | None = None, headers: dict | None = None):
        self.conn = psycopg.connect(dsn(db), autocommit=False)
        self.role, self.uid, self.headers = role, uid, headers or {}

    def _prepare(self, cur):
        claims = {"role": self.role}
        if self.uid:
            claims["sub"] = self.uid
        cur.execute("select set_config('request.jwt.claims', %s, true), set_config('request.headers', %s, true)",
                    (json.dumps(claims), json.dumps(self.headers)))
        cur.execute(f"set local role {self.role}")

    def q(self, sql: str, params=None, commit: bool = True):
        """Run one statement in its own transaction; return all rows (or None)."""
        with self.conn.cursor() as cur:
            try:
                self._prepare(cur)
                cur.execute(sql, params)
                rows = cur.fetchall() if cur.description else None
                if commit:
                    self.conn.commit()
                else:
                    self.conn.rollback()
                return rows
            except Exception:
                self.conn.rollback()
                raise

    def one(self, sql: str, params=None):
        rows = self.q(sql, params)
        return rows[0][0] if rows else None

    def close(self):
        self.conn.close()


@contextmanager
def session(db: str, role: str = "anon", uid: str | None = None, headers: dict | None = None):
    s = Session(db, role, uid, headers)
    try:
        yield s
    finally:
        s.close()


def admin_sql(db: str, sql: str, params=None):
    """Run as the database owner (like the Supabase SQL editor / migrations)."""
    with psycopg.connect(dsn(db), autocommit=True) as c:
        cur = c.execute(sql, params)
        return cur.fetchall() if cur.description else None
