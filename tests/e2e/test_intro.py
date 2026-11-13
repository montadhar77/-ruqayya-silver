"""The opening screen shows the Ruqayya logo (never the old ring-and-star emblem): on screen from
the first paint, before the site's scripts arrive; «تخطّي» works at any moment; it never flashes
on later pages of the same visit; the owner's own logo takes its place; and if the picture or the
uploaded video cannot load, the visitor still gets a clean opening."""
import json
import re
import time

import pytest

import harness

LOGO = "(() => { const l = document.querySelector('#introLogo'); return l ? { in: l.classList.contains('in'), op: +getComputedStyle(l).opacity, src: l.getAttribute('src'), w: l.getBoundingClientRect().width, h: l.getBoundingClientRect().height } : null; })()"


def until(page, js, timeout=10.0):
    end = time.time() + timeout
    while time.time() < end:
        if page.evaluate(f"() => !!({js})"):
            return
        time.sleep(0.05)
    raise AssertionError(f"timed out waiting for: {js}")


def late_site(t, seconds):
    """The site's main script arrives `seconds` late (a stand-in loads the real file then)."""
    stub = "setTimeout(function(){var s=document.createElement('script');s.src='assets/js/site.js?late';document.body.appendChild(s);}, %d);" % int(seconds * 1000)
    t.ctx.route(re.compile(r".*/assets/js/site\.js$"), lambda r: r.fulfill(content_type="text/javascript", body=stub))


@pytest.fixture
def settings(stk):
    """Change the shop's settings for one test (restored afterwards)."""
    before = harness.admin_sql(stk["db"], "select data from public.settings where id = 1")[0][0]

    def put(section, key, value):
        harness.admin_sql(stk["db"], "update public.settings set data = jsonb_set(data, array[%s::text], coalesce(data->%s::text, '{}'::jsonb) || jsonb_build_object(%s::text, %s::jsonb)) where id = 1",
                          (section, section, key, json.dumps(value)))
    yield put
    harness.admin_sql(stk["db"], "update public.settings set data = %s::jsonb where id = 1", (json.dumps(before, ensure_ascii=False),))


@pytest.mark.parametrize("theme,width,height", [("dark", 390, 844), ("light", 390, 844), ("light", 1440, 900), ("dark", 844, 390)])
def test_opening_shows_the_ruqayya_logo(tab, stk, theme, width, height):
    t = tab(width=width, height=height, theme=theme, intro=True)
    t.page.goto(f"{stk['site']}/index.html", wait_until="commit")
    until(t.page, "document.querySelector('#introLogo.in')")
    # the logo, not the old emblem: no ring or star anywhere in the opening
    assert t.page.locator("#intro svg, #intro circle, .intro-ring").count() == 0
    until(t.page, "+getComputedStyle(document.querySelector('#introLogo')).opacity === 1", timeout=4)
    logo = t.page.evaluate(LOGO)
    assert logo["src"].endswith("assets/img/logo.webp"), logo
    assert 120 <= logo["w"] <= 240 and logo["h"] <= height * 0.52, logo            # whole, and leaves room for the line under it
    box = t.page.evaluate("(() => { const r = document.querySelector('.intro-mark').getBoundingClientRect(); return [r.top, r.bottom, r.left, r.right]; })()")
    assert box[0] >= 0 and box[1] <= height and box[2] >= 0 and box[3] <= width, box  # nothing cut off, even on a phone held sideways
    assert t.page.locator("#introName").is_hidden()                                    # the logo already carries the name
    until(t.page, "document.querySelector('#introSub.in')", timeout=5)
    assert t.page.inner_text("#introSub").strip()
    # it closes by itself and the shop appears
    until(t.page, "!document.querySelector('#intro')", timeout=8)
    t.page.wait_for_selector(".hero h1")
    assert not t.errors, t.errors


def test_logo_is_there_before_the_site_scripts_and_skip_works_at_once(tab, stk):
    t = tab(width=390, height=844, intro=True)
    late_site(t, 4)
    t.page.goto(f"{stk['site']}/index.html", wait_until="commit")
    until(t.page, "document.querySelector('#introLogo.in')", timeout=3)
    time.sleep(2.0)                                                                         # the logo has fully risen
    assert t.page.evaluate("!document.querySelector('#intro').hasAttribute('data-live')")   # the site's script has not run yet
    assert t.page.evaluate(LOGO)["op"] == 1
    t.page.click("#introSkip")
    assert t.page.evaluate("getComputedStyle(document.querySelector('#intro')).display") == "none"
    # when the site's script arrives it does not bring the opening back, and the page works
    until(t.page, "!document.querySelector('#intro') && document.querySelector('.hero h1')", timeout=10)
    t.page.click("#menuBtn")
    t.page.wait_for_selector("#menu.open")
    assert not t.errors, t.errors


def test_skip_closes_the_opening_once_the_site_runs(tab, stk):
    t = tab(width=390, height=844, intro=True)
    t.page.goto(f"{stk['site']}/index.html")
    until(t.page, "document.querySelector('#intro[data-live]')")
    t.page.click("#introSkip")
    until(t.page, "!document.querySelector('#intro')", timeout=2)
    t.page.wait_for_selector(".hero h1")
    assert not t.errors, t.errors


def test_opening_never_flashes_on_later_pages(tab, stk):
    t = tab(width=390, height=844, intro=True)
    t.page.goto(f"{stk['site']}/index.html")
    until(t.page, "!document.querySelector('#intro')", timeout=10)
    # the next page, looked at before its scripts run: the opening is already hidden
    t.ctx.route(re.compile(r".*/assets/js/site\.js$"), lambda r: r.fulfill(content_type="text/javascript", body=""))
    t.page.goto(f"{stk['site']}/index.html?next=1#/shop")
    assert t.page.evaluate("getComputedStyle(document.querySelector('#intro')).display") == "none"
    assert not t.errors, t.errors


def test_owner_logo_takes_the_place_of_the_built_in_one(tab, stk, settings):
    settings("brand", "logo", "assets/img/logo-mark.webp")
    t = tab(width=390, height=844, intro=True)
    t.page.goto(f"{stk['site']}/index.html")
    until(t.page, "document.querySelector('#introLogo').getAttribute('src') === 'assets/img/logo-mark.webp'", timeout=6)
    assert "logo-mark.webp" in t.page.evaluate("document.querySelector('#introGleam').style.maskImage || document.querySelector('#introGleam').style.webkitMaskImage")
    assert not t.errors, t.errors


def test_missing_logo_picture_shows_the_name_instead(tab, stk):
    t = tab(width=390, height=844, intro=True)
    t.ctx.route(re.compile(r".*/assets/img/logo\.webp$"), lambda r: r.fulfill(status=404, body=""))
    t.page.goto(f"{stk['site']}/index.html", wait_until="commit")
    until(t.page, "document.querySelector('#introName') && !document.querySelector('#introName').hidden", timeout=5)
    assert t.page.evaluate("getComputedStyle(document.querySelector('.intro-logo-box')).display") == "none"   # no broken picture
    assert t.page.inner_text("#introName").strip()
    until(t.page, "!document.querySelector('#intro')", timeout=8)
    assert not t.errors, t.errors


def test_video_that_cannot_play_falls_back_to_the_logo(tab, stk, settings):
    settings("intro", "video", "https://video.example/opening.mp4")
    t = tab(width=390, height=844, intro=True)
    t.ctx.route("https://video.example/**", lambda r: r.fulfill(status=404, body=""))
    t.page.goto(f"{stk['site']}/index.html")
    until(t.page, "document.querySelector('#intro[data-live]')")
    until(t.page, "!document.querySelector('#intro video')", timeout=4)                        # the video gave up
    assert not t.page.evaluate("document.querySelector('#intro').classList.contains('is-video')")
    assert t.page.evaluate(LOGO)["in"]
    assert t.page.locator(".intro-mark").is_visible()
    until(t.page, "!document.querySelector('#intro')", timeout=8)
    assert not t.errors, t.errors


def test_reduced_motion_opening_is_short_and_still(tab, stk):
    t = tab(width=390, height=844, intro=True, reduced_motion="reduce")
    t.page.goto(f"{stk['site']}/index.html", wait_until="commit")
    until(t.page, "document.querySelector('#introLogo.in')")
    assert t.page.evaluate("getComputedStyle(document.querySelector('#introGleam')).display") == "none"
    start = time.time()
    until(t.page, "!document.querySelector('#intro')", timeout=5)
    assert time.time() - start < 3.5
    assert not t.errors, t.errors
