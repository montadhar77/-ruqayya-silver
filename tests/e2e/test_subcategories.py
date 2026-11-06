"""Sub-departments in the browser (men's rings → agate rings …), and signing in to the
dashboard with a user name instead of an e-mail address."""
import time

import pytest

import harness
import stack
from test_admin import enter_code, login, logged_in

MENS = "262dd8ef-dbb7-4fed-ba42-c34f2eb80ce1"
P_TURQ = "6c96ae41-cd0b-40d5-bb79-79e309025b72"     # خاتم الفيروز النيشابوري
P_AQEEQ = "b70319c5-d245-4d89-8aa2-99e58d420cfb"    # خاتم العقيق اليماني الملكي
P_SHATHAR = "35f879dc-6543-4c08-baad-fbd08fcee394"  # خاتم الشذر الأصفر


def until(page, js, timeout=10.0):
    end = time.time() + timeout
    while time.time() < end:
        if page.evaluate(f"() => !!({js})"):
            return
        time.sleep(0.1)
    raise AssertionError(f"timed out waiting for: {js}")


@pytest.fixture(scope="module")
def subs(stk):
    db = stk["db"]
    rows = harness.admin_sql(db, """insert into public.categories (parent_id, name, subtitle, slug, sort) values
        (%s, 'خواتم العقيق الرجالية', 'عقيق يماني', 'mens-rings-aqeeq', 1),
        (%s, 'خواتم الفيروز الرجالية', 'فيروز نيشابوري', 'mens-rings-turquoise', 2),
        (%s, 'خواتم الياقوت الرجالية', 'ياقوت', 'mens-rings-ruby', 3) returning id""", (MENS, MENS, MENS))
    aq, tq, ruby = (str(r[0]) for r in rows)
    harness.admin_sql(db, "update public.products set subcategory_id = %s where id = %s", (aq, P_AQEEQ))
    harness.admin_sql(db, "update public.products set subcategory_id = %s where id = %s", (tq, P_TURQ))
    yield {"aq": aq, "tq": tq, "ruby": ruby}
    harness.admin_sql(db, "delete from public.products where name like 'خاتم عقيق تجريبي %%'")
    harness.admin_sql(db, "delete from public.categories where parent_id is not null")


def test_department_page_shows_its_subdepartments(tab, stk, subs):
    for theme in ("dark", "light"):
        t = tab(width=390, height=844, theme=theme)
        t.page.goto(f"{stk['site']}/index.html#/c/mens-rings")
        t.page.wait_for_selector(".seg-sub .chip")
        chips = t.page.locator(".seg-sub .chip").all_inner_texts()
        assert chips == ["كل خواتم رجالية", "خواتم العقيق الرجالية", "خواتم الفيروز الرجالية", "خواتم الياقوت الرجالية"]
        assert t.page.locator(".card").count() == 3                      # whole department
        t.page.click(".seg-sub .chip >> text=خواتم العقيق الرجالية")
        until(t.page, "location.hash === '#/c/mens-rings/mens-rings-aqeeq'")
        t.page.wait_for_selector("h1")
        time.sleep(0.6)
        assert "خواتم العقيق الرجالية" in t.page.inner_text("h1")
        assert t.page.locator(".card h4").all_inner_texts() == ["خاتم العقيق اليماني الملكي"]
        assert "chip on" in t.page.inner_html(".seg-sub")
        assert not t.layout_problems(), t.layout_problems()
        assert not t.errors, t.errors


def test_empty_subdepartment_and_unknown_one(tab, stk, subs):
    t = tab()
    t.page.goto(f"{stk['site']}/index.html#/c/mens-rings/mens-rings-ruby")
    t.page.wait_for_selector(".empty")
    t.page.goto(f"{stk['site']}/index.html#/c/mens-rings/no-such-sub")
    until(t.page, "location.hash === '#/c/mens-rings'")
    assert not t.errors, t.errors


def test_product_page_links_its_subdepartment(tab, stk, subs):
    t = tab()
    t.page.goto(f"{stk['site']}/index.html#/p/{P_TURQ}")
    t.page.wait_for_selector(".p-info .crumbs")
    assert t.page.get_attribute(".p-info .crumbs a[href='#/c/mens-rings/mens-rings-turquoise']", "href")
    assert "خواتم الفيروز الرجالية" in t.page.inner_text(".spec")


def test_large_shop_pages_a_subdepartment_from_the_server(tab, stk, subs):
    harness.admin_sql(stk["db"], """insert into public.products (category_id, subcategory_id, name, price, active, sort)
        select %s, %s, 'خاتم عقيق تجريبي ' || i, 50000 + i, true, 500 + i from generate_series(1, 70) i""", (MENS, subs["aq"]))
    t = tab(width=1440, height=900)
    t.page.goto(f"{stk['site']}/index.html#/c/mens-rings/mens-rings-aqeeq")
    t.page.wait_for_selector("#shopGrid .card")
    assert t.page.locator("#shopGrid .card").count() == 24
    assert "71" in t.page.inner_text("#shopCount").translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789"))
    t.page.click("#moreBtn")
    until(t.page, "document.querySelectorAll('#shopGrid .card').length === 48")
    assert not t.errors, t.errors
    harness.admin_sql(stk["db"], "delete from public.products where name like 'خاتم عقيق تجريبي %%'")


def test_dashboard_manages_subdepartments_and_product_assignment(tab, stk, subs):
    t = tab()
    login(t, stk, path="#/categories")
    logged_in(t)
    t.page.wait_for_selector(f"[data-cid='{subs['aq']}']")
    assert "sub" in t.page.get_attribute(f"[data-cid='{subs['aq']}']", "class")
    t.page.click(f"[data-cid='{MENS}'] [data-act=addsub]")
    t.page.wait_for_selector("#cName")
    assert t.page.input_value("#cParent") == MENS
    t.page.fill("#cName", "خواتم الزمرد الرجالية")
    t.page.fill("#cSlug", "mens-rings-emerald")
    t.page.click("#cSave")
    t.page.wait_for_selector("text=تم حفظ القسم")
    assert harness.admin_sql(stk["db"], "select parent_id::text from public.categories where slug = 'mens-rings-emerald'") == [(MENS,)]

    t.page.goto(f"{stk['site']}/admin/index.html#/products")
    t.page.wait_for_selector(f"[data-pid='{P_SHATHAR}'] [data-act=edit]")
    t.page.click(f"[data-pid='{P_SHATHAR}'] [data-act=edit]")
    t.page.wait_for_selector("#fSub", state="attached")
    assert t.page.is_visible("#fSubWrap")
    t.page.select_option("#fSub", label="خواتم الزمرد الرجالية")
    t.page.click("#pSave")
    t.page.wait_for_selector("text=تم حفظ التعديلات", timeout=10000)
    assert harness.admin_sql(stk["db"], "select c.slug from public.products p join public.categories c on c.id = p.subcategory_id where p.id = %s", (P_SHATHAR,)) == [("mens-rings-emerald",)]
    assert not t.errors, t.errors


def test_dashboard_signs_in_with_a_user_name(tab, stk):
    alias = "ruqayatest@admin.ruqaya.invalid"
    stack.AUTH.users[alias] = dict(stack.ADMIN, email=alias)
    try:
        t = tab()
        t.page.goto(f"{stk['site']}/admin/index.html")
        t.page.wait_for_selector("#lEmail")
        assert t.page.get_attribute("#lEmail", "type") == "text"
        t.page.fill("#lEmail", "RuqayaTest")                        # case does not matter
        t.page.fill("#lPass", stack.ADMIN["password"])
        t.page.click("#loginForm button[type=submit]")
        t.page.wait_for_selector("#side, #mfaCode", timeout=10000)
        if t.page.query_selector("#mfaCode"):
            enter_code(t)
        logged_in(t)
        t2 = tab()
        t2.page.goto(f"{stk['site']}/admin/index.html")
        t2.page.wait_for_selector("#lEmail")
        t2.page.fill("#lEmail", "ruqayatest")
        t2.page.fill("#lPass", "wrong-password-0000")
        t2.page.click("#loginForm button[type=submit]")
        t2.page.wait_for_selector("#toast.show, .toast.show", timeout=10000)
        assert not t2.page.query_selector("#side")
    finally:
        stack.AUTH.users.pop(alias, None)
