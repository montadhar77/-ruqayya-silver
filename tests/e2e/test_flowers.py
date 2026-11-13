"""White roses on the home page: only there, purely decorative, never painted over any text,
mirrored for left-to-right languages, still for visitors who ask for less motion, and the
owner can switch them off from the dashboard."""
import io
import json
import time

import pytest
from PIL import Image, ImageChops

import harness

P_TURQ = "6c96ae41-cd0b-40d5-bb79-79e309025b72"
# shapes (badges, buttons, stat boxes, slide dots): their whole box must stay clear of the roses
SHAPES = ".hero .pill, .hero .cta a, .hero-stats > div, .show-dots button, #about .values > div, #about .cta a"
# running text: every line of it must stay clear
TEXT = ".hero h1, .hero .lead, .deck-card.top .cap, .deck-card.top .deck-no, #about h2, #about p"
BOXES = """(sel) => {
  const out = [], add = (b) => { if (b.width > 1 && b.height > 1 && b.bottom > 0 && b.top < innerHeight) out.push(b); };
  document.querySelectorAll(sel.shapes).forEach((el) => add(el.getBoundingClientRect()));
  document.querySelectorAll(sel.text).forEach((el) => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { if (!n.textContent.trim()) continue; const r = document.createRange(); r.selectNodeContents(n); [...r.getClientRects()].forEach(add); }
  });
  return out.map((b) => ({ x: Math.max(0, b.left), y: Math.max(0, b.top), width: Math.min(innerWidth, b.right) - Math.max(0, b.left), height: Math.min(innerHeight, b.bottom) - Math.max(0, b.top) }));
}"""


@pytest.fixture
def still_hero(stk):
    """The hero holds still (no slide change, no word change) while it is photographed twice."""
    before = harness.admin_sql(stk["db"], "select data from public.settings where id = 1")[0][0]
    harness.admin_sql(stk["db"], """update public.settings set data = jsonb_set(jsonb_set(data, '{hero,slide_seconds}', '600'), '{hero,flip_more}', '[]') where id = 1""")
    yield
    harness.admin_sql(stk["db"], "update public.settings set data = %s::jsonb where id = 1", (json.dumps(before, ensure_ascii=False),))


def open_home(t, stk, lang="ar"):
    t.page.goto(f"{stk['site']}/index.html?lang={lang}#/")
    t.page.wait_for_selector(".hero h1")
    t.page.evaluate("document.fonts.ready")


def until(page, js, timeout=10.0):
    end = time.time() + timeout
    while time.time() < end:
        if page.evaluate(f"() => !!({js})"):
            return
        time.sleep(0.1)
    raise AssertionError(f"timed out waiting for: {js}")


def test_roses_are_on_the_home_page_only(tab, stk):
    t = tab(width=390, height=844)
    open_home(t, stk)
    assert t.page.locator(".hero .orn .orn-frame svg").count() == 1              # the embroidered frame
    assert t.page.locator(".hero .orn .orn-foot svg").count() == 2               # roses at its feet
    # the embroidery runs through the whole site: scattered roses, title sprigs, footer garland
    # at night the ground stays clean (nothing behind the text); by day roses are scattered over linen
    assert t.page.evaluate("document.documentElement.classList.contains('emb') && getComputedStyle(document.body).backgroundImage === 'none'")
    t.page.evaluate("document.documentElement.setAttribute('data-theme', 'light')")
    assert t.page.evaluate("getComputedStyle(document.body).backgroundImage.includes('svg')")
    t.page.evaluate("document.documentElement.setAttribute('data-theme', 'dark')")
    assert "svg" in t.page.evaluate("getComputedStyle(document.querySelector('.title h2'), '::after').backgroundImage")
    assert t.page.evaluate("getComputedStyle(document.querySelector('.orbit')).display") == "none"
    assert t.page.locator("#about .bloom.bl-about svg").count() == 1
    assert t.page.locator(".hero .petals i").count() == 6
    info = t.page.evaluate("""() => [...document.querySelectorAll('.bloom, .petals, .orn, .girih')].map((el) => ({
        hidden: el.closest('[aria-hidden="true"]') ? 'true' : null, events: getComputedStyle(el).pointerEvents,
        focusable: el.querySelectorAll('a, button, input, [tabindex]').length }))""")
    assert info and all(i == {"hidden": "true", "events": "none", "focusable": 0} for i in info), info
    # the falling petals stay on the card's side of the hero (here: its top part, above the text)
    box = t.page.evaluate("(() => { const p = document.querySelector('.petals').getBoundingClientRect(), h = document.querySelector('.hero h1').getBoundingClientRect(); return [p.bottom, h.top]; })()")
    assert box[0] <= box[1], box
    for route in ("#/shop", f"#/p/{P_TURQ}", "#/c/mens-rings"):
        t.page.goto(f"{stk['site']}/index.html{route}")
        t.page.wait_for_selector("#app h1, #app h2")
        time.sleep(0.3)
        assert t.page.locator(".bloom, .petals, .orn, .girih").count() == 0, route
    t.page.goto(f"{stk['site']}/index.html#/")
    t.page.wait_for_selector(".hero .orn")
    assert not t.errors, t.errors
    assert not t.layout_problems()


@pytest.mark.parametrize("lang,width,height", [("ar", 390, 844), ("ar", 360, 740), ("ar", 1440, 900), ("en", 390, 844), ("en", 1440, 900), ("ur", 768, 1024)])
def test_roses_never_paint_over_text(tab, stk, still_hero, lang, width, height):
    """Every line of text, badge and button of the hero and the About section looks exactly the
    same with and without the roses (motion off, so both pictures are of the same moment)."""
    t = tab(width=width, height=height, reduced_motion="reduce")
    open_home(t, stk, lang)
    t.page.wait_for_selector("#about")
    for scroll_to in (None, "#about"):
        if scroll_to:
            t.page.evaluate(f"document.querySelector('{scroll_to}').scrollIntoView({{block: 'start'}})")
        time.sleep(0.5)
        boxes = t.page.evaluate(BOXES, {"shapes": SHAPES, "text": TEXT})
        assert boxes
        scale = t.page.evaluate("devicePixelRatio")
        with_roses = Image.open(io.BytesIO(t.page.screenshot())).convert("RGB")
        t.page.add_style_tag(content=".bloom, .petals, .orn, .girih { visibility: hidden !important; }")
        time.sleep(0.15)
        without = Image.open(io.BytesIO(t.page.screenshot())).convert("RGB")
        t.page.evaluate("document.querySelectorAll('style').forEach((s) => { if (s.textContent.includes('.girih { visibility')) s.remove(); })")
        changed = ImageChops.difference(with_roses, without).convert("L").point(lambda v: 255 if v > 2 else 0)
        bad = []
        for b in boxes:
            area = tuple(int(round(v * scale)) for v in (b["x"], b["y"], b["x"] + b["width"], b["y"] + b["height"]))
            if changed.crop(area).getbbox():
                bad.append(b)
        assert not bad, f"roses painted over text at {bad}"
    assert not t.errors, t.errors


def test_roses_follow_the_reading_direction_and_reduced_motion(tab, stk):
    t = tab(width=1440, height=900, locale="en-US")
    open_home(t, stk, "en")
    big = "(() => { const c = document.querySelector('.orn-a'), d = document.querySelector('#deck'); return [getComputedStyle(document.querySelector('.orn-in')).scale, getComputedStyle(c.querySelector('.bl-in')).scale, c.getBoundingClientRect().left %s d.getBoundingClientRect().left]; })()"
    assert t.page.evaluate(big % ">") == ["-1 1", "-1 1", True]                  # mirrored; the larger roses on the right
    open_home(t, stk, "ar")
    assert t.page.evaluate(big % "<") == ["none", "none", True]
    calm = tab(width=390, height=844, reduced_motion="reduce")
    open_home(calm, stk)
    assert calm.page.evaluate("getComputedStyle(document.querySelector('.petals')).display") == "none"
    assert calm.page.evaluate("getComputedStyle(document.querySelector('.orn-a svg')).animationName") == "none"
    assert calm.page.evaluate("getComputedStyle(document.querySelector('.orn-a')).opacity") == "1"
    assert calm.page.evaluate("getComputedStyle(document.querySelector('.orn-frame')).opacity") == "1"
    assert not t.errors and not calm.errors, t.errors + calm.errors


def test_owner_can_switch_the_roses_off(tab, stk):
    before = harness.admin_sql(stk["db"], "select data from public.settings where id = 1")[0][0]
    try:
        harness.admin_sql(stk["db"], """update public.settings set data = jsonb_set(data, '{theme}', coalesce(data->'theme', '{}') || '{"flowers": false}') where id = 1""")
        t = tab(width=390, height=844)
        open_home(t, stk)
        until(t.page, "document.querySelector('.hero h1') && !document.querySelector('.bloom, .petals, .orn, .girih')")
        assert t.page.locator(".bloom, .petals, .orn, .girih").count() == 0
        assert t.page.evaluate("getComputedStyle(document.querySelector('.orbit')).display") != "none"
        assert not t.page.evaluate("document.documentElement.classList.contains('emb')")
        assert not t.errors, t.errors
    finally:
        harness.admin_sql(stk["db"], "update public.settings set data = %s::jsonb where id = 1", (json.dumps(before, ensure_ascii=False),))
