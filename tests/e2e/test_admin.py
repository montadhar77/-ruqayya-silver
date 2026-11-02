"""Dashboard end-to-end tests against the local stack (real PostgREST + RLS)."""
import json
import time

import harness
import stack


def login(t, stk, who=stack.ADMIN, path="", mfa=True):
    """Password, then (for the admin) the authenticator code — enrolling on first use."""
    t.page.goto(f"{stk['site']}/admin/index.html{path}")
    t.page.wait_for_selector("#lEmail")
    t.page.fill("#lEmail", who["email"])
    t.page.fill("#lPass", who["password"])
    t.page.click("#loginForm button[type=submit]")
    if not mfa or who is not stack.ADMIN:
        return
    t.page.wait_for_selector("#side, #mfaCode", timeout=10000)
    if t.page.query_selector("#mfaCode"):
        enter_code(t)


def enter_code(t, code=None):
    if code is None:
        if t.page.query_selector("#mfaSecret"):
            secret = t.page.inner_text("#mfaSecret").strip()
        else:
            secret = next(f["secret"] for f in stack.AUTH.factors.values() if f["user"] == stack.ADMIN["id"] and f["status"] == "verified")
        code = stack.totp(secret)
    t.page.fill("#mfaCode", code)
    t.page.click("#mfaForm button[type=submit]")


def logged_in(t):
    t.page.wait_for_selector("#side", timeout=10000)


def wait_db(stk, sql, expect, tries=60):
    got = None
    for _ in range(tries):
        got = harness.admin_sql(stk["db"], sql)
        if got == expect:
            return got
        time.sleep(0.1)
    return got


def test_wrong_password_is_refused(tab, stk):
    t = tab()
    login(t, stk, {"email": stack.ADMIN["email"], "password": "wrong-password"})
    time.sleep(1)
    assert t.page.is_visible("#loginForm")


def test_non_admin_account_is_refused(tab, stk):
    t = tab()
    login(t, stk, stack.VISITOR)
    t.page.wait_for_selector("text=هذا الحساب لا يملك صلاحية إدارة الموقع.", timeout=10000)
    assert not t.page.is_visible("#side")


def test_admin_edits_a_product_price(tab, stk):
    t = tab()
    login(t, stk)
    logged_in(t)
    t.page.goto(f"{stk['site']}/admin/index.html#/products")
    t.page.wait_for_selector("[data-pid] [data-act=edit]")
    pid = t.page.get_attribute("[data-pid]", "data-pid")
    old = harness.admin_sql(stk["db"], "select price from public.products where id = %s", (pid,))[0][0]
    try:
        t.page.click(f"[data-pid='{pid}'] [data-act=edit]")
        t.page.wait_for_selector("#fPrice")
        t.page.fill("#fPrice", "٢٥٠٬٠٠٠")
        t.page.click("#pSave")
        assert wait_db(stk, f"select price from public.products where id = '{pid}'", [(250000,)]) == [(250000,)]
        assert not t.errors, t.errors
    finally:   # other tests rely on the catalogue prices
        harness.admin_sql(stk["db"], "update public.products set price = %s where id = %s", (old, pid))


def test_admin_confirms_an_order(tab, stk):
    with harness.session(stk["db"]) as s:
        r = s.one("select public.place_order(%s::jsonb, %s::jsonb)",
                  (json.dumps({"name": "زبون لوحة التحكم", "phone": "07700000003", "city": "كربلاء"}),
                   json.dumps([{"id": "6c96ae41-cd0b-40d5-bb79-79e309025b72", "qty": 1}])))
    t = tab()
    login(t, stk)
    logged_in(t)
    t.page.goto(f"{stk['site']}/admin/index.html#/orders")
    t.page.wait_for_selector("[data-oid]")
    t.page.locator("[data-oid]", has_text="زبون لوحة التحكم").first.click()
    t.page.wait_for_selector('[data-set="confirmed"]')
    t.page.click('[data-set="confirmed"]')
    sql = f"select status from public.orders where order_no = {r['order_no']}"
    assert wait_db(stk, sql, [("confirmed",)]) == [("confirmed",)]
    assert not t.errors, t.errors


def test_admin_saves_home_text(tab, stk):
    t = tab()
    login(t, stk)
    logged_in(t)
    t.page.goto(f"{stk['site']}/admin/index.html#/home")
    t.page.wait_for_selector('[data-p="hero.title1"]')
    t.page.fill('[data-p="hero.title1"]', "فضّةٌ أصيلة")
    t.page.click("#saveBtn")
    sql = "select data->'hero'->>'title1' from public.settings where id = 1"
    assert wait_db(stk, sql, [("فضّةٌ أصيلة",)]) == [("فضّةٌ أصيلة",)]
    # the storefront shows the new text
    s = tab()
    s.page.goto(f"{stk['site']}/index.html")
    s.page.wait_for_selector("text=فضّةٌ أصيلة", timeout=10000)


def test_dashboard_pages_open_on_mobile(tab, stk):
    t = tab(width=390, height=844)
    login(t, stk)
    logged_in(t)
    for p in ["dashboard", "orders", "products", "categories", "inquiries", "home", "texts", "identity", "contact", "account"]:
        t.page.goto(f"{stk['site']}/admin/index.html#/{p}")
        time.sleep(0.6)
        w = t.page.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
        assert w[0] <= w[1] + 1, f"{p} scrolls sideways {w}"
    assert not t.errors, t.errors
