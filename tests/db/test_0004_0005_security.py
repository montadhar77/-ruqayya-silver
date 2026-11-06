"""Least privilege, upload types, client error log, and two-step verification for admins."""
import json

import psycopg
import pytest

import harness

P1 = "20000000-0000-4000-8000-000000000001"


# ------------------------------------------------------------------ 0004: privileges
def test_api_roles_have_no_truncate_trigger_references(db):
    rows = harness.admin_sql(db, """
        select c.relname, r.rolname, p.privilege_type
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        cross join (values ('anon'), ('authenticated'), ('service_role')) r(rolname)
        cross join (values ('TRUNCATE'), ('TRIGGER'), ('REFERENCES')) p(privilege_type)
        where n.nspname = 'public' and c.relkind = 'r' and has_table_privilege(r.rolname, c.oid, p.privilege_type)""")
    assert rows == []


def test_anon_cannot_truncate_orders(anon):
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        anon.q("truncate public.orders")


def test_new_tables_do_not_get_them_either(db):
    harness.admin_sql(db, "create table public.zz_new (id int)")
    assert harness.admin_sql(db, "select has_table_privilege('anon', 'public.zz_new', 'TRUNCATE')") == [(False,)]
    assert harness.admin_sql(db, "select relrowsecurity from pg_class where relname = 'zz_new'") == [(True,)]   # ensure_rls trigger


def test_api_still_works_after_hardening(anon, admin):
    assert len(anon.q("select id from public.products")) == 4
    anon.one("select public.place_order(%s::jsonb, %s::jsonb)", (json.dumps({"name": "زبون", "phone": "07700000001"}), json.dumps([{"id": P1}])))
    assert len(admin.q("select id from public.orders")) == 1
    admin.q("update public.products set sort = sort")


def test_no_function_is_open_to_anon_by_accident(db):
    """Every function anon may call is on this list; anything new must be added on purpose."""
    rows = harness.admin_sql(db, """
        select n.nspname || '.' || p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'private') and has_function_privilege('anon', p.oid, 'EXECUTE') order by 1""")
    # am_i_admin: open to PUBLIC on the live project already; answers false for visitors
    allowed = {"public.place_order", "public.log_client_error", "private.is_admin", "public.am_i_admin", "public.touch_updated_at",
               # 0006: read-only storefront catalogue (row level security still applies) and pure text helpers
               "public.catalog_home", "public.list_products", "public.search_products", "public.product_page", "public.products_by_ids",
               "private.ar_norm", "private.product_doc", "private.order_doc", "private.like_any",
               # 0010: pure text helper for searching translations
               "private.i18n_doc"}
    assert {r[0] for r in rows} <= allowed, {r[0] for r in rows} - allowed


def test_media_bucket_refuses_svg(db):
    types = harness.admin_sql(db, "select allowed_mime_types from storage.buckets where id = 'media'")[0][0]
    assert "image/svg+xml" not in types and "image/*" not in types and "image/webp" in types and "video/mp4" in types


# ------------------------------------------------------------------ 0004: client error log
def test_client_errors_are_logged_and_limited(db):
    harness.real_limits(db)
    with harness.session(db, headers={"x-forwarded-for": "203.0.113.70"}) as s:
        for i in range(25):
            s.q("select public.log_client_error('/#/shop', %s, 'site.js:10')", (f"TypeError {i}",))
    assert harness.admin_sql(db, "select count(*) from private.client_errors") == [(20,)]   # 21st+ dropped silently


def test_client_error_summary_is_admin_only(anon, visitor, admin, admin_password_only, db):
    anon.q("select public.log_client_error('/', 'ReferenceError: x is not defined', '')")
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        anon.one("select public.client_error_summary()")
    assert visitor.one("select public.client_error_summary()") is None
    assert admin_password_only.one("select public.client_error_summary()") is None
    s = admin.one("select public.client_error_summary()")
    assert s["last_24h"] == 1 and s["top"][0]["message"] == "ReferenceError: x is not defined"


def test_client_error_log_is_not_readable(anon, visitor):
    for s in (anon, visitor):
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            s.q("select * from private.client_errors")


# ------------------------------------------------------------------ 0005: two-step verification
def test_password_alone_is_not_enough(admin_password_only, db):
    s = admin_password_only
    assert s.one("select public.am_i_admin()") is False
    assert s.q("update public.products set price = 1 returning id") == []
    assert s.q("select * from public.orders") == []
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        s.q("insert into storage.objects (bucket_id, name) values ('media', 'x.webp')")
    assert harness.admin_sql(db, "select count(*) from public.products where price = 1") == [(0,)]


def test_password_plus_code_has_full_control(admin):
    assert admin.one("select public.am_i_admin()") is True
    assert len(admin.q("update public.products set sort = sort returning id")) == 5
    admin.q("insert into storage.objects (bucket_id, name) values ('media', 'products/x.webp')")


def test_admin_gate_tells_the_dashboard_what_to_show(admin_password_only, admin, visitor):
    assert admin_password_only.one("select public.admin_gate()") == {"admin": True, "mfa_required": True, "aal": "aal1"}
    assert admin.one("select public.admin_gate()") == {"admin": True, "mfa_required": True, "aal": "aal2"}
    assert visitor.one("select public.admin_gate()")["admin"] is False


def test_visitor_with_mfa_is_still_not_admin(db):
    with harness.session(db, "authenticated", harness.USER_ID, claims={"aal": "aal2"}) as s:
        assert s.one("select public.am_i_admin()") is False


def test_owner_can_switch_the_requirement_off(admin_password_only, db):
    harness.admin_sql(db, "update private.admin_policy set require_mfa = false")
    assert admin_password_only.one("select public.am_i_admin()") is True


def test_admin_policy_not_reachable_from_api(anon, admin):
    for s in (anon, admin):
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            s.q("update private.admin_policy set require_mfa = false")
