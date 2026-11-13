"""Small things a visitor would notice: the floating WhatsApp button never covers text or a
button, Arabic counts agree with the number, messages never sit on top of the cart's buttons,
the Back button closes the order form, and the hero's card stack stays neat."""
import json
import time

import pytest

import harness

P1 = "6c96ae41-cd0b-40d5-bb79-79e309025b72"

# is anything readable or pressable under the floating button? (the button itself hidden while looking)
UNDER_FAB = r"""() => {
  const wa = document.querySelector('#waFloat'); if (!wa || wa.hidden) return null;
  const x0 = wa.offsetLeft, y0 = wa.offsetTop, w = wa.offsetWidth, h = wa.offsetHeight;
  const v = wa.style.visibility; wa.style.visibility = 'hidden'; const hits = [];
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
    const x = x0 + (w * i) / 4, y = y0 + (h * j) / 4;
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
    const el = document.elementFromPoint(x, y); if (!el) continue;
    const c = el.closest('a, button, input, select, textarea, label');
    if (c) { hits.push('control: ' + (c.textContent || c.tagName).trim().slice(0, 30)); continue; }
    const r = document.caretRangeFromPoint(x, y), n = r && r.startContainer;
    if (n && n.nodeType === 3 && n.textContent.trim()) {
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const b of rg.getClientRects()) if (x >= b.left && x <= b.right && y >= b.top && y <= b.bottom) hits.push('text: ' + n.textContent.trim().slice(0, 30));
    }
  }
  wa.style.visibility = v;
  return { away: wa.classList.contains('away'), hits };
}"""


@pytest.fixture
def whatsapp(stk):
    """The shop has a WhatsApp number (so the floating button shows)."""
    before = harness.admin_sql(stk["db"], "select data from public.settings where id = 1")[0][0]
    harness.admin_sql(stk["db"], """update public.settings set data = jsonb_set(data, '{contact}', coalesce(data->'contact', '{}') || '{"whatsapp": "07700000000"}') where id = 1""")
    yield
    harness.admin_sql(stk["db"], "update public.settings set data = %s::jsonb where id = 1", (json.dumps(before, ensure_ascii=False),))


@pytest.mark.parametrize("route", ["#/", "#/shop", f"#/p/{P1}", "#/c/mens-rings"])
def test_whatsapp_button_never_covers_text_or_buttons(tab, stk, whatsapp, route):
    t = tab(width=390, height=844)
    t.page.goto(f"{stk['site']}/index.html{route}")
    t.page.wait_for_selector("#app h1, #app h2")
    time.sleep(1.2)
    H = t.page.evaluate("document.documentElement.scrollHeight")
    shown = 0
    for y in range(0, H, 260):
        t.page.evaluate(f"window.scrollTo(0, {y})")
        time.sleep(0.45)                                         # the button decides once the page settles
        st = t.page.evaluate(UNDER_FAB)
        assert st is not None
        if not st["away"]:
            shown += 1
            assert not st["hits"], f"at {y}px the WhatsApp button covers {st['hits']}"
    assert shown, "the button never showed at all"
    assert not t.errors, t.errors


def test_arabic_counts_agree_with_the_number(tab, stk):
    t = tab(width=1280, height=860)
    t.page.goto(f"{stk['site']}/index.html#/shop")
    t.page.wait_for_selector("#shopCount")
    time.sleep(0.6)
    assert t.page.inner_text("#shopCount") == "٨ منتجات"
    t.page.goto(f"{stk['site']}/index.html#/c/mens-rings")
    t.page.wait_for_selector("#shopCount")
    time.sleep(0.6)
    assert t.page.inner_text("#shopCount") == "٣ منتجات"
    t.page.goto(f"{stk['site']}/index.html#/c/womens-rings")
    t.page.wait_for_selector("#shopCount")
    time.sleep(0.6)
    assert t.page.inner_text("#shopCount") == "منتج واحد"
    t.page.click("#searchBtn")
    t.page.fill("#searchInput", "خاتم")
    t.page.wait_for_selector("#searchRes .count")
    time.sleep(0.5)
    assert t.page.inner_text("#searchRes .count") == "٤ نتائج"
    assert not t.errors, t.errors


def test_messages_never_cover_the_cart_buttons(tab, stk):
    t = tab(width=390, height=844)
    t.page.goto(f"{stk['site']}/index.html#/p/{P1}")
    t.page.wait_for_selector("#addBtn")
    t.page.click("#addBtn")
    assert t.page.evaluate("document.querySelector('#toast').classList.contains('show')")
    t.page.click("#cartBtn")
    t.page.wait_for_selector("#toCheckout", state="visible")
    assert not t.page.evaluate("document.querySelector('#toast').classList.contains('show')")      # cleared when the cart opens
    # a message that comes while the cart is open shows at the top of the screen, clear of its buttons
    t.page.evaluate("document.querySelector('#toast').classList.add('at-top', 'show')")
    time.sleep(0.5)
    box = t.page.evaluate("(() => { const a = document.querySelector('#toast').getBoundingClientRect(), b = document.querySelector('#toCheckout').getBoundingClientRect(); return [a.bottom, b.top]; })()")
    assert box[0] < box[1], box
    assert not t.errors, t.errors


def test_back_button_closes_the_order_form(tab, stk):
    t = tab(width=390, height=844)
    t.page.goto(f"{stk['site']}/index.html#/p/{P1}")
    t.page.wait_for_selector("#addBtn")
    t.page.click("#addBtn")
    t.page.click("#cartBtn")
    t.page.wait_for_selector("#toCheckout", state="visible")
    t.page.click("#toCheckout")
    t.page.wait_for_selector("#coForm", state="visible")
    t.page.evaluate("location.hash = '#/shop'")
    time.sleep(0.8)
    assert not t.page.evaluate("document.querySelector('#checkoutBg').classList.contains('open')")
    t.page.click("#menuBtn")                                                                          # the page is usable again
    t.page.wait_for_selector("#menu.open")
    assert not t.errors, t.errors


@pytest.mark.parametrize("width", [390, 1440])
def test_hero_card_stack_is_neat(tab, stk, width):
    t = tab(width=width, height=844 if width < 700 else 900)
    t.page.goto(f"{stk['site']}/index.html#/")
    t.page.wait_for_selector("#deck .deck-card.top")
    time.sleep(2.5)
    # every card behind the front one is straight and hidden behind it (no skewed edge peeking out)
    cards = t.page.evaluate("""[...document.querySelectorAll('#deck .deck-card')].map((c) => { const b = c.getBoundingClientRect(), s = getComputedStyle(c);
        return { top: c.classList.contains('top'), l: b.left, r: b.right, t: b.top, b: b.bottom, o: +s.opacity, tr: s.transform }; })""")
    front = next(c for c in cards if c["top"])
    for c in cards:
        if c["top"] or c["o"] == 0:
            continue
        assert c["l"] >= front["l"] - 1 and c["r"] <= front["r"] + 1 and c["t"] >= front["t"] - 1, (c, front)
    assert not t.errors, t.errors


def test_old_default_colours_saved_by_the_dashboard_give_way_to_the_new_palette(tab, stk):
    """A save in the dashboard stores every setting, defaults included. The old night palettes
    (onyx, emerald velvet) saved that way must not hide the current one; a colour the owner
    really picked stays."""
    before = harness.admin_sql(stk["db"], "select data from public.settings where id = 1")[0][0]
    try:
        harness.admin_sql(stk["db"], """update public.settings set data = jsonb_set(data, '{theme}', coalesce(data->'theme', '{}') ||
            '{"deep": "#0c261d", "pearl": "#113126", "paper": "#173d30", "emerald": "#dcc27a", "silver": "#bfcac2", "accent": "#6cc29a", "ink": "#f6f1e4"}') where id = 1""")
        t = tab(width=390, height=844)
        t.page.goto(f"{stk['site']}/index.html#/")
        t.page.wait_for_selector("#app h1")
        time.sleep(0.8)
        deep = t.page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--deep').trim()")
        assert deep == "#0f1211", deep
        harness.admin_sql(stk["db"], """update public.settings set data = jsonb_set(data, '{theme,accent}', '"#3388ff"') where id = 1""")
        t.page.reload()
        t.page.wait_for_selector("#app h1")
        time.sleep(0.8)
        got = t.page.evaluate("[getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(), getComputedStyle(document.documentElement).getPropertyValue('--deep').trim()]")
        assert got == ["#3388ff", "#0f1211"], got                                    # his own colour kept, old defaults dropped
        assert not t.errors, t.errors
    finally:
        harness.admin_sql(stk["db"], "update public.settings set data = %s::jsonb where id = 1", (json.dumps(before, ensure_ascii=False),))
