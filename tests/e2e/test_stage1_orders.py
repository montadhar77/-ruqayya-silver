"""Stage 1 in the browser: no duplicate orders on flaky networks, no overselling,
old-database compatibility, and stock given back when the admin cancels."""
import json
import time

import pytest

import harness
from test_admin import login, logged_in, wait_db
from test_site import checkout, open_product_and_add

P_TURQ = "6c96ae41-cd0b-40d5-bb79-79e309025b72"     # unlimited


def najaf_id(stk):
    return str(harness.admin_sql(stk["db"], "select id from public.products where name = 'خاتم دُرّ النجف'")[0][0])


def fill_iraq(page, name):
    page.fill("#coName", name)
    page.fill("#coPhone", "07700000011")
    page.fill("#coAddr", "حي الاختبار")


def orders_named(stk, name):
    return harness.admin_sql(stk["db"], "select order_no, total from public.orders where customer_name = %s", (name,))


@pytest.mark.parametrize("gateway,url,keyfield", [("rpc", "**/rest/v1/rpc/place_order", "p_idempotency_key"),
                                                   ("edge", "**/functions/v1/submit-order", "key")])
def test_lost_response_is_retried_without_duplicate(tab, stk, gateway, url, keyfield):
    """The order reaches the server but the reply never arrives: the page retries with
    the same checkout key and the customer still gets exactly one order (both paths)."""
    t = tab(width=390, height=844, gateway=gateway)
    calls = []
    name = f"زبون الشبكة الضعيفة {gateway}"

    def flaky(route, req):
        if req.method != "POST":
            return route.continue_()
        calls.append(json.loads(req.post_data or "{}"))
        if len(calls) == 1:
            route.fetch()          # server receives and saves the order...
            return route.abort()   # ...but the connection drops before the answer
        return route.continue_()
    t.page.route(url, flaky)
    open_product_and_add(t.page, stk["site"], P_TURQ)
    checkout(t.page)
    fill_iraq(t.page, name)
    t.page.click("#coForm button[type=submit]")
    t.page.wait_for_selector(".success .no", timeout=15000)
    rows = orders_named(stk, name)
    assert len(rows) == 1, rows
    assert int(t.page.inner_text(".success .no").strip("#")) == rows[0][0]
    assert len(calls) == 2 and calls[0][keyfield] == calls[1][keyfield]


def test_works_against_database_without_migration(tab, stk):
    """If the new site goes live before the database migration, PostgREST answers
    PGRST202 for the 3-argument call; the page falls back to the old call."""
    t = tab(gateway="rpc")
    seen = []

    def old_db(route, req):
        body = json.loads(req.post_data or "{}")
        seen.append(sorted(body))
        if "p_idempotency_key" in body:
            return route.fulfill(status=404, json={"code": "PGRST202", "message": "Could not find the function public.place_order(p_customer, p_idempotency_key, p_items) in the schema cache"})
        return route.continue_()
    t.page.route("**/rest/v1/rpc/place_order", old_db)
    open_product_and_add(t.page, stk["site"], P_TURQ)
    checkout(t.page)
    fill_iraq(t.page, "زبون قاعدة قديمة")
    t.page.click("#coForm button[type=submit]")
    t.page.wait_for_selector(".success .no", timeout=15000)
    assert seen == [["p_customer", "p_idempotency_key", "p_items"], ["p_customer", "p_items"]]
    assert len(orders_named(stk, "زبون قاعدة قديمة")) == 1


def test_piece_sold_while_customer_checks_out(tab, stk):
    pid = najaf_id(stk)
    harness.admin_sql(stk["db"], "update public.products set stock = 2 where id = %s", (pid,))
    t = tab()
    t.page.goto(f"{stk['site']}/index.html#/p/{pid}")
    t.page.wait_for_selector("#qPlus")
    t.page.click("#qPlus")
    t.page.click("#addBtn")
    checkout(t.page)
    fill_iraq(t.page, "زبون متأخر")
    with harness.session(stk["db"]) as s:   # another customer takes one piece first
        s.one("select public.place_order(%s::jsonb, %s::jsonb)",
              (json.dumps({"name": "زبون أسرع", "phone": "07700000012"}), json.dumps([{"id": pid, "qty": 1}])))
    t.page.click("#coForm button[type=submit]")
    t.page.wait_for_selector("#toast:has-text('نفدت')", timeout=10000)
    assert orders_named(stk, "زبون متأخر") == []
    assert harness.admin_sql(stk["db"], "select stock from public.products where id = %s", (pid,)) == [(1,)]


def test_admin_cancel_gives_pieces_back(tab, stk):
    pid = najaf_id(stk)
    harness.admin_sql(stk["db"], "update public.products set stock = 3 where id = %s", (pid,))
    with harness.session(stk["db"]) as s:
        r = s.one("select public.place_order(%s::jsonb, %s::jsonb)",
                  (json.dumps({"name": "طلب سيُلغى", "phone": "07700000013"}), json.dumps([{"id": pid, "qty": 2}])))
    assert harness.admin_sql(stk["db"], "select stock from public.products where id = %s", (pid,)) == [(1,)]
    t = tab()
    login(t, stk)
    logged_in(t)
    t.page.goto(f"{stk['site']}/admin/index.html#/orders")
    t.page.locator("[data-oid]", has_text="طلب سيُلغى").first.click()
    t.page.wait_for_selector('[data-set="cancelled"]')
    t.page.click('[data-set="cancelled"]')
    t.page.wait_for_selector("text=أُعيدت القطع إلى المخزون", timeout=10000)
    assert wait_db(stk, f"select stock from public.products where id = '{pid}'", [(3,)]) == [(3,)]
    # bring it back: pieces are taken again
    t.page.click('[data-set="confirmed"]')
    t.page.wait_for_selector("text=حُجزت القطع من المخزون مجدداً", timeout=10000)
    assert wait_db(stk, f"select stock from public.products where id = '{pid}'", [(1,)]) == [(1,)]
    assert not t.errors, t.errors
    time.sleep(0.2)
