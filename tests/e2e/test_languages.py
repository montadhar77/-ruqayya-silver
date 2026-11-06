"""The site in Arabic, English, Urdu and German: the device language picks it, ?lang= and
the language links change it, products/departments/countries appear translated while
orders are still saved in Arabic, and the dashboard edits the translations."""
import json
import re
import time
import urllib.parse
from pathlib import Path

import pytest

import harness
from test_admin import login, logged_in
from test_site import checkout, open_product_and_add, wait_success

P_TURQ = "6c96ae41-cd0b-40d5-bb79-79e309025b72"     # خاتم الفيروز النيشابوري, 240000
P_NAJAF = "63c5ad73-66b5-4629-a1f5-438439648de2"    # خاتم دُرّ النجف
MIGRATION = Path(__file__).parents[2] / "supabase" / "migrations" / "0010_translations.sql"


def sql(stk, q, params=None):
    return harness.admin_sql(stk["db"], q, params)


def until(page, js, timeout=10.0):
    end = time.time() + timeout
    while time.time() < end:
        if page.evaluate(f"() => !!({js})"):
            return
        time.sleep(0.1)
    raise AssertionError(f"timed out waiting for: {js}")


@pytest.fixture(scope="module")
def translated(stk):
    """Department translations as on the live site (the seed part of 0010), one translated
    product, and a WhatsApp number so the order message can be checked."""
    seed = MIGRATION.read_text()
    sql(stk, seed[seed.index("update public.categories c set i18n"):])
    sql(stk, "update public.products set i18n = %s::jsonb where id = %s", (json.dumps({
        "en": {"name": "Nishapur Turquoise Ring", "description": "Sky-blue turquoise in a handmade 925 silver setting."},
        "ur": {"name": "نیشاپوری فیروزے کی انگوٹھی"}, "de": {"name": "Nishapur-Türkisring"}}, ensure_ascii=False), P_TURQ))
    before = sql(stk, "select data from public.settings where id = 1")[0][0]
    data = dict(before, contact={**before.get("contact", {}), "whatsapp": "07700000000"})
    sql(stk, "update public.settings set data = %s::jsonb where id = 1", (json.dumps(data, ensure_ascii=False),))
    yield
    sql(stk, "update public.settings set data = %s::jsonb where id = 1", (json.dumps(before, ensure_ascii=False),))
    sql(stk, "update public.products set i18n = '{}'")
    sql(stk, "update public.categories set i18n = '{}'")


@pytest.mark.parametrize("locale,lang,direction,home", [("en-US", "en", "ltr", "Home"), ("de-DE", "de", "ltr", "Startseite"),
                                                         ("ur-PK", "ur", "rtl", "ہوم"), ("ar-IQ", "ar", "rtl", "الرئيسية"),
                                                         ("fr-FR", "ar", "rtl", "الرئيسية")])
def test_device_language_picks_the_site_language(tab, stk, translated, locale, lang, direction, home):
    t = tab(locale=locale)
    t.page.goto(f"{stk['site']}/index.html")
    t.page.wait_for_selector(".tile h3")
    assert t.page.evaluate("[document.documentElement.lang, document.documentElement.dir]") == [lang, direction]
    assert t.page.inner_text(".nav-links a[data-link=home]") == home
    tiles = t.page.locator(".tile h3").all_inner_texts()
    assert tiles[0] == {"en": "Men's Rings", "de": "Herrenringe", "ur": "مردانہ انگوٹھیاں", "ar": "خواتم رجالية"}[lang]
    if lang in ("en", "de"):      # the site's own words (product names stay Arabic until translated)
        own = " ".join(t.page.locator(sel).first.inner_text() for sel in (".nav-links", ".hero-txt", "#departments", "#collection .title", "#visit", "footer .cols"))
        assert not re.search(r"[؀-ۿ]", own), "Arabic text left: " + own[:300]
    assert not t.errors, t.errors


def test_lang_parameter_wins_and_is_remembered(tab, stk, translated):
    t = tab(locale="en-US")
    t.page.goto(f"{stk['site']}/index.html?lang=ur#/shop")
    t.page.wait_for_selector("#shopCount")
    assert t.page.evaluate("document.documentElement.lang") == "ur"
    t.page.goto(f"{stk['site']}/index.html#/shop")                      # later visit without the parameter
    t.page.wait_for_selector("#shopCount")
    assert t.page.evaluate("document.documentElement.lang") == "ur"
    assert "آئٹمز" in t.page.inner_text("#shopCount")


@pytest.mark.parametrize("lang", ["en", "ur", "de"])
@pytest.mark.parametrize("w,h", [(390, 844), (1440, 900)])
def test_pages_have_no_layout_problems_in_every_language(tab, stk, translated, lang, w, h):
    t = tab(width=w, height=h, locale="ar-IQ")
    for route in ("", "#/shop", "#/c/mens-rings", f"#/p/{P_TURQ}"):
        t.page.goto(f"{stk['site']}/index.html?lang={lang}{route}")
        t.page.wait_for_selector("#app h1, #app h2")
        time.sleep(0.8)
        t.page.evaluate("window.scrollTo(0, document.body.scrollHeight)"); time.sleep(0.5); t.page.evaluate("window.scrollTo(0, 0)"); time.sleep(0.3)
        assert not t.layout_problems(), (route, t.layout_problems())
    assert not t.errors, t.errors


def test_drawers_open_on_the_right_side_left_to_right(tab, stk, translated):
    t = tab(width=390, height=844, locale="en-US")
    t.page.goto(f"{stk['site']}/index.html")
    t.page.wait_for_selector(".tile")
    t.page.click("#menuBtn")
    time.sleep(0.8)
    box = t.page.locator("#menu").bounding_box()
    assert box["x"] >= -1 and box["x"] + box["width"] <= 391, box
    assert t.page.locator("#menuList .lang-row a").all_inner_texts() == ["العربية", "English", "اردو", "Deutsch"]
    t.page.click("[data-close=menu]")
    time.sleep(0.9)
    assert t.page.locator("#menu").bounding_box()["x"] >= 390            # slid away to the right (where it came from)
    assert t.page.locator("#cart").bounding_box()["x"] + t.page.locator("#cart").bounding_box()["width"] <= 0   # the cart waits on the left


def test_product_page_is_translated_with_latin_digits(tab, stk, translated):
    t = tab(locale="en-US")
    t.page.goto(f"{stk['site']}/index.html#/p/{P_TURQ}")
    t.page.wait_for_selector(".p-info h1")
    assert t.page.inner_text(".p-info h1").replace("\n", " ") == "Nishapur Turquoise Ring"
    assert "240,000 IQD" in t.page.inner_text(".p-price")
    spec = t.page.inner_text(".spec")
    assert "Nishapur turquoise" in spec and "925 sterling silver" in spec and "Men's Rings" in spec
    assert t.page.inner_text(".p-info .crumbs").startswith("Home")
    # a product without its own translation keeps its Arabic name, with the dictionary for the stone
    t.page.goto(f"{stk['site']}/index.html#/p/{P_NAJAF}")
    t.page.wait_for_selector(".p-info h1")
    time.sleep(0.4)
    assert "خاتم" in t.page.inner_text(".p-info h1") and t.page.get_attribute(".p-info h1", "dir") == "auto"
    assert "Dur-e-Najaf" in t.page.inner_text(".spec")
    assert not t.errors, t.errors


def test_search_finds_translated_and_arabic_names(tab, stk, translated):
    t = tab(locale="de-DE")
    t.page.goto(f"{stk['site']}/index.html")
    t.page.wait_for_selector(".tile")
    t.page.click("#searchBtn")
    t.page.fill("#searchInput", "türkisring")
    t.page.wait_for_selector("#searchRes .card")
    assert t.page.locator("#searchRes .card h4").all_inner_texts() == ["Nishapur-Türkisring"]
    assert "1 Ergebnis" in t.page.inner_text("#searchRes .count")
    t.page.fill("#searchInput", "الفيروز")
    until(t.page, "document.querySelectorAll('#searchRes .card').length === 1")


def test_language_links_keep_the_page(tab, stk, translated):
    t = tab(width=1440, height=900, locale="ar-IQ")
    t.page.goto(f"{stk['site']}/index.html#/c/mens-rings")
    t.page.wait_for_selector("#shopCount")
    t.page.click("#langBtn")
    t.page.wait_for_selector("#langPop a[data-lang=de]", state="visible")
    t.page.click("#langPop a[data-lang=de]")
    until(t.page, "document.documentElement.lang === 'de' && !!document.querySelector('#shopCount')")
    assert t.page.evaluate("location.hash") == "#/c/mens-rings" and "lang=de" in t.page.url
    assert t.page.inner_text(".page-head h1").replace("\n", " ") == "Herrenringe"
    t.page.locator("footer .f-langs a[data-lang=ar]").click()
    until(t.page, "document.documentElement.lang === 'ar' && !!document.querySelector('#shopCount')")
    assert "خواتم رجالية" in t.page.inner_text(".page-head h1")


def test_order_in_english_is_saved_in_arabic(tab, stk, translated):
    t = tab(width=390, height=844, locale="en-US")
    open_product_and_add(t.page, stk["site"], P_TURQ)
    assert "added to your cart" in t.page.inner_text("#toast")
    checkout(t.page)
    labels = t.page.locator("#coCountry option").all_inner_texts()
    assert labels[0] == "Iraq" and "Germany" in labels
    assert t.page.locator("#coCity option").first.inner_text() == "Karbala"
    t.page.select_option("#coCity", "بغداد")
    t.page.fill("#coName", "English Customer")
    t.page.fill("#coPhone", "0770 000 0009")
    t.page.fill("#coAddr", "Test street")
    assert not t.layout_problems()
    t.page.click("#coForm button[type=submit]")
    no = wait_success(t.page)
    assert sql(stk, "select country, city, items->0->>'name' from public.orders where order_no = %s", (no,)) == [("العراق", "بغداد", "خاتم الفيروز النيشابوري")]
    assert "Your order has been received" in t.page.inner_text(".success")
    msg = urllib.parse.unquote(urllib.parse.urlparse(t.page.get_attribute(".success a.wa", "href")).query.split("text=", 1)[1])
    assert msg.startswith("Assalamu alaikum, a new order from the Ruqayya Gallery (peace be upon her) website")
    assert f"Order number: #{no}" in msg and "Governorate: Baghdad" in msg and "• Nishapur Turquoise Ring × 1 — 240,000 IQD" in msg
    assert not t.errors, t.errors


def test_order_message_in_arabic_is_unchanged(tab, stk, translated):
    t = tab(width=390, height=844)
    open_product_and_add(t.page, stk["site"], P_TURQ)
    checkout(t.page)
    t.page.fill("#coName", "زبون عربي")
    t.page.fill("#coPhone", "0770 000 0010")
    t.page.click("#coForm button[type=submit]")
    no = wait_success(t.page)
    msg = urllib.parse.unquote(urllib.parse.urlparse(t.page.get_attribute(".success a.wa", "href")).query.split("text=", 1)[1])
    assert msg.split("\n")[:5] == ["السلام عليكم، طلب جديد من موقع معرض رقية (عليها السلام)", f"رقم الطلب: #{no}", "الاسم: زبون عربي", "الهاتف: 0770 000 0010", "المحافظة: كربلاء"]
    assert "• خاتم الفيروز النيشابوري × 1 — ٢٤٠٬٠٠٠ د.ع" in msg


def test_dashboard_edits_site_and_product_translations(tab, stk, translated):
    t = tab()
    login(t, stk, path="#/languages?l=de")
    logged_in(t)
    t.page.wait_for_selector("[data-p='i18n.de.hero.title1']")
    assert t.page.get_attribute("[data-p='i18n.de.hero.title1']", "placeholder") == "Silber"     # the built-in translation
    assert t.page.get_attribute("[data-p='i18n.de.hero.title1']", "dir") == "ltr"
    t.page.fill("[data-p='i18n.de.hero.title1']", "Feines Silber")
    t.page.locator(".collapsible", has=t.page.locator("[data-p='i18n.de.places.بغداد']")).locator("h2").click()   # its group starts folded
    t.page.fill("[data-p='i18n.de.places.بغداد']", "Bagdad (Hauptstadt)")
    t.page.click("#saveBtn")
    t.page.wait_for_selector("text=تم الحفظ")
    data = sql(stk, "select data -> 'i18n' -> 'de' from public.settings where id = 1")[0][0]
    assert data["hero"]["title1"] == "Feines Silber" and data["places"]["بغداد"] == "Bagdad (Hauptstadt)"
    assert sql(stk, "select data #>> '{hero,title1}' from public.settings where id = 1") == [("فضّةٌ",)]     # Arabic untouched

    t.page.goto(f"{stk['site']}/admin/index.html#/products")
    t.page.wait_for_selector(f"[data-pid='{P_NAJAF}'] [data-act=edit]")
    t.page.click(f"[data-pid='{P_NAJAF}'] [data-act=edit]")
    t.page.wait_for_selector("#pTr", state="attached")
    t.page.click("#pTr summary")
    assert t.page.get_attribute("[data-tr='en.stone']", "placeholder") == "Dur-e-Najaf"
    t.page.fill("[data-tr='en.name']", "Dur-e-Najaf Ring")
    t.page.fill("[data-tr='ur.name']", "دُرِ نجف کی انگوٹھی")
    t.page.click("#pSave")
    t.page.wait_for_selector("text=تم حفظ التعديلات", timeout=10000)
    assert sql(stk, "select i18n from public.products where id = %s", (P_NAJAF,))[0][0] == {"en": {"name": "Dur-e-Najaf Ring"}, "ur": {"name": "دُرِ نجف کی انگوٹھی"}}

    s = tab(locale="de-DE")
    s.page.goto(f"{stk['site']}/index.html")
    s.page.wait_for_selector(".hero h1")
    time.sleep(1.5)
    assert "Feines Silber" in s.page.inner_text(".hero h1").replace("\n", " ")
    assert not t.errors, t.errors
    sql(stk, "update public.settings set data = data - 'i18n' where id = 1")
