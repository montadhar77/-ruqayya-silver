"""Every migration after the baseline must have a rollback, and up -> down -> up
must leave the schema exactly as before (checked with pg_dump), with data present."""
import pytest

import harness

LATER = [m for m in harness.migrations() if m.name[:4] != "0000"]


def test_every_migration_has_a_rollback():
    missing = [m.name for m in LATER if not harness.rollback_for(m).exists()]
    assert not missing, missing


def test_migrations_are_idempotent_names():
    nums = [m.name[:4] for m in harness.migrations()]
    assert len(nums) == len(set(nums)), "two migrations share a number"


@pytest.mark.parametrize("mig", LATER, ids=[m.name for m in LATER])
def test_up_down_up(mig):
    n = mig.name[:4]
    prev = harness.migrations(upto=n)[-2].name[:4]
    before = harness.build(upto=prev, fixtures=False)
    after = harness.build(upto=n, fixtures=False)
    try:
        dump_before, dump_after = harness.schema_dump(before), harness.schema_dump(after)
        harness.run_sql_file(after, harness.rollback_for(mig))
        assert harness.schema_dump(after) == dump_before, "rollback did not restore the previous schema"
        harness.run_sql_file(after, mig)
        assert harness.schema_dump(after) == dump_after, "re-applying the migration changed the schema"
    finally:
        harness.drop_db(before)
        harness.drop_db(after)


@pytest.mark.parametrize("mig", LATER, ids=[m.name for m in LATER])
def test_rollback_with_data(mig):
    """Rollback must succeed on a database that already holds data (orders, stock moves...)."""
    n = mig.name[:4]
    db = harness.build(upto=n, fixtures=True)
    try:
        harness.run_sql_file(db, harness.rollback_for(mig))
        harness.run_sql_file(db, mig)
    finally:
        harness.drop_db(db)


def test_fast_launch_order_0001_0006_0007_then_the_rest():
    """The launch order in docs/PRODUCTION.md allows 0006/0007 before 0002-0005 (no outside accounts needed)."""
    db = harness.create_db()
    try:
        harness.run_sql_file(db, harness.STUB)
        order = ["0000", "0001", "0006", "0007", "0002", "0003", "0004", "0005", "0008"]
        for n in order[:4]:
            harness.run_sql_file(db, next(m for m in harness.migrations() if m.name.startswith(n)))
        harness.run_sql_file(db, harness.FIXTURES)
        with harness.session(db, "anon") as s:
            assert s.one("select public.catalog_home()")["total"] == 4
        for n in order[4:]:
            harness.run_sql_file(db, next(m for m in harness.migrations() if m.name.startswith(n)))
        with harness.session(db, "anon") as s:
            assert s.one("select public.search_products('عقيق')")["total"] == 1
    finally:
        harness.drop_db(db)
