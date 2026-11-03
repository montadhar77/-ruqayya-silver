"""Stage 6 in the browser: a large catalogue (more products than the site loads at once)
is paged, searched and opened from the server; the dashboard pages and searches orders on
the server. Small catalogues keep the original behaviour (covered by test_site.py)."""
import re
import time

import pytest

import harness
import stack
from test_admin import login, logged_in

MENS = "262dd8ef-dbb7-4fed-ba42-c34f2eb80ce1"
MISBAHA = "2b7a3ddf-ff16-46eb-9030-903ab4c9cf99"
N = 150


@pytest.fixture(scope="module")
def big(stk):
    """150 extra synthetic products (index 1..150); removed afterwards."""
    harness.admin_sql(stk["db"], """
        insert into public.products (category_id, name, description, price, stone, metal, stock, active, sort, created_at)
        select case when i %% 3 = 0 then %s::uuid else %s::uuid end, 'قطعة الاختبار رقم ' || i, 'وصف تجريبي', 10000 + i * 100,
               case when i = 137 then 'ياقوت كشميري' else 'عقيق' end, 'فضة', case when i = 140 then 3 else null end, true, 1000 + i,
               now() - (i || ' minutes')::interval
        from generate_series(1, %s) i""", (MISBAHA, MENS, N))
    total = harness.admin_sql(stk["db"], "select count(*) from public.products where active")[0][0]
    pid = lambda i: str(harness.admin_sql(stk["db"], "select id from public.products where name = %s", (f"قطعة الاختبار رقم {i}",))[0][0])
    yield {"total": total, "pid": pid}
    harness.admin_sql(stk["db"], "delete from public.orders where customer_name like 'زبون المتجر الكبير%%'")
    harness.admin_sql(stk["db"], "delete from public.stock_movements where product_id in (select id from public.products where name like 'قطعة الاختبار رقم %%')")
    harness.admin_sql(stk["db"], "delete from public.products where name like 'قطعة الاختبار رقم %%'")


def until(page, js, timeout=10.0):
    """Poll a browser expression (wait_for_function is blocked by the site's CSP, which forbids eval)."""
    end = time.time() + timeout
    while time.time() < end:
        if page.evaluate(f"() => !!({js})"):
            return
        time.sleep(0.1)
    raise AssertionError(f"timed out waiting for: {js}")


def cards(page):
    return page.locator("#shopGrid .card").count()


def digits(t):
    return int(re.sub(r"\D", "", t.translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789"))) or 0)


def test_home_shows_server_counts(tab, stk, big):
    t = tab(width=390, height=844)
    t.page.goto(f"{stk['site']}/index.html")
    t.page.wait_for_selector("#collection .card")
    assert digits(t.page.inner_text("#menuList a[href='#/shop'] small")) == big["total"]
    mens = harness.admin_sql(stk["db"], "select count(*) from public.products where active and category_id = %s", (MENS,))[0][0]
    assert digits(t.page.inner_text(f"#menuList a[href='#/c/mens-rings'] small")) == mens
    assert not t.errors, t.errors


@pytest.mark.parametrize("proxy", [False, True], ids=["direct", "cdn-proxy"])
def test_shop_pages_with_show_more(tab, stk, big, proxy):
    stack.PROXY_LOG.clear()
    t = tab(width=1440, height=900)
    if proxy:
        t.ctx.add_init_script("sessionStorage.setItem('rq_api', '/api/rpc')")
    t.page.goto(f"{stk['site']}/index.html#/shop")
    t.page.wait_for_selector("#shopGrid .card")
    assert cards(t.page) == 24
    assert digits(t.page.inner_text("#shopCount")) == big["total"]
    assert t.page.is_visible("#moreBtn")
    t.page.click("#moreBtn")
    until(t.page, "document.querySelectorAll('#shopGrid .card').length === 48")
    names = t.page.locator("#shopGrid .card h4").all_inner_texts()
    assert len(set(names)) == 48                                   # no duplicates across pages
    assert not t.layout_problems()
    assert not t.errors, t.errors
    if proxy:
        assert "catalog_home" in stack.PROXY_LOG and stack.PROXY_LOG.count("list_products") >= 2
    else:
        assert not stack.PROXY_LOG


def test_department_page_sorted_by_price(tab, stk, big):
    t = tab()
    t.page.goto(f"{stk['site']}/index.html#/c/misbaha")
    t.page.wait_for_selector("#shopGrid .card")
    t.page.select_option("#sortSel", "low")
    t.page.wait_for_selector("#shopGrid .card")
    time.sleep(0.5)
    cheapest = harness.admin_sql(stk["db"], "select name from public.products where active and category_id = %s order by price limit 1", (MISBAHA,))[0][0]
    assert t.page.locator("#shopGrid .card h4").first.inner_text() == cheapest
    assert digits(t.page.inner_text("#shopCount")) == harness.admin_sql(stk["db"], "select count(*) from public.products where active and category_id = %s", (MISBAHA,))[0][0]


def test_product_outside_first_page_opens_with_related(tab, stk, big):
    t = tab(width=390, height=844)
    t.page.goto(f"{stk['site']}/index.html#/p/{big['pid'](140)}")
    t.page.wait_for_selector(".p-info h1")
    assert "قطعة الاختبار رقم 140" in t.page.inner_text(".p-info h1")
    t.page.wait_for_selector("#relatedSec .card")
    assert t.page.locator("#relatedSec .card").count() == 4
    assert not t.errors, t.errors


def test_unknown_product_shows_not_found(tab, stk, big):
    t = tab()
    t.page.goto(f"{stk['site']}/index.html#/p/00000000-0000-4000-8000-00000000dead")
    t.page.wait_for_selector("a.btn[href='#/shop']")
    assert not t.errors, t.errors


def test_search_on_server_with_arabic_normalisation(tab, stk, big):
    t = tab()
    t.page.goto(f"{stk['site']}/index.html")
    time.sleep(1)
    t.page.click("#searchBtn")
    t.page.fill("#searchInput", "ياقوت كشميرى")                  # ى typed for ي
    t.page.wait_for_selector("#searchRes .card")
    assert t.page.locator("#searchRes .card h4").all_inner_texts() == ["قطعة الاختبار رقم 137"]
    t.page.fill("#searchInput", "رقم ١٤٠")                         # Arabic digits
    until(t.page, "document.querySelector('#searchRes .card h4') && document.querySelector('#searchRes .card h4').textContent.includes('140')")
    assert not t.errors, t.errors


def test_cart_keeps_products_outside_first_page_and_orders_them(tab, stk, big):
    t = tab(width=390, height=844)
    pid = big["pid"](140)
    t.page.goto(f"{stk['site']}/index.html#/p/{pid}")
    t.page.wait_for_selector("#addBtn")
    t.page.click("#addBtn")
    time.sleep(0.3)
    t.page.goto(f"{stk['site']}/index.html")                     # fresh page: product is not among the first 60
    t.page.reload()
    until(t.page, "document.querySelector('#cartCount') && !document.querySelector('#cartCount').hidden")
    t.page.click("#cartBtn")
    t.page.wait_for_selector("#toCheckout", state="visible")
    assert "قطعة الاختبار رقم 140" in t.page.inner_text("#cartBody")
    t.page.click("#toCheckout")
    t.page.wait_for_selector("#coForm")
    t.page.fill("#coName", "زبون المتجر الكبير")
    t.page.fill("#coPhone", "07701231234")
    t.page.fill("#coAddr", "شارع الاختبار")
    t.page.click("#coForm button[type=submit]")
    t.page.wait_for_selector(".success .no", timeout=15000)
    row = harness.admin_sql(stk["db"], "select subtotal from public.orders where customer_name = 'زبون المتجر الكبير'")
    assert row == [(10000 + 140 * 100,)]
    assert harness.admin_sql(stk["db"], "select stock from public.products where id = %s", (pid,)) == [(2,)]


def test_dashboard_pages_and_searches_orders_on_server(tab, stk, big):
    for i in range(55):
        harness.admin_sql(stk["db"], """insert into public.orders (customer_name, phone, city, items, subtotal, total, status)
            values (%s, %s, 'بغداد', '[]'::jsonb, 1000, 1000, %s)""",
                          (f"زبون المتجر الكبير {i}", f"0780{i:07d}", "delivered" if i % 5 == 0 else "new"))
    t = tab()
    login(t, stk, path="#/orders")
    logged_in(t)
    t.page.wait_for_selector("#oList .row")
    all_n = harness.admin_sql(stk["db"], "select count(*) from public.orders")[0][0]
    assert t.page.locator("#oList [data-oid]").count() == 50
    assert digits(t.page.inner_text("#oTotal")) == all_n
    t.page.click("#oMore")
    until(t.page, f"document.querySelectorAll('#oList [data-oid]').length === {min(all_n, 100)}")
    t.page.fill("#oSearch", "0780 000 0042")                      # phone typed with spaces
    until(t.page, "document.querySelectorAll('#oList [data-oid]').length === 1")
    assert "زبون المتجر الكبير 42" in t.page.inner_text("#oList")
    t.page.fill("#oSearch", "")
    t.page.click("[data-st='delivered']")
    until(t.page, "document.querySelector('[data-st=delivered]').classList.contains('on')")
    t.page.wait_for_selector("#oList [data-oid]")
    delivered = harness.admin_sql(stk["db"], "select count(*) from public.orders where status = 'delivered'")[0][0]
    assert t.page.locator("#oList [data-oid]").count() == min(delivered, 50)
    assert not t.errors, t.errors


def test_dashboard_stats_and_product_list_beyond_one_page(tab, stk, big):
    t = tab()
    login(t, stk)
    logged_in(t)
    t.page.wait_for_selector(".stats")
    active = harness.admin_sql(stk["db"], "select count(*) from public.products where active")[0][0]
    assert str(active) in t.page.inner_text(".stats").translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")).replace("٬", "").replace(",", "")
    t.page.goto(f"{stk['site']}/admin/index.html#/products")
    t.page.wait_for_selector("#pList [data-pid]")
    assert t.page.locator("#pList [data-pid]").count() == 60
    t.page.click("#pMore")
    until(t.page, "document.querySelectorAll('#pList [data-pid]').length === 120")
    t.page.fill("#pSearch", "رقم 137")
    until(t.page, "document.querySelectorAll('#pList [data-pid]').length === 1")
    t.page.click("#pList [data-pid] [data-act=edit]")
    t.page.wait_for_selector("#fDesc")
    assert t.page.input_value("#fDesc") == "وصف تجريبي"              # full row loaded for the editor
    assert not t.errors, t.errors
