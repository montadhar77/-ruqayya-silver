import os
import sys
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parents[1] / "db"))
import stack  # noqa: E402

CHROME = os.environ.get("RQ_CHROME", "/usr/bin/google-chrome")
SHOTS = Path(os.environ.get("RQ_SHOTS", "/tmp/rq_shots"))

# Layout problems that would be visible to a customer (ported from the QA sweep).
LAYOUT_CHECK = """() => {
  const W = document.documentElement.clientWidth, out = [];
  if (document.documentElement.scrollWidth > W + 1) out.push('page scrolls sideways: ' + document.documentElement.scrollWidth + ' > ' + W);
  const vis = (el) => { const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && el.offsetParent !== null; };
  document.querySelectorAll('#app h1,#app h2,#app h3,#app h4,#app p,#app .btn,#app .price,#app .chip,#app label,.nav .brand,.modal .btn').forEach((el) => {
    if (!vis(el)) return;
    if (el.closest('.room-track,.topbar,.band,.seg,.g-thumbs,.show-card,.intro')) return;
    const b = el.getBoundingClientRect();
    if (b.width && (b.right > W + 1 || b.left < -1)) out.push('off-screen: ' + el.tagName + '.' + el.className + ' "' + (el.textContent || '').trim().slice(0, 30) + '"');
    if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible') {
      const rg = document.createRange(); rg.selectNodeContents(el); const tb = rg.getBoundingClientRect();
      if (tb.width && (tb.left < b.left - 1 || tb.right > b.right + 1)) out.push('clipped text: ' + el.tagName + ' "' + el.textContent.trim().slice(0, 30) + '"');
    }
  });
  document.querySelectorAll('img').forEach((im) => { if (im.complete && im.naturalWidth === 0 && vis(im) && !/example\\.invalid/.test(im.src)) out.push('broken image: ' + im.src.slice(0, 80)); });
  return out;
}"""


FAKE_TURNSTILE = """
window.turnstile = {
  render(el, o) { el.setAttribute('data-ts', o.sitekey); setTimeout(() => o.callback('XXXX.DUMMY.TOKEN.' + Math.random().toString(36).slice(2)), 60); return 'w' + Math.random(); },
  reset() {}, remove() {}
};
(function () { var m = /onload=([\\w$]+)/.exec(document.currentScript && document.currentScript.src || ''); if (m && window[m[1]]) window[m[1]](); })();
"""


@pytest.fixture(scope="session")
def stk():
    s = stack.start()
    yield s
    stack.stop()


@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        yield b
        b.close()


class Page:
    """A browser tab pointed at the local stack, collecting JS errors."""

    def __init__(self, browser, width=1366, height=860, theme="dark", intro=False, gateway=None, locale="ar-IQ"):
        mobile = width < 700
        # the site opens in the device language (English, Urdu, German, else Arabic): tests choose it
        self.ctx = browser.new_context(viewport={"width": width, "height": height}, is_mobile=mobile, has_touch=mobile,
                                       device_scale_factor=2 if mobile else 1, locale=locale)
        self.ctx.add_init_script(
            "try{sessionStorage.setItem('rq_backend','local');localStorage.setItem('rq_theme','%s');%s}catch(e){}"
            % (theme, ("" if intro else "sessionStorage.setItem('rq_intro','1');")
               + (f"sessionStorage.setItem('rq_gateway','{gateway}');" if gateway else "")))
        self.ctx.route("**/fonts.g*/**", lambda r: r.abort())
        # offline stand-in for Cloudflare's Turnstile script (behaves like the public test key: always passes)
        self.ctx.route("https://challenges.cloudflare.com/**", lambda r: r.fulfill(content_type="text/javascript", body=FAKE_TURNSTILE))
        self.page = self.ctx.new_page()
        self.errors: list[str] = []
        self.page.on("pageerror", lambda e: self.errors.append(f"JS ERROR {e}"))
        self.page.on("console", lambda m: self.errors.append(f"console {m.type}: {m.text[:200]}")
                     if m.type == "error" and "net::ERR_FAILED" not in m.text and "fonts.g" not in m.text
                     and "GL Driver" not in m.text and "Failed to load resource" not in m.text else None)

    def layout_problems(self):
        return self.page.evaluate(LAYOUT_CHECK)

    def close(self):
        self.ctx.close()


@pytest.fixture
def tab(browser, stk):
    pages = []

    def make(**kw):
        p = Page(browser, **kw)
        pages.append(p)
        return p
    yield make
    for p in pages:
        p.close()
