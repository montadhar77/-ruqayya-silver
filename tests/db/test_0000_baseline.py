"""The baseline migration must reproduce the live database's behaviour exactly
(as observed on 2026-11-02), because every later migration is tested on top of it."""
import json

import psycopg
import pytest

import harness

P1 = "20000000-0000-4000-8000-000000000001"   # unlimited stock, 240000
P2 = "20000000-0000-4000-8000-000000000002"   # 5 in stock, 320000
P3 = "20000000-0000-4000-8000-000000000003"   # 1 in stock
P4 = "20000000-0000-4000-8000-000000000004"   # inactive
P5 = "20000000-0000-4000-8000-000000000005"   # 0 in stock

CUSTOMER = {"name": "زبون تجريبي", "phone": "07700000001", "city": "كربلاء", "address": "شارع تجريبي"}


@pytest.fixture(scope="module")
def base():
    name = harness.build(upto="0000")
    yield name
    harness.drop_db(name)


def order(s, items, customer=None):
    return s.one("select public.place_order(%s::jsonb, %s::jsonb)",
                 (json.dumps(customer or CUSTOMER), json.dumps(items)))


def test_all_tables_have_rls(base):
    rows = harness.admin_sql(base, """select c.relname, c.relrowsecurity from pg_class c
        join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'""")
    assert len(rows) == 13
    assert all(r[1] for r in rows), rows


def test_anon_reads_only_active_catalog(base):
    with harness.session(base) as s:
        names = {r[0] for r in s.q("select slug from public.categories")}
        assert "hidden-cat" not in names and "mens-rings" in names
        ids = {str(r[0]) for r in s.q("select id from public.products")}
        assert P4 not in ids and P1 in ids
        assert s.one("select data->'shop'->>'delivery_fee' from public.settings") == "5000"


def test_anon_cannot_read_or_write_private_tables(base):
    with harness.session(base) as s:
        for sql in ["select * from public.orders", "select * from public.inquiries",
                    "update public.products set price = 1",
                    "insert into public.orders (customer_name, phone) values ('x', '0')"]:
            with pytest.raises(psycopg.errors.InsufficientPrivilege):
                s.q(sql)


def test_anon_can_send_inquiry_but_not_mark_read(base):
    with harness.session(base) as s:
        s.q("insert into public.inquiries (name, phone, body) values ('زائر', '0770', 'سؤال عن خاتم')")
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            s.q("insert into public.inquiries (name, body, is_read) values ('زائر', 'سؤال', true)")


def test_visitor_account_has_no_admin_power(base):
    with harness.session(base, "authenticated", harness.USER_ID) as s:
        assert s.one("select public.am_i_admin()") is False
        assert s.q("update public.products set price = 1 returning id") == []
        assert s.q("select * from public.orders") == []


def test_admin_has_full_control(base):
    with harness.session(base, "authenticated", harness.ADMIN_ID) as s:
        assert s.one("select public.am_i_admin()") is True
        assert len(s.q("update public.products set sort = sort returning id")) == 5
        assert len(s.q("select id from public.categories")) == 3


def test_place_order_recomputes_prices_on_server(base):
    with harness.session(base) as s:
        r = order(s, [{"id": P1, "qty": 2, "price": 1}, {"id": P2, "qty": 1}])
        assert r["subtotal"] == 240000 * 2 + 320000
        assert r["delivery"] == 5000 and r["total"] == r["subtotal"] + 5000
        assert r["international"] is False and r["shipping_tbd"] is False
        assert r["order_no"] >= 1001
        assert [i["price"] for i in r["items"]] == [240000, 320000]


def test_place_order_international_shipping_tbd(base):
    with harness.session(base) as s:
        r = order(s, [{"id": P1, "qty": 1}], {**CUSTOMER, "country": "الكويت"})
        assert r["international"] is True and r["shipping_tbd"] is True and r["delivery"] == 0


def test_place_order_free_delivery_threshold(base):
    harness.admin_sql(base, "update public.settings set data = jsonb_set(data, '{shop,free_delivery_over}', '400000')")
    try:
        with harness.session(base) as s:
            assert order(s, [{"id": P1, "qty": 2}])["delivery"] == 0
            assert order(s, [{"id": P1, "qty": 1}])["delivery"] == 5000
    finally:
        harness.admin_sql(base, "update public.settings set data = jsonb_set(data, '{shop,free_delivery_over}', '0')")


def test_place_order_qty_is_clamped(base):
    with harness.session(base) as s:
        r = order(s, [{"id": P1, "qty": 500}])
        assert r["items"][0]["qty"] == 50
        r = order(s, [{"id": P1, "qty": -3}])
        assert r["items"][0]["qty"] == 1


@pytest.mark.parametrize("customer,items,error", [
    ({**CUSTOMER, "name": "x"}, [{"id": P1}], "invalid_name"),
    ({**CUSTOMER, "phone": "123"}, [{"id": P1}], "invalid_phone"),
    (CUSTOMER, [], "invalid_items"),
    (CUSTOMER, [{"id": P1}] * 41, "invalid_items"),
    (CUSTOMER, [{"id": P4}], "product_unavailable"),
    (CUSTOMER, [{"id": P5}], "out_of_stock"),
    (CUSTOMER, [{"id": P2, "qty": 6}], "out_of_stock"),
])
def test_place_order_rejects_bad_input(base, customer, items, error):
    with harness.session(base) as s:
        with pytest.raises(psycopg.errors.RaiseException, match=error):
            order(s, items, customer)


def test_baseline_does_not_reserve_stock(base):
    """Documents the bug fixed in 0001: the live function checks stock but never deducts it."""
    with harness.session(base) as s:
        order(s, [{"id": P3, "qty": 1}])
        order(s, [{"id": P3, "qty": 1}])   # second order for the last piece is accepted
    assert harness.admin_sql(base, f"select stock from public.products where id = '{P3}'")[0][0] == 1
