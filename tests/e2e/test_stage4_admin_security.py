"""Stage 4 in the browser: two-step verification, idle sign-out, CSP-clean pages."""
import time

import harness
import stack
from test_admin import enter_code, logged_in, login


def reset_factors():
    with stack.AUTH.lock:
        stack.AUTH.factors.clear()


def test_first_login_enrols_then_every_login_asks_for_the_code(tab, stk):
    reset_factors()
    t = tab(width=390, height=844)
    login(t, stk, mfa=False)
    t.page.wait_for_selector("#mfaSecret", timeout=10000)          # enrolment: QR + manual key
    assert t.page.is_visible(".mfa-qr img")
    enter_code(t, "000000")                                          # wrong code is refused
    t.page.wait_for_selector("#toast:has-text('الرمز غير صحيح')")
    enter_code(t)
    logged_in(t)
    assert [f["status"] for f in stack.AUTH.factors.values()] == ["verified"]
    # next time: only the code
    t2 = tab()
    login(t2, stk, mfa=False)
    t2.page.wait_for_selector("#mfaCode", timeout=10000)
    assert not t2.page.query_selector("#mfaSecret")
    enter_code(t2)
    logged_in(t2)
    assert not t.errors and not t2.errors, t.errors + t2.errors


def test_password_alone_cannot_change_anything(tab, stk):
    """Even if the dashboard screens were bypassed, the database refuses an aal1 session."""
    t = tab()
    login(t, stk, mfa=False)
    t.page.wait_for_selector("#mfaCode", timeout=10000)
    status = t.page.evaluate("""async () => {
        const s = JSON.parse(localStorage.getItem('rq-admin'));
        const r = await fetch('http://127.0.0.1:54331/rest/v1/products?id=eq.6c96ae41-cd0b-40d5-bb79-79e309025b72', {
          method: 'PATCH', headers: { apikey: 'local-publishable-key', Authorization: 'Bearer ' + s.access_token,
                                     'Content-Type': 'application/json', Prefer: 'return=representation' },
          body: JSON.stringify({ price: 1 }) });
        return [r.status, await r.json()];
    }""")
    assert status == [200, []]                                       # RLS: zero rows changed
    assert harness.admin_sql(stk["db"], "select price from public.products where id = '6c96ae41-cd0b-40d5-bb79-79e309025b72'") == [(240000,)]


def test_idle_session_signs_out(tab, stk):
    t = tab()
    t.ctx.add_init_script("try{sessionStorage.setItem('rq_idle_ms','2500')}catch(e){}")
    login(t, stk)
    logged_in(t)
    t.page.wait_for_selector("text=خرجت تلقائياً بعد فترة بلا نشاط", timeout=12000)
    assert t.page.is_visible("#loginForm")


def test_upload_needs_two_step_session(tab, stk):
    t = tab()
    login(t, stk)
    logged_in(t)
    res = t.page.evaluate("""async () => {
        const s = JSON.parse(localStorage.getItem('rq-admin'));
        const up = (tok) => fetch('http://127.0.0.1:54331/storage/v1/object/media/test/' + Math.random() + '.webp', {
          method: 'POST', headers: { apikey: 'local-publishable-key', Authorization: 'Bearer ' + tok, 'Content-Type': 'image/webp' }, body: 'x' }).then(r => r.status);
        return await up(s.access_token);
    }""")
    assert res == 200


def test_pages_have_no_csp_violations(tab, stk):
    t = tab()
    msgs = []
    t.page.on("console", lambda m: msgs.append(m.text) if "Content Security Policy" in m.text or "Refused to" in m.text else None)
    for path in ["/index.html", "/index.html#/shop", "/index.html#/p/6c96ae41-cd0b-40d5-bb79-79e309025b72"]:
        t.page.goto(stk["site"] + path)
        time.sleep(1.2)
    login(t, stk)
    logged_in(t)
    for p in ["orders", "products", "home", "identity", "contact"]:
        t.page.goto(f"{stk['site']}/admin/index.html#/{p}")
        time.sleep(0.5)
    assert not msgs, msgs
    assert t.page.evaluate("document.querySelector('meta[http-equiv=Content-Security-Policy]') !== null")
