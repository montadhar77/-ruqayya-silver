"""Stages 2-3 in the browser: orders and messages go through the protected Edge
Functions (Turnstile + honeypot + database limits) and the owner gets a Telegram
alert — immediately, or from the retry job when Telegram was down."""
import http.client
import json
import time

import harness
import stack
from test_admin import login, logged_in
from test_site import checkout, open_product_and_add

P_TURQ = "6c96ae41-cd0b-40d5-bb79-79e309025b72"


def fill(page, name, phone="07700000021"):
    page.fill("#coName", name)
    page.fill("#coPhone", phone)
    page.fill("#coAddr", "حي الاختبار")


def order_rows(stk, name):
    return harness.admin_sql(stk["db"], "select order_no, notified_at is not null, notify_error from public.orders where customer_name = %s", (name,))


def wait_for(cond, secs=10):
    end = time.time() + secs
    while time.time() < end:
        v = cond()
        if v:
            return v
        time.sleep(0.15)
    return cond()


def telegram_with(text):
    return [m for m in stack.TELEGRAM if text in m["text"]]


def test_order_goes_through_protected_function_and_alerts(tab, stk):
    t = tab(width=390, height=844)
    seen = []
    t.page.on("request", lambda r: seen.append((r.method, r.url)) if "/functions/v1/" in r.url or "/rpc/" in r.url else None)
    open_product_and_add(t.page, stk["site"], P_TURQ)
    checkout(t.page)
    assert t.page.get_attribute("#coHuman", "data-ts") == "1x00000000000000000000AA"   # Turnstile mounted (invisible)
    fill(t.page, "زبون محمي")
    t.page.click("#coForm button[type=submit]")
    t.page.wait_for_selector(".success .no", timeout=15000)
    no = int(t.page.inner_text(".success .no").strip("#"))
    assert ("POST", f"{stk['gateway']}/functions/v1/submit-order") in seen
    assert not any("/rpc/place_order" in u for _, u in seen)
    assert stack.FAKE["turnstile_tokens"][-1].startswith("XXXX.DUMMY.TOKEN.")
    msgs = wait_for(lambda: telegram_with(f"#{no}"))
    assert msgs and "زبون محمي" in msgs[0]["text"] and "الإجمالي: 245,000 د.ع" in msgs[0]["text"]
    assert wait_for(lambda: order_rows(stk, "زبون محمي")[0][1]), "order not marked as notified"
    assert not t.errors, t.errors


def test_honeypot_filled_by_a_bot_creates_nothing(tab, stk):
    t = tab()
    open_product_and_add(t.page, stk["site"], P_TURQ)
    checkout(t.page)
    fill(t.page, "روبوت سبام")
    t.page.evaluate("document.querySelector('#coForm [name=website]').value = 'http://spam.example'")
    t.page.click("#coForm button[type=submit]")
    t.page.wait_for_selector("#toast:has-text('تعذّر إرسال الطلب')", timeout=10000)
    assert order_rows(stk, "روبوت سبام") == []


def test_failed_human_check_is_refused(tab, stk):
    t = tab()
    t.ctx.unroute("https://challenges.cloudflare.com/**")
    t.ctx.route("https://challenges.cloudflare.com/**", lambda r: r.fulfill(content_type="text/javascript", body="""
      window.turnstile = { render(el, o) { setTimeout(() => o.callback('fail-token-from-bot'), 30); return 'w'; }, reset() {} };
      (function () { var m = /onload=([\\w$]+)/.exec(document.currentScript.src); if (m) window[m[1]](); })();"""))
    open_product_and_add(t.page, stk["site"], P_TURQ)
    checkout(t.page)
    fill(t.page, "زبون بلا تحقق")
    t.page.click("#coForm button[type=submit]")
    t.page.wait_for_selector("#toast:has-text('تعذّر التحقق')", timeout=10000)
    assert order_rows(stk, "زبون بلا تحقق") == []


def test_rate_limit_shows_friendly_message(tab, stk):
    harness.admin_sql(stk["db"], "update private.rate_rules set max_count = 1 where kind = 'order' and scope = 'phone' and window_seconds = 600")
    try:
        t = tab()
        for i, expect_ok in ((0, True), (1, False)):
            open_product_and_add(t.page, stk["site"], P_TURQ)
            checkout(t.page)
            fill(t.page, f"زبون مستعجل {i}", phone="07709998877")
            t.page.click("#coForm button[type=submit]")
            if expect_ok:
                t.page.wait_for_selector(".success .no", timeout=15000)
                t.page.click("#coDone")
                time.sleep(0.8)
            else:
                t.page.wait_for_selector("#toast:has-text('طلبات كثيرة')", timeout=10000)
        assert len(order_rows(stk, "زبون مستعجل 0")) == 1 and order_rows(stk, "زبون مستعجل 1") == []
    finally:
        harness.admin_sql(stk["db"], "update private.rate_rules set max_count = 1000000")


def test_contact_form_through_function_alerts(tab, stk):
    t = tab()
    t.page.goto(f"{stk['site']}/index.html")
    t.page.wait_for_selector("#contactForm", state="attached")
    t.page.locator("#contactForm").scroll_into_view_if_needed()
    t.page.fill("#contactForm [name=name]", "زائر محمي")
    t.page.fill("#contactForm [name=body]", "هل يتوفر خاتم فيروز مقاس ١٨؟")
    t.page.click("#contactForm button[type=submit]")
    t.page.wait_for_selector("#toast:has-text('وصلتنا رسالتك')", timeout=10000)
    assert harness.admin_sql(stk["db"], "select count(*) from public.inquiries where name = 'زائر محمي'") == [(1,)]
    assert wait_for(lambda: telegram_with("زائر محمي"))


def test_alert_missed_while_telegram_down_is_sent_by_retry_job(tab, stk):
    stack.FAKE["telegram_down"] = True
    try:
        t = tab()
        open_product_and_add(t.page, stk["site"], P_TURQ)
        checkout(t.page)
        fill(t.page, "زبون أثناء انقطاع تيليجرام")
        t.page.click("#coForm button[type=submit]")
        t.page.wait_for_selector(".success .no", timeout=15000)           # the customer is not affected
        no = int(t.page.inner_text(".success .no").strip("#"))
        assert wait_for(lambda: order_rows(stk, "زبون أثناء انقطاع تيليجرام")[0][2].startswith("telegram_502"))
    finally:
        stack.FAKE["telegram_down"] = False
    assert not telegram_with(f"#{no}")
    # a minute later the scheduled job runs (simulated: age the order, call the function like pg_cron does)
    harness.admin_sql(stk["db"], "update public.orders set created_at = created_at - interval '2 minutes', "
                                 "notify_claimed_at = notify_claimed_at - interval '2 minutes' where order_no = %s", (no,))
    c = http.client.HTTPConnection("127.0.0.1", stack.GW_PORT, timeout=20)
    c.request("POST", "/functions/v1/notify-retry", body="{}", headers={"x-cron-secret": stack.CRON_SECRET, "Content-Type": "application/json"})
    r = c.getresponse()
    assert r.status == 200 and json.loads(r.read())["sent"] >= 1
    assert telegram_with(f"#{no}")
    assert order_rows(stk, "زبون أثناء انقطاع تيليجرام")[0][1] is True


def test_retry_job_refuses_without_secret(stk):
    c = http.client.HTTPConnection("127.0.0.1", stack.GW_PORT, timeout=10)
    c.request("POST", "/functions/v1/notify-retry", body="{}")
    assert c.getresponse().status == 401


def test_falls_back_when_function_not_deployed(tab, stk):
    t = tab()
    t.page.route("**/functions/v1/submit-order", lambda r: r.fulfill(status=404, json={"code": "NOT_FOUND", "message": "Requested function was not found"}))
    open_product_and_add(t.page, stk["site"], P_TURQ)
    checkout(t.page)
    fill(t.page, "زبون قبل نشر الدوال")
    t.page.click("#coForm button[type=submit]")
    t.page.wait_for_selector(".success .no", timeout=15000)
    assert len(order_rows(stk, "زبون قبل نشر الدوال")) == 1


def test_admin_test_message_and_toggles(tab, stk):
    t = tab()
    login(t, stk)
    logged_in(t)
    t.page.goto(f"{stk['site']}/admin/index.html#/contact")
    t.page.locator("h2", has_text="إشعارات تيليجرام").click()
    t.page.wait_for_selector("#tgTest")
    before = len(stack.TELEGRAM)
    t.page.click("#tgTest")
    t.page.wait_for_selector("text=وصلت الرسالة التجريبية", timeout=10000)
    assert len(stack.TELEGRAM) == before + 1 and "رسالة تجريبية" in stack.TELEGRAM[-1]["text"]
    # switch order alerts off and save
    t.page.locator('[data-p="notify.orders"]').uncheck(force=True)
    t.page.click("#saveBtn")
    assert wait_for(lambda: harness.admin_sql(stk["db"], "select data->'notify'->>'orders' from public.settings") == [("false",)])
    harness.admin_sql(stk["db"], "update public.settings set data = jsonb_set(data, '{notify,orders}', 'true')")
    assert not t.errors, t.errors


def test_admin_sees_alert_status_in_order(tab, stk):
    with harness.session(stk["db"]) as s:
        r = s.one("select public.place_order(%s::jsonb, %s::jsonb)", (json.dumps({"name": "طلب بحالة إشعار", "phone": "07700000031"}), json.dumps([{"id": P_TURQ}])))
    harness.admin_sql(stk["db"], "update public.orders set notify_error = 'telegram_502: Bad Gateway' where order_no = %s", (r["order_no"],))
    t = tab()
    login(t, stk)
    logged_in(t)
    t.page.goto(f"{stk['site']}/admin/index.html#/orders")
    t.page.locator("[data-oid]", has_text="طلب بحالة إشعار").first.click()
    t.page.wait_for_selector("#oAlert")
    assert "ستُعاد المحاولة تلقائياً" in t.page.inner_text("#oAlert")
