"""Storefront end-to-end tests: the real site files, a real PostgREST and a real
(local, throw-away) database. Every order/inquiry is checked in the database."""
import time

import pytest

import harness

P_TURQ = "6c96ae41-cd0b-40d5-bb79-79e309025b72"    # 240000, unlimited
P_AQEEQ = "b70319c5-d245-4d89-8aa2-99e58d420cfb"   # 320000


def db_rows(stk, sql, params=None):
    return harness.admin_sql(stk["db"], sql, params)


def settle(page, secs=1.2):
    time.sleep(secs)
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    time.sleep(0.5)
    page.evaluate("window.scrollTo(0, 0)")
    time.sleep(0.3)


def open_product_and_add(page, site, pid):
    page.goto(f"{site}/index.html#/p/{pid}")
    page.wait_for_selector("#addBtn")
    page.click("#addBtn")
    time.sleep(0.3)


def wait_success(page, timeout=15000):
    """Wait for the order confirmation; on failure report what the customer saw."""
    try:
        page.wait_for_selector(".success .no", timeout=timeout)
    except Exception:
        raise AssertionError("no confirmation; toast: " + page.inner_text("#toast"))
    return int(page.inner_text(".success .no").strip("#"))


def checkout(page):
    page.click("#cartBtn")
    page.wait_for_selector("#toCheckout", state="visible")
    page.click("#toCheckout")
    page.wait_for_selector("#coForm")


WIDTHS = [(360, 740), (390, 844), (768, 1024), (1440, 900)]


@pytest.mark.parametrize("w,h", WIDTHS, ids=[f"{w}" for w, _ in WIDTHS])
@pytest.mark.parametrize("theme", ["dark", "light"])
def test_pages_render_without_layout_problems(tab, stk, w, h, theme):
    t = tab(width=w, height=h, theme=theme)
    problems = []
    for route in ["", "#/shop", "#/c/mens-rings", "#/c/watches", f"#/p/{P_AQEEQ}", "#/p/does-not-exist"]:
        t.page.goto(f"{stk['site']}/index.html{route}")
        settle(t.page)
        problems += [f"{route or 'home'}: {x}" for x in t.layout_problems()]
    assert not problems, problems
    assert not t.errors, t.errors


def test_catalog_comes_from_database(tab, stk):
    t = tab()
    t.page.goto(f"{stk['site']}/index.html#/shop")
    t.page.wait_for_selector(f"a[href='#/p/{P_AQEEQ}']")
    names = db_rows(stk, "select name from public.products where active")
    body = t.page.inner_text("#app")
    for (n,) in names:
        assert n in body


def test_local_order_is_saved_with_server_prices(tab, stk):
    t = tab(width=390, height=844)
    open_product_and_add(t.page, stk["site"], P_TURQ)
    open_product_and_add(t.page, stk["site"], P_AQEEQ)
    checkout(t.page)
    t.page.fill("#coName", "زبون تجريبي")
    t.page.fill("#coPhone", "0770 000 0001")
    t.page.fill("#coAddr", "شارع الاختبار")
    t.page.click("#coForm button[type=submit]")
    no = wait_success(t.page)
    row = db_rows(stk, "select customer_name, subtotal, delivery, total, country from public.orders where order_no = %s", (no,))
    assert row == [("زبون تجريبي", 240000 + 320000, 5000, 565000, "العراق")]
    assert not t.errors, t.errors


def test_international_order(tab, stk):
    t = tab(width=1440, height=900)
    open_product_and_add(t.page, stk["site"], P_TURQ)
    checkout(t.page)
    t.page.select_option("#coCountry", "ألمانيا")
    assert t.page.is_visible("#coCityIntl")
    t.page.fill("#coName", "Test Customer")
    t.page.fill("#coPhone", "+49 151 0000000")
    t.page.fill("#coCityIntl", "Berlin")
    t.page.fill("#coAddr", "Teststr. 1, 10115")
    assert not t.layout_problems()
    t.page.click("#coForm button[type=submit]")
    no = wait_success(t.page)
    row = db_rows(stk, "select country, city, delivery from public.orders where order_no = %s", (no,))
    assert row == [("ألمانيا", "Berlin", 0)]


def test_contact_form_creates_inquiry(tab, stk):
    t = tab()
    t.page.goto(f"{stk['site']}/index.html")
    t.page.wait_for_selector("#contactForm", state="attached")
    t.page.locator("#contactForm").scroll_into_view_if_needed()
    t.page.fill("#contactForm [name=name]", "زائر الاختبار")
    t.page.fill("#contactForm [name=phone]", "07700000002")
    t.page.fill("#contactForm [name=body]", "هل يتوفر مقاس ٢٠؟")
    t.page.click("#contactForm button[type=submit]")
    for _ in range(50):
        if db_rows(stk, "select count(*) from public.inquiries where name = 'زائر الاختبار'")[0][0]:
            break
        time.sleep(0.1)
    assert db_rows(stk, "select body from public.inquiries where name = 'زائر الاختبار'") == [("هل يتوفر مقاس ٢٠؟",)]


def test_search_finds_products(tab, stk):
    t = tab()
    t.page.goto(f"{stk['site']}/index.html")
    time.sleep(1)
    t.page.click("#searchBtn")
    t.page.fill("#searchInput", "خاتم")
    time.sleep(0.8)
    txt = t.page.inner_text("body")
    assert "خاتم العقيق اليماني الملكي" in txt
    assert not t.errors, t.errors
