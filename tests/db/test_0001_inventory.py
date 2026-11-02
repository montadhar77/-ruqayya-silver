"""Stock is taken atomically, given back safely, and a checkout can never be
created twice. Concurrency tests use real parallel database sessions."""
import json
import threading
import uuid

import psycopg
import pytest

import harness

P1 = "20000000-0000-4000-8000-000000000001"   # unlimited stock, 240000
P2 = "20000000-0000-4000-8000-000000000002"   # 5 in stock, 320000
P3 = "20000000-0000-4000-8000-000000000003"   # 1 in stock, 120000
P5 = "20000000-0000-4000-8000-000000000005"   # 0 in stock
CUSTOMER = {"name": "زبون تجريبي", "phone": "07700000001", "city": "كربلاء"}


def order(s, items, key=None, customer=None):
    return s.one("select public.place_order(%s::jsonb, %s::jsonb, %s::uuid)",
                 (json.dumps(customer or CUSTOMER), json.dumps(items), key))


def stock(db, pid):
    return harness.admin_sql(db, "select stock from public.products where id = %s", (pid,))[0][0]


def moves(db, pid):
    return harness.admin_sql(db, "select coalesce(sum(delta), 0) from public.stock_movements where product_id = %s", (pid,))[0][0]


def parallel(n, fn):
    """Run fn(i) in n threads released at the same instant; return results/exceptions."""
    gate, out = threading.Barrier(n), [None] * n

    def run(i):
        gate.wait()
        try:
            out[i] = fn(i)
        except Exception as e:  # noqa: BLE001
            out[i] = e
    ts = [threading.Thread(target=run, args=(i,)) for i in range(n)]
    for t in ts:
        t.start()
    for t in ts:
        t.join()
    return out


# ------------------------------------------------------------------ same prices as before
def test_prices_and_fees_unchanged(anon):
    r = order(anon, [{"id": P1, "qty": 2, "price": 1}, {"id": P2, "qty": 1}])
    assert (r["subtotal"], r["delivery"], r["total"]) == (800000, 5000, 805000)
    assert [i["id"] for i in r["items"]] == [P1, P2] and r["duplicate"] is False
    intl = order(anon, [{"id": P1}], customer={**CUSTOMER, "country": "الكويت"})
    assert intl["international"] and intl["shipping_tbd"] and intl["delivery"] == 0


def test_old_two_argument_call_still_works(anon):
    """The live site calls place_order with two named arguments; PostgREST does the same."""
    r = anon.one("select public.place_order(p_customer => %s::jsonb, p_items => %s::jsonb)",
                 (json.dumps(CUSTOMER), json.dumps([{"id": P1}])))
    assert r["total"] == 245000


def test_items_keep_customer_order_and_merge(anon, db):
    r = order(anon, [{"id": P3, "qty": 1}, {"id": P1, "qty": 1}, {"id": P2, "qty": 1}, {"id": P2, "qty": 2}])
    assert [(i["id"], i["qty"]) for i in r["items"]] == [(P3, 1), (P1, 1), (P2, 3)]
    assert stock(db, P2) == 2


def test_bad_product_id_is_a_clean_error(anon):
    with pytest.raises(psycopg.errors.RaiseException, match="product_unavailable"):
        order(anon, [{"id": "not-a-uuid"}])


# ------------------------------------------------------------------ stock is taken
def test_order_takes_stock_and_logs_it(anon, db):
    order(anon, [{"id": P2, "qty": 2}, {"id": P1, "qty": 3}])
    assert stock(db, P2) == 3 and stock(db, P1) is None
    assert moves(db, P2) == -2 and moves(db, P1) == 0
    row = harness.admin_sql(db, "select stock_state from public.orders")
    assert row == [("reserved",)]


def test_failed_order_takes_nothing(anon, db):
    """If one line is out of stock, the whole order fails and no other stock moves."""
    with pytest.raises(psycopg.errors.RaiseException, match="out_of_stock"):
        order(anon, [{"id": P2, "qty": 2}, {"id": P5, "qty": 1}])
    assert stock(db, P2) == 5 and harness.admin_sql(db, "select count(*) from public.orders")[0][0] == 0


def test_twenty_customers_race_for_five_pieces(db):
    sessions = [harness.Session(db) for _ in range(20)]
    try:
        res = parallel(20, lambda i: order(sessions[i], [{"id": P2, "qty": 1}],
                                           customer={**CUSTOMER, "name": f"زبون {i}"}))
    finally:
        for s in sessions:
            s.close()
    ok = [r for r in res if isinstance(r, dict)]
    failed = [r for r in res if isinstance(r, Exception)]
    assert len(ok) == 5, res
    assert all("out_of_stock" in str(e) for e in failed), failed
    assert stock(db, P2) == 0 and moves(db, P2) == -5
    assert harness.admin_sql(db, "select count(*) from public.orders")[0][0] == 5


def test_last_piece_sold_once(db):
    sessions = [harness.Session(db) for _ in range(10)]
    try:
        res = parallel(10, lambda i: order(sessions[i], [{"id": P3, "qty": 1}]))
    finally:
        for s in sessions:
            s.close()
    assert sum(isinstance(r, dict) for r in res) == 1 and stock(db, P3) == 0


def test_crossed_carts_do_not_deadlock(db):
    """Half the customers order [P2, P3-free product], half the reverse order."""
    harness.admin_sql(db, "update public.products set stock = 100 where id in (%s, %s)", (P2, P3))
    sessions = [harness.Session(db) for _ in range(16)]
    try:
        res = parallel(16, lambda i: order(sessions[i], [{"id": P2}, {"id": P3}] if i % 2 else [{"id": P3}, {"id": P2}]))
    finally:
        for s in sessions:
            s.close()
    assert all(isinstance(r, dict) for r in res), [r for r in res if not isinstance(r, dict)]
    assert stock(db, P2) == 84 and stock(db, P3) == 84


# ------------------------------------------------------------------ duplicate orders
def test_same_checkout_twice_creates_one_order(anon, db):
    key = str(uuid.uuid4())
    a = order(anon, [{"id": P2, "qty": 2}], key)
    b = order(anon, [{"id": P2, "qty": 2}], key)
    assert a["order_no"] == b["order_no"] and b["duplicate"] is True and b["total"] == a["total"]
    assert stock(db, P2) == 3
    assert harness.admin_sql(db, "select count(*) from public.orders")[0][0] == 1


def test_same_checkout_from_ten_tabs_at_once(db):
    key = str(uuid.uuid4())
    sessions = [harness.Session(db) for _ in range(10)]
    try:
        res = parallel(10, lambda i: order(sessions[i], [{"id": P2, "qty": 1}], key))
    finally:
        for s in sessions:
            s.close()
    assert all(isinstance(r, dict) for r in res), res
    assert len({r["order_no"] for r in res}) == 1
    assert sum(not r["duplicate"] for r in res) == 1
    assert stock(db, P2) == 4


def test_different_checkouts_are_separate_orders(anon):
    a = order(anon, [{"id": P1}], str(uuid.uuid4()))
    b = order(anon, [{"id": P1}], str(uuid.uuid4()))
    assert a["order_no"] != b["order_no"]


# ------------------------------------------------------------------ give back / take again
def order_id(db, no):
    return harness.admin_sql(db, "select id from public.orders where order_no = %s", (no,))[0][0]


def test_cancel_returns_stock_once(anon, admin, db):
    r = order(anon, [{"id": P2, "qty": 3}])
    oid = order_id(db, r["order_no"])
    admin.q("update public.orders set status = 'cancelled' where id = %s", (oid,))
    assert stock(db, P2) == 5
    admin.q("update public.orders set admin_note = 'x', status = 'cancelled' where id = %s", (oid,))   # again: no double refund
    assert stock(db, P2) == 5
    st = harness.admin_sql(db, "select stock_state, cancelled_at is not null from public.orders where id = %s", (oid,))
    assert st == [("released", True)]


def test_uncancel_takes_stock_again(anon, admin, db):
    r = order(anon, [{"id": P2, "qty": 3}])
    oid = order_id(db, r["order_no"])
    admin.q("update public.orders set status = 'cancelled' where id = %s", (oid,))
    admin.q("update public.orders set status = 'confirmed' where id = %s", (oid,))
    assert stock(db, P2) == 2 and moves(db, P2) == -3


def test_uncancel_refused_when_pieces_were_sold(anon, admin, db):
    r = order(anon, [{"id": P3, "qty": 1}])
    oid = order_id(db, r["order_no"])
    admin.q("update public.orders set status = 'cancelled' where id = %s", (oid,))
    order(anon, [{"id": P3, "qty": 1}])          # someone else buys the returned piece
    with pytest.raises(psycopg.errors.RaiseException, match="out_of_stock_on_restore"):
        admin.q("update public.orders set status = 'new' where id = %s", (oid,))
    assert harness.admin_sql(db, "select status from public.orders where id = %s", (oid,)) == [("cancelled",)]
    assert stock(db, P3) == 0


def test_delete_returns_stock_but_not_twice(anon, admin, db):
    a = order(anon, [{"id": P2, "qty": 2}])
    b = order(anon, [{"id": P2, "qty": 1}])
    admin.q("update public.orders set status = 'cancelled' where order_no = %s", (b["order_no"],))
    admin.q("delete from public.orders where order_no in (%s, %s)", (a["order_no"], b["order_no"]))
    assert stock(db, P2) == 5


def test_status_flow_without_cancel_keeps_stock(anon, admin, db):
    r = order(anon, [{"id": P2, "qty": 1}])
    for st in ("confirmed", "shipped", "delivered"):
        admin.q("update public.orders set status = %s where order_no = %s", (st, r["order_no"]))
    assert stock(db, P2) == 4


def test_product_made_unlimited_after_order(anon, admin, db):
    r = order(anon, [{"id": P2, "qty": 2}])
    harness.admin_sql(db, "update public.products set stock = null where id = %s", (P2,))
    admin.q("update public.orders set status = 'cancelled' where order_no = %s", (r["order_no"],))
    assert stock(db, P2) is None


def test_old_orders_without_reservation_are_untouched(admin, db):
    harness.admin_sql(db, """insert into public.orders (customer_name, phone, items, subtotal, total)
        values ('طلب قديم', '07700000009', '[{"id": "20000000-0000-4000-8000-000000000002", "qty": 2}]', 640000, 640000)""")
    admin.q("update public.orders set status = 'cancelled' where customer_name = 'طلب قديم'")
    assert stock(db, P2) == 5


# ------------------------------------------------------------------ who can see / do what
def test_stock_movements_are_admin_only(anon, visitor, admin, db):
    order(anon, [{"id": P2}])
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        anon.q("select * from public.stock_movements")
    assert visitor.q("select * from public.stock_movements") == []
    assert len(admin.q("select * from public.stock_movements")) == 1
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        admin.q("insert into public.stock_movements (product_id, delta, reason) values (%s, 5, 'order')", (P2,))


def test_visitor_cannot_cancel_to_steal_stock(anon, visitor, db):
    r = order(anon, [{"id": P2, "qty": 2}])
    assert visitor.q("update public.orders set status = 'cancelled' where order_no = %s returning id", (r["order_no"],)) == []
    assert stock(db, P2) == 3


def test_trigger_function_not_callable_by_api_roles(anon, visitor):
    for s in (anon, visitor):
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            s.q("select private.order_stock_sync()")
