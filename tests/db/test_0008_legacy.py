"""0008: the unused tables of the earlier exhibition project are removed — but never
if they hold data."""
import psycopg
import pytest

import harness

LEGACY = ["exhibitions", "artworks", "artwork_images", "messages", "newsletter_subscribers", "site_settings", "social_links"]


def test_legacy_tables_are_gone(db):
    for t in LEGACY:
        assert harness.admin_sql(db, "select to_regclass(%s)", (f"public.{t}",)) == [(None,)]
    assert harness.admin_sql(db, "select count(*) from pg_policies where schemaname = 'storage' and policyname like 'artwork_images_%%'") == [(0,)]


def test_shop_still_works_without_them(anon):
    assert anon.one("select public.catalog_home()")["total"] == 4


def test_refuses_to_drop_tables_that_hold_data():
    db = harness.build(upto="0007")
    try:
        harness.admin_sql(db, "insert into public.messages (name, email, body) values ('x', 'x@test.invalid', 'kept')")
        with pytest.raises(psycopg.errors.RaiseException, match="not empty"):
            harness.run_sql_file(db, harness.MIGRATIONS / "0008_drop_legacy.sql")
        assert harness.admin_sql(db, "select count(*) from public.messages") == [(1,)]
    finally:
        harness.drop_db(db)
