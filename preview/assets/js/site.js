/* =========================================================================
   معرض رقية (عليها السلام) — public site
   Data: Supabase (settings, categories, products, place_order, inquiries)
   Motion: GSAP + ScrollTrigger (respects "reduce motion")
   ========================================================================= */
(() => {
  "use strict";
  const A = window.RQ_ART;
  const cfg = window.RQ_CONFIG;
  // language (picked in boot.js): Arabic, English, Urdu or German — see i18n.js
  const I18N = window.RQ_I18N;
  const L = I18N && I18N.langs[window.RQ_LANG] ? window.RQ_LANG : "ar";
  const LANG = I18N ? I18N.langs[L] : { dir: "rtl", locale: "ar-IQ" };
  const LTR = LANG.dir === "ltr";
  const DA = L === "ar" ? "" : ' dir="auto"';      // product names may stay Arabic in another language
  if (LTR) { const l = A.ui.arrowL; A.ui.arrowL = A.ui.arrowR; A.ui.arrowR = l; A.ui.arrow = A.ui.arrow.replace("<svg ", '<svg style="transform:scaleX(-1)" '); }
  // The public site only reads the catalogue, places orders and sends messages,
  // so it talks to the database REST API directly (no 218 KB client library).
  async function api(path, opts = {}) {
    try {
      const r = await fetch(`${cfg.url}/rest/v1/${path}`, { ...opts, headers: { apikey: cfg.key, "Content-Type": "application/json", Accept: "application/json", ...(opts.headers || {}) } });
      const txt = await r.text();
      let data = null; try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = null; }
      return r.ok ? { data, error: null } : { data: null, error: { ...(data || { message: r.statusText || "request_failed" }), status: r.status } };
    } catch (e) { return { data: null, error: { message: String(e && e.message || e), network: true } }; }
  }
  // Protected path (cfg.gateway === "edge"): Edge Functions with Cloudflare Turnstile + rate limits.
  async function edge(name, body) {
    try {
      const r = await fetch(`${cfg.url}/functions/v1/${name}`, { method: "POST", headers: { apikey: cfg.key, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      let data = null; try { data = await r.json(); } catch (e) { data = null; }
      return r.ok ? { data, error: null } : { data: null, error: { message: (data && (data.error || data.message)) || r.statusText || "request_failed", status: r.status } };
    } catch (e) { return { data: null, error: { message: String(e && e.message || e), network: true } }; }
  }
  // Cloudflare Turnstile, loaded only when a form is used. "interaction-only": invisible unless Cloudflare needs a click.
  let tsLib = null;
  const loadTurnstile = () => tsLib || (tsLib = new Promise((res) => {
    if (!cfg.turnstile) return res(null);
    window.rqTurnstileReady = () => res(window.turnstile || null);
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=rqTurnstileReady";
    s.async = true; s.onerror = () => res(null);
    document.head.appendChild(s);
    setTimeout(() => res(window.turnstile || null), 12000);
  }));
  function humanCheck(holder, action) {
    let token = "", widget = null, waiters = [];
    const settle = (t) => { token = t || ""; waiters.splice(0).forEach((w) => w(token)); };
    const ready = loadTurnstile().then((ts) => {
      if (!ts || !holder.isConnected) return null;
      widget = ts.render(holder, { sitekey: cfg.turnstile, action, appearance: "interaction-only", language: L,
        theme: document.documentElement.dataset.theme === "light" ? "light" : "dark",
        callback: settle, "expired-callback": () => settle(""), "error-callback": () => { settle(""); return true; } });
      return ts;
    });
    return {
      // current token (waits up to 10 s for Cloudflare); "" when Turnstile is off or unavailable
      async get() {
        const ts = await ready; if (!ts) return "";
        if (token) return token;
        return new Promise((r) => { waiters.push(r); setTimeout(() => r(token), 10000); });
      },
      async reset() { const ts = await ready; token = ""; if (ts && widget !== null) try { ts.reset(widget); } catch (e) { /* gone */ } }
    };
  }
  const HONEYPOT = `<div class="hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>`;

  const db = {
    rpc: (fn, args) => api(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) }),
    insert: (table, row) => api(table, { method: "POST", body: JSON.stringify(row), headers: { Prefer: "return=minimal" } })
  };
  /* Read-only catalogue calls go out as GET so a CDN can cache them. On Cloudflare Pages
     they use the site's own cached proxy (cfg.api, functions/api/rpc); anywhere else, or if
     that proxy is not deployed, they go straight to the database API. */
  let proxyMissing = false;
  // the owner just saved something in the dashboard (same browser): skip the cache for a while
  const FRESH_MS = 10 * 60 * 1000;
  const ownerJustSaved = () => safeLS(() => Date.now() - Number(localStorage.getItem("rq_fresh") || 0) < FRESH_MS, false);
  async function rpcGet(fn, args = {}) {
    const qs = new URLSearchParams();
    Object.entries(args).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== "") qs.set(k, String(v)); });
    const tail = fn + (qs.toString() ? "?" + qs : "");
    if (cfg.api && !proxyMissing && !ownerJustSaved()) {
      try {
        const r = await fetch(`${cfg.api}/${tail}`, { headers: { Accept: "application/json" } });
        if (r.headers.get("x-rq-proxy")) {
          const data = await r.json().catch(() => null);
          if (r.ok) return { data, error: null };
          if (r.status < 500) return { data: null, error: { ...(data || {}), message: (data && data.message) || r.statusText, status: r.status } };
        } else proxyMissing = true;   // not this site's proxy (e.g. a host without functions)
      } catch (e) { /* proxy unreachable: ask the database directly */ }
    }
    return api(`rpc/${tail}`);
  }

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const G = window.gsap && !reduce ? window.gsap : null;
  if (window.gsap && window.ScrollTrigger) window.gsap.registerPlugin(window.ScrollTrigger);
  if (!G) document.documentElement.classList.remove("js");

  const app = $("#app");
  const LOGO_FULL = "assets/img/logo.webp", LOGO_MARK = "assets/img/logo-mark.webp";
  const state = {
    s: window.rqMerge(window.RQ_DEFAULTS, {}),
    cats: [],
    prods: [],
    ready: false,
    cart: readCart(),
    view: "",
    sig: ""
  };

  /* ---------- helpers ---------- */
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const toLatin = (t) => String(t ?? "").replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
  const num = (n) => Number(n || 0).toLocaleString(LANG.locale);
  const plural = (n) => { try { return new Intl.PluralRules(L).select(Number(n) || 0); } catch (e) { return Number(n) === 1 ? "one" : "other"; } };
  // "N pieces" — Arabic number agreement: قطعة واحدة · قطعتان · ٣–١٠ قطع · ١١+ قطعة
  const pieces = (n) => {
    n = Number(n) || 0;
    if (L !== "ar") return uiRaw(plural(n) === "one" ? "pieces_one" : "pieces_other", { n: num(n) });
    const r = n % 100; return n === 1 ? "قطعة واحدة" : n === 2 ? "قطعتان" : `${num(n)} ${r >= 3 && r <= 10 ? "قطع" : "قطعة"}`;
  };
  const money = (n) => `${num(n)} ${esc(state.s.shop.currency || "د.ع")}`;
  // interface text from the dashboard («نصوص الموقع»); empty falls back to the default, {x} placeholders are filled in
  const builtInUi = (k) => (I18N && L !== "ar" && I18N.text[L] && I18N.text[L].ui[k]) || "";
  const uiRaw = (k, vars) => {
    let v = ((state.s && state.s.ui) || {})[k];
    if (v == null || v === "") v = builtInUi(k) || ((window.RQ_DEFAULTS.ui || {})[k] ?? "");
    return vars ? String(v).replace(/\{(\w+)\}/g, (m, n) => (n in vars ? vars[n] : m)) : String(v);
  };
  const ui = (k, vars) => esc(uiRaw(k, vars));
  // counted text: "{n} products" / "{n} product" in languages with a singular form.
  // Arabic counts agree with the number (منتج واحد · منتجان · ٣ منتجات · ١١ منتجاً · ١٠٠ منتج)
  // unless the owner wrote his own wording for that text in the dashboard.
  const AR_COUNT = {
    shop_count: { zero: "لا منتجات", one: "منتج واحد", two: "منتجان", few: "{n} منتجات", many: "{n} منتجاً", other: "{n} منتج" },
    search_results: { zero: "لا نتائج", one: "نتيجة واحدة", two: "نتيجتان", few: "{n} نتائج", many: "{n} نتيجة", other: "{n} نتيجة" }
  };
  const arCat = (n) => { n = Math.abs(Math.trunc(Number(n) || 0)); const r = n % 100;
    return n === 0 ? "zero" : n === 1 ? "one" : n === 2 ? "two" : r >= 3 && r <= 10 ? "few" : r >= 11 ? "many" : "other"; };
  const uiN = (k, n, vars = {}) => {
    const own = ((state.s && state.s.ui) || {})[k];
    if (L === "ar" && AR_COUNT[k] && (!own || own === (window.RQ_DEFAULTS.ui || {})[k])) return esc(AR_COUNT[k][arCat(n)].replace("{n}", num(n)));
    const one = L !== "ar" && plural(n) === "one" && (((state.s && state.s.ui) || {})[k + "_one"] || builtInUi(k + "_one"));
    return ui(one ? k + "_one" : k, { n: num(n), ...vars });
  };
  const place = (name) => (I18N ? I18N.place(name, L, state.raw) : name);
  const waNumber = (p) => {
    let d = toLatin(p).replace(/\D/g, "");
    if (!d) return "";
    if (d.startsWith("00")) d = d.slice(2);
    if (d.startsWith("0")) d = "964" + d.slice(1);
    else if (d.length === 10 && d.startsWith("7")) d = "964" + d;
    return d;
  };
  const waLink = (text) => {
    const n = waNumber(state.s.contact.whatsapp || state.s.contact.phone);
    return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : "";
  };
  // links typed in the dashboard: only web, mail, phone and in-site links are ever rendered
  const safeUrl = (u) => {
    const v = String(u || "").trim();
    return /^(https?:\/\/|mailto:|tel:|#|\/(?!\/))/i.test(v) ? v : "";
  };
  const isAr = (t) => /[\u0600-\u06FF]/.test(t || "");
  /* Products and departments in the visitor's language: their own translation (written in
     the dashboard), else the dictionary for stones/metals/badges, else the Arabic text.
     The Arabic row stays in _src (search, and the drawings that read Arabic stone names). */
  const tr = (o, f) => { const v = o && o.i18n && o.i18n[L] && o.i18n[L][f]; return typeof v === "string" && v.trim() ? v.trim() : ""; };
  function locProd(p) {
    if (L === "ar" || !p || p._src) return p;
    return { ...p, _src: p, name: tr(p, "name") || p.name, description: tr(p, "description") || p.description,
      stone: tr(p, "stone") || I18N.term(p.stone, L), metal: tr(p, "metal") || I18N.term(p.metal, L), badge: tr(p, "badge") || I18N.term(p.badge, L),
      weight: tr(p, "weight") || I18N.measure(p.weight, L), size: tr(p, "size") || I18N.measure(p.size, L) };
  }
  function locCat(c) {
    if (L === "ar" || !c || c._src) return c;
    return { ...c, _src: c, name: tr(c, "name") || c.name, subtitle: tr(c, "subtitle") || c.subtitle };
  }
  const eyebrow = (t, attrs = "") => t ? `<span class="${isAr(t) ? "eyebrow" : "latin"}" ${attrs}>${esc(t)}</span>` : "";
  const catOf = (p) => state.cats.find((c) => c.id === p.category_id);
  const iconOf = (p) => (catOf(p) || {}).icon || "star";
  const artOf = (p) => A.productArt(p._src || p, iconOf(p));
  // products fetched page by page (large catalogues) are remembered here for the cart and links
  const known = new Map();
  const remember = (p) => { if (p && p.id) { p = locProd(p); known.set(p.id, p); } return p; };
  const findProd = (id) => state.prods.find((p) => p.id === id) || known.get(id);
  // whole catalogue in the browser (up to CAT_LIMIT products, as before) or counted on the server
  const countAll = () => (state.complete ? state.prods.length : state.total);
  const subsOf = (id) => (state.subs || []).filter((s) => s.parent_id === id);
  const subOf = (p) => (p && p.subcategory_id ? (state.subs || []).find((s) => s.id === p.subcategory_id) : null);
  const countSub = (id) => {
    if (state.complete) return state.prods.filter((p) => p.subcategory_id === id).length;
    const s = (state.subs || []).find((x) => x.id === id);
    return s && Number.isFinite(s.count) ? s.count : 0;
  };
  const countCat = (id) => {
    if (state.complete) return state.prods.filter((p) => p.category_id === id).length;
    const c = state.cats.find((x) => x.id === id);
    return c && Number.isFinite(c.count) ? c.count : state.prods.filter((p) => p.category_id === id).length;
  };
  const inStock = (p) => p.stock === null || p.stock === undefined || p.stock > 0;
  let toastT;
  /* The floating WhatsApp button never sits on top of text or of anything you can press:
     whenever the page settles (after a scroll, a resize, a new page), it looks at what is
     under it and steps aside (slides down out of sight) if a word, a button or a field is
     there, coming back as soon as the spot under it is clear. */
  let fabT = 0;
  const caretAt = (x, y) => {
    if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
    const c = document.caretPositionFromPoint && document.caretPositionFromPoint(x, y);
    if (!c || !c.offsetNode) return null;
    const r = document.createRange(); r.setStart(c.offsetNode, c.offset); return r;
  };
  function fabCheck() {
    clearTimeout(fabT);
    fabT = setTimeout(() => {
      const wa = $("#waFloat");
      if (!wa || wa.hidden) return;
      const x0 = wa.offsetLeft, y0 = wa.offsetTop, w = wa.offsetWidth, h = wa.offsetHeight, pad = 6;
      if (!w) return;
      const prev = wa.style.visibility; wa.style.visibility = "hidden";
      let covered = !!$(".drawer.open, .modal-bg.open, .search-bg.open");
      for (let i = 0; i <= 2 && !covered; i++) for (let j = 0; j <= 2 && !covered; j++) {
        const x = x0 - pad + ((w + pad * 2) * i) / 2, y = y0 - pad + ((h + pad * 2) * j) / 2;
        if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
        const el = document.elementFromPoint(x, y);
        if (!el) continue;
        if (el.closest("a, button, input, select, textarea, label, [role='button'], .chip")) { covered = true; break; }
        const r = caretAt(x, y);
        const n = r && r.startContainer;
        if (n && n.nodeType === 3 && n.textContent.trim()) {
          const rg = document.createRange(), k = Math.min(r.startOffset, n.length - 1);
          rg.setStart(n, Math.max(0, k)); rg.setEnd(n, Math.max(0, k) + 1);
          for (const b of rg.getClientRects()) if (x >= b.left - pad && x <= b.right + pad && y >= b.top - pad && y <= b.bottom + pad) covered = true;
          // any line of the same text block running under the button
          const blk = n.parentElement && n.parentElement.closest("p, h1, h2, h3, h4, li, dd, dt, span, div");
          if (!covered && blk) {
            const all = document.createRange(); all.selectNodeContents(blk);
            for (const b of all.getClientRects()) if (x >= b.left && x <= b.right && y >= b.top - 2 && y <= b.bottom + 2) { covered = true; break; }
          }
        }
      }
      wa.style.visibility = prev;
      wa.classList.toggle("away", covered);
    }, 140);
  }
  addEventListener("scroll", fabCheck, { passive: true });
  addEventListener("resize", fabCheck, { passive: true });

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    // with the cart, menu or order form open, the message shows at the top, clear of their buttons
    t.classList.toggle("at-top", !!$(".drawer.open, .modal-bg.open"));
    t.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("show"), 2400);
  }
  function lock(on) {
    fabCheck();
    const locked = on || !!$(".drawer.open, .modal-bg.open, .search-bg.open");
    document.body.classList.toggle("locked", locked);
    if (lenis) { if (locked) lenis.stop(); else lenis.start(); }
  }
  function safeLS(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }

  /* ---------- data ---------- */
  const CAT_LIMIT = 60;   // up to this many products the whole catalogue is loaded at once (as before)
  const PAGE = 24;        // larger catalogues: products per page in the shop
  function applyData(settings, cats, prods, meta = {}) {
    state.raw = settings || {};
    state.s = I18N ? I18N.localize(state.raw, L) : window.rqMerge(window.RQ_DEFAULTS, window.rqCleanColours(state.raw));
    // departments, and the sub-departments inside them (e.g. men's rings → agate rings)
    state.cats = (cats || []).filter((c) => !c.parent_id).map(locCat);
    state.subs = (cats || []).filter((c) => c.parent_id).sort((a, b) => (a.sort || 0) - (b.sort || 0)).map(locCat);
    state.prods = (prods || []).map(locProd);
    state.total = Number.isFinite(meta.total) ? meta.total : state.prods.length;
    state.complete = meta.complete !== false;
  }
  async function fetchAll() {
    if (!state.legacy) {
      // one call: settings + departments (with counts) + the first products
      const r = await rpcGet("catalog_home", { p_limit: CAT_LIMIT });
      if (!r.error && r.data && Array.isArray(r.data.prods)) {
        return { settings: r.data.settings || {}, cats: r.data.cats || [], prods: r.data.prods, total: r.data.total, complete: r.data.complete !== false };
      }
      if (!(r.error && (r.error.code === "PGRST202" || r.error.status === 404))) throw r.error || new Error("catalog_unavailable");
      state.legacy = true;   // database not upgraded yet: the original three queries
    }
    const [s, c, p] = await Promise.all([
      api("settings?select=data&id=eq.1"),
      api("categories?select=*&active=eq.true&order=sort.asc,created_at.asc"),
      api("products?select=*&active=eq.true&order=sort.asc,created_at.desc")
    ]);
    if (s.error || c.error || p.error) throw s.error || c.error || p.error;
    const row = Array.isArray(s.data) ? s.data[0] : s.data;
    const prods = Array.isArray(p.data) ? p.data : [];
    return { settings: (row && row.data) || {}, cats: Array.isArray(c.data) ? c.data : [], prods, total: prods.length, complete: true };
  }
  async function fetchWithRetry(tries) {
    let wait = 700, last;
    for (let i = 0; i < tries; i++) {
      try { return await fetchAll(); } catch (e) { last = e; if (i < tries - 1) { await new Promise((r) => setTimeout(r, wait)); wait *= 2; } }
    }
    throw last;
  }
  async function load() {
    const cached = safeLS(() => JSON.parse(localStorage.getItem("rq_cache") || "null"), null);
    if (cached) { applyData(cached.settings, cached.cats, cached.prods, cached); state.sig = JSON.stringify(cached); state.ready = true; }
    try {
      const fresh = await fetchWithRetry(cached ? 2 : 4);
      state.offline = false;
      const sig = JSON.stringify(fresh);
      safeLS(() => localStorage.setItem("rq_cache", sig));
      const changed = sig !== state.sig;
      applyData(fresh.settings, fresh.cats, fresh.prods, fresh);
      state.sig = sig;
      state.ready = true;
      return changed;
    } catch (e) {
      console.warn("Could not load data", e);
      state.offline = !cached;
      state.ready = true;
      return !cached;
    }
  }
  // shown only when the shop could not be reached and nothing was saved from an earlier visit
  function offlineNote() {
    if (!state.offline || $("#netNote")) return;
    app.insertAdjacentHTML("afterbegin", `<div class="wrap net-note" id="netNote" role="alert"><div class="glass">
      <span>${ui("net_down")}</span><button class="btn glass-btn" type="button" id="netRetry">${ui("net_retry")}</button></div></div>`);
    $("#netRetry").addEventListener("click", retryLoad);
  }
  let retrying = false;
  async function retryLoad() {
    if (retrying) return; retrying = true;
    const b = $("#netRetry"); if (b) { b.disabled = true; b.textContent = uiRaw("net_retrying"); }
    const changed = await load();
    retrying = false;
    if (!state.offline) { applySettings(); render(); updateCartCount(); ensureCartProducts().catch(() => {}); }
    else if (b) { b.disabled = false; b.textContent = uiRaw("net_retry"); }
    return changed;
  }
  addEventListener("online", () => { if (state.offline) retryLoad(); });

  /* ---------- error reports (no personal data; the database rate-limits them) ---------- */
  let reported = 0;
  const seenErr = new Set();
  function report(message, source) {
    const m = String(message || "").slice(0, 300);
    if (!m || reported >= 5 || seenErr.has(m) || /ResizeObserver loop|Script error\.?$/.test(m)) return;
    seenErr.add(m); reported++;
    db.rpc("log_client_error", { p_page: location.hash.slice(0, 120) || "/", p_message: m, p_source: String(source || "").slice(0, 200) }).catch(() => {});
  }
  addEventListener("error", (e) => {
    const f = e.filename || "";
    if (f && !f.startsWith(location.origin)) return;     // browser extensions, third-party scripts
    report(e.message, f ? `${f.replace(location.origin, "")}:${e.lineno}:${e.colno}` : "");
  });
  addEventListener("unhandledrejection", (e) => report(e.reason && (e.reason.message || e.reason), "promise"));

  /* ---------- light / dark ---------- */
  function resolveMode(m) { return m === "light" ? "light" : m === "system" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : "dark"; }
  function syncThemeMeta() {
    const cs = getComputedStyle(document.documentElement);
    const tc = $('meta[name="theme-color"]'); if (tc) tc.setAttribute("content", cs.getPropertyValue("--deep").trim());
  }
  function setTheme(mode, save) {
    const was = document.documentElement.getAttribute("data-theme");
    document.documentElement.setAttribute("data-theme", mode);
    if (save) safeLS(() => localStorage.setItem("rq_theme", mode));
    syncThemeMeta();
    if (was !== mode && $("#globe")) startGlobe();
  }
  function toggleTheme(e) {
    const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    if (!document.startViewTransition || reduce) { setTheme(next, true); return; }
    const r = e.currentTarget.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(() => setTheme(next, true));
    vt.ready.then(() => document.documentElement.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] }, { duration: 750, easing: "cubic-bezier(.22,1,.36,1)", pseudoElement: "::view-transition-new(root)" })).catch(() => {});
  }

  /* ---------- settings → page ---------- */
  function applySettings() {
    const s = state.s, t = s.theme, tl = s.theme_light || {};
    const keys = ["pearl", "paper", "emerald", "deep", "silver", "accent", "ink"];
    const ok = (v) => /^#[0-9a-f]{3,8}$/i.test(v || "");
    let tv = $("#themeVars"); if (!tv) { tv = document.createElement("style"); tv.id = "themeVars"; document.head.appendChild(tv); }
    tv.textContent = `:root{${keys.filter((k) => ok(t[k])).map((k) => `--${k}:${t[k]}`).join(";")}}` +
      `:root[data-theme="light"]{${keys.filter((k) => ok(tl[k])).map((k) => `--${k}:${tl[k]}`).join(";")}}`;
    document.body.classList.toggle("no-aurora", t.floral === false);
    embroidery();
    if (!safeLS(() => localStorage.getItem("rq_theme"), null)) setTheme(resolveMode(t.mode), false);
    document.title = s.seo.title || s.brand.full;
    const md = $('meta[name="description"]'); if (md) md.setAttribute("content", s.seo.description || "");
    syncThemeMeta();
    if (s.brand.favicon) $("#favicon").href = s.brand.favicon;

    // brand
    const logo = $("#brandLogo");
    logo.src = s.brand.logo || LOGO_MARK; logo.alt = uiRaw("a11y_logo", { brand: s.brand.full }); logo.hidden = false;
    $("#brandName").textContent = s.brand.name;
    $("#brandSub").textContent = s.brand.sub || s.brand.tagline;
    $$("[data-t]").forEach((el) => { el.textContent = uiRaw(el.dataset.t); });
    $$("[data-t-ph]").forEach((el) => { el.placeholder = uiRaw(el.dataset.tPh); });
    $$("[data-t-aria]").forEach((el) => { el.setAttribute("aria-label", uiRaw(el.dataset.tAria)); });
    langMenu();

    // announcement: a single still line (no scrolling text)
    const items = (s.announcement.items || []).filter(Boolean);
    const tb = $("#topbar");
    if (s.announcement.enabled && items.length) { $("#topTrack").textContent = items[0]; tb.hidden = false; } else tb.hidden = true;

    // whatsapp float
    const wa = $("#waFloat"), wl = waLink(uiRaw("wa_inquiry", { brand: s.brand.full }));
    if (wl) { wa.href = wl; wa.innerHTML = A.ui.whatsapp; wa.hidden = false; } else wa.hidden = true;
    fabCheck();

    // mobile menu
    $("#menuList").innerHTML = `<div class="lang-row" role="group" aria-label="${ui("lang_label")}">${langLinks("chip")}</div>` +
      `<button class="menu-theme theme-btn" type="button" data-theme-toggle>${A.ui.sun.replace("<svg ", '<svg class="i-sun" ')}${A.ui.moon.replace("<svg ", '<svg class="i-moon" ')}<span>${ui("theme_toggle")}</span></button>` +
      `<a href="#/">${ui("nav_home")} <small>${A.ui.arrowL}</small></a><a href="#/shop">${ui("menu_all")} <small>${num(countAll())}</small></a>` +
      state.cats.map((c) => `<a href="#/c/${esc(c.slug)}">${esc(c.name)} <small>${num(countCat(c.id))}</small></a>`).join("") +
      `<a href="#/?to=visit">${ui("nav_contact")} <small>${A.ui.arrowL}</small></a>`;
    $$("#menuList small svg").forEach((sv) => { sv.style.width = "18px"; });
    $("#menuList [data-theme-toggle]").addEventListener("click", toggleTheme);   // phones: the bar shows the language button instead

    renderFooter();
  }

  /* ---------- language switch: a link per language (the page reloads in that language) ---------- */
  const langHref = (code) => { const u = new URL(location.href); u.searchParams.set("lang", code); return u.pathname + u.search + u.hash; };
  const langLinks = (cls) => (I18N ? I18N.order : []).map((c) => `<a class="${cls}${c === L ? " on" : ""}" href="${esc(langHref(c))}" hreflang="${c}" lang="${c}" dir="${I18N.langs[c].dir}" data-lang="${c}"${c === L ? ' aria-current="true"' : ""}>${esc(I18N.langs[c].name)}</a>`).join("");
  const GLOBE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9M12 3C9.4 5.6 8.1 8.6 8.1 12s1.3 6.4 3.9 9"/></svg>';
  function langMenu() {
    const btn = $("#langBtn"), pop = $("#langPop");
    if (!btn || !I18N) return;
    btn.innerHTML = `${GLOBE}<span class="lang-code" aria-hidden="true">${esc(LANG.short)}</span>`;
    btn.setAttribute("aria-label", `${uiRaw("lang_label")}: ${LANG.name}`);
    pop.innerHTML = langLinks("lang-opt");
    // search engines: the same page in every language
    if (!$('link[rel="alternate"][hreflang]')) {
      const base = new URL(location.href); base.hash = ""; base.searchParams.delete("lang");
      [...I18N.order, "x-default"].forEach((c) => {
        const u = new URL(base.href); if (c !== "x-default") u.searchParams.set("lang", c);
        const l = document.createElement("link"); l.rel = "alternate"; l.hreflang = c; l.href = u.href; document.head.appendChild(l);
      });
    }
  }
  function toggleLangPop(open) {
    const btn = $("#langBtn"), pop = $("#langPop"); if (!btn) return;
    open = open === undefined ? pop.hidden : open;
    pop.hidden = !open; btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) { const cur = $(".lang-opt.on", pop) || $(".lang-opt", pop); if (cur) cur.focus(); }
  }

  function socialLinks(cls = "icon-btn") {
    const c = state.s.contact;
    const map = L === "ar" ? [["instagram", "انستغرام"], ["facebook", "فيسبوك"], ["tiktok", "تيك توك"], ["telegram", "تيليغرام"], ["snapchat", "سناب شات"]]
      : [["instagram", "Instagram"], ["facebook", "Facebook"], ["tiktok", "TikTok"], ["telegram", "Telegram"], ["snapchat", "Snapchat"]];
    let out = map.filter(([k]) => safeUrl(c[k])).map(([k, n]) => `<a class="${cls}" href="${esc(safeUrl(c[k]))}" target="_blank" rel="noopener" aria-label="${n}">${A.ui[k]}</a>`).join("");
    const wl = waLink(uiRaw("wa_hello"));
    if (wl) out = `<a class="${cls}" href="${esc(wl)}" target="_blank" rel="noopener" aria-label="${ui("lbl_whatsapp")}">${A.ui.whatsapp}</a>` + out;
    return out;
  }

  function renderFooter() {
    const s = state.s;
    $("#footer").innerHTML = `<div class="wrap">
      <p class="mark" aria-hidden="true">${esc(s.brand.name)}</p>
      <div class="cols">
        <div><img class="f-logo" src="${esc(s.brand.logo || LOGO_FULL)}" alt="${esc(s.brand.full)}" loading="lazy"><h4>${esc(s.brand.full)}</h4><p>${esc(s.footer.text)}</p><div class="socials">${socialLinks()}</div></div>
        <div><h4>${ui("footer_departments")}</h4><ul>${state.cats.slice(0, 6).map((c) => `<li><a href="#/c/${esc(c.slug)}">${esc(c.name)}</a></li>`).join("")}</ul></div>
        <div><h4>${ui("footer_contact")}</h4><ul>
          ${s.contact.address ? `<li>${esc(s.contact.address)}</li>` : ""}
          ${s.contact.phone ? `<li><a href="tel:${esc(toLatin(s.contact.phone).replace(/[^\d+]/g, ""))}" dir="ltr">${esc(s.contact.phone)}</a></li>` : ""}
          ${s.contact.hours ? `<li>${esc(s.contact.hours)}</li>` : ""}
          <li><a href="#/shop">${ui("footer_shop")}</a></li>
        </ul></div>
      </div>
      <nav class="f-langs" aria-label="${ui("lang_label")}">${langLinks("")}</nav>
      <div class="copy">© ${new Date().getFullYear().toLocaleString(LANG.locale, { useGrouping: false })} — ${esc(s.footer.copyright)}</div>
    </div>`;
  }

  /* ---------- intro ---------- */
  function intro() {
    const el = $("#intro");
    if (!el) return Promise.resolve();
    const s = state.s.intro;
    const seen = safeLS(() => sessionStorage.getItem("rq_intro"), null);
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return; done = true;
        safeLS(() => sessionStorage.setItem("rq_intro", "1"));
        if (G) G.to(el, { clipPath: "circle(0% at 50% 50%)", duration: 0.8, ease: "expo.inOut", onComplete: () => el.remove() });
        else el.remove();
        setTimeout(resolve, G ? 320 : 0);
      };
      // boot.js already hid it (seen in this visit, switched off, or skipped before the scripts arrived)
      if (!s.enabled || (seen && !s.every_visit) || document.documentElement.classList.contains("no-intro")) { el.remove(); resolve(); return; }
      el.setAttribute("data-live", "");
      if (G) G.set(el, { clipPath: "circle(150% at 50% 50%)" });
      $("#introSkip").addEventListener("click", finish);
      const max = Math.max(3, Math.min(30, Number(s.max_seconds) || 9)) * 1000;
      if (s.video) {
        // the logo stays on screen until the video really plays, so there is never an empty screen
        const v = document.createElement("video");
        Object.assign(v, { src: s.video, muted: true, playsInline: true, autoplay: true, preload: "auto" });
        v.setAttribute("playsinline", ""); v.setAttribute("muted", "");
        let fell = false;
        const fallback = () => { if (fell) return; fell = true; v.remove(); el.classList.remove("is-video"); logoReveal(finish); };
        v.addEventListener("playing", () => el.classList.add("is-video"), { once: true });
        v.addEventListener("ended", finish);
        v.addEventListener("error", fallback);
        el.prepend(v);
        const p = v.play(); if (p && p.catch) p.catch(fallback);
        setTimeout(finish, max);
        return;
      }
      logoReveal(finish);
      setTimeout(finish, max);
    });
  }
  /* The logo is already on screen (index.html + boot.js start it at the first paint): here the
     shop's own logo from the dashboard takes its place if there is one, the line under it
     appears, and the opening closes about 2.8 s after the logo appeared. */
  function logoReveal(finish) {
    const s = state.s;
    const logo = $("#introLogo"), gleam = $("#introGleam"), name = $("#introName"), sub = $("#introSub");
    name.textContent = s.brand.name;
    sub.textContent = s.intro.subtitle || s.brand.tagline;
    const own = s.brand.logo;
    if (own && logo.getAttribute("src") !== own) {
      const im = new Image();
      im.onload = () => { logo.src = own; gleam.style.webkitMaskImage = gleam.style.maskImage = `url("${own.replace(/"/g, "%22")}")`; };
      im.src = own;
    }
    const shown = new Promise((r) => {
      const on = () => {
        if (!logo.classList.contains("in")) { logo.setAttribute("data-at", String(Math.round(performance.now()))); logo.classList.add("in"); }
        r();
      };
      const failed = () => { logo.parentNode.style.display = "none"; name.hidden = false; r(); };   // the shop's name in its place
      if (logo.classList.contains("in") || (logo.complete && logo.naturalWidth)) on();      // (boot.js normally does this)
      else if (logo.complete) failed();
      else { logo.addEventListener("load", on, { once: true }); logo.addEventListener("error", failed, { once: true }); }
    });
    shown.then(() => {
      const since = performance.now() - (Number(logo.getAttribute("data-at")) || performance.now());
      setTimeout(() => sub.classList.add("in"), Math.max(0, (reduce ? 0 : 1000) - since));
      setTimeout(finish, Math.max(1200, (reduce ? 1500 : 2800) - since));
    });
  }

  /* ---------- small renderers ---------- */
  function media(p) {
    const imgs = (p.images || []).filter(Boolean);
    if (imgs.length) {
      return `<img class="main" ${imgSrc(imgs[0], SZ.card)} alt="${esc(p.name)}" loading="lazy" decoding="async">` +
        (imgs[1] ? `<img class="alt" ${imgSrc(imgs[1], SZ.card)} alt="" loading="lazy" decoding="async">` : "");
    }
    return artOf(p);
  }
  /* Images uploaded from the dashboard exist in three sizes (<name>.v.webp up to 1800 px,
     <name>.v-1080.webp, <name>.v-480.webp): the browser downloads only the size it needs.
     Older images (one size) are used as they are. */
  const VAR = /\.v\.(webp|jpg)$/i;
  const sizedUrl = (u, w) => String(u || "").replace(VAR, `.v-${w}.$1`);
  const SZ = { card: "(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 25vw", half: "(max-width: 900px) 100vw, 50vw", wide: "(max-width: 700px) 92vw, 46vw", room: "(max-width: 700px) 78vw, 30vw" };
  function imgSrc(u, sizes) {
    if (!VAR.test(u || "")) return `src="${esc(u)}"`;
    return `src="${esc(sizedUrl(u, 1080))}" srcset="${esc(sizedUrl(u, 480))} 480w, ${esc(sizedUrl(u, 1080))} 1080w, ${esc(u)} 1800w" sizes="${sizes}"`;
  }
  const smallSrc = (u) => `src="${esc(VAR.test(u || "") ? sizedUrl(u, 480) : u)}"`;
  function priceHTML(p) {
    return `${money(p.price)}${p.old_price && p.old_price > p.price ? `<s>${num(p.old_price)}</s>` : ""}`;
  }
  function card(p) {
    const c = catOf(p);
    const out = !inStock(p);
    return `<article class="card glass spot edge tilt" data-card><span class="glare"></span>
      <div class="ph">${out ? `<span class="tag out">${ui("out_of_stock")}</span>` : p.badge ? `<span class="tag">${esc(p.badge)}</span>` : ""}${media(p)}</div>
      <h4${DA}>${esc(p.name)}</h4>
      <div class="meta">${esc([c && c.name, p.stone || p.metal].filter(Boolean).join(" · "))}</div>
      <div class="row"><span class="price">${priceHTML(p)}</span>
        ${out ? "" : `<button class="add" type="button" data-add="${p.id}" aria-label="${ui("add_to_cart")}: ${esc(p.name)}">${A.ui.plus}</button>`}</div>
      <a class="stretch" href="#/p/${p.id}" aria-label="${esc(p.name)}"></a>
    </article>`;
  }
  function grid(list, empty) {
    return list.length ? `<div class="grid" data-batch>${list.map(card).join("")}</div>` : `<div class="empty">${esc(empty || uiRaw("empty_category"))}</div>`;
  }
  function splitWords(text, wordCls = "") {
    return esc(text).split(/\s+/).filter(Boolean).map((w) => `<span class="wl"><span class="w ${wordCls}">${w}</span></span>`).join(" ");
  }
  function titleBlock(eb, title, text) {
    return `<div class="title">${eb ? `<div data-rv>${eyebrow(eb)}</div>` : ""}
      <h2 data-split>${splitWords(title)}</h2>${text ? `<p data-rv>${esc(text)}</p>` : ""}</div>`;
  }
  const orbitSVG = () => `<svg viewBox="0 0 500 500" aria-hidden="true">
      <circle class="o" cx="250" cy="250" r="246"/><circle class="o" cx="250" cy="250" r="196" stroke-dasharray="2 6"/><circle class="o" cx="250" cy="250" r="150"/></svg>
      <svg class="r1" viewBox="0 0 500 500" aria-hidden="true"><circle class="sat" cx="250" cy="4" r="4"/><circle class="sat gold" cx="496" cy="250" r="3"/></svg>
      <svg class="r2" viewBox="0 0 500 500" aria-hidden="true"><circle class="sat" cx="250" cy="446" r="3"/><circle class="sat" cx="54" cy="250" r="2.5"/></svg>`;

  /* ---------- home ---------- */
  function heroSlides() {
    const s = state.s.hero;
    let slides = (s.slides || []).filter((x) => x && x.image).map((x) => ({ img: x.image, title: x.title, cap: x.caption, link: x.link }));
    if (!slides.length) {
      const withImg = state.prods.filter((p) => p.images && p.images[0]);
      const pool = (withImg.filter((p) => p.featured).length ? withImg.filter((p) => p.featured) : withImg).slice(0, 5);
      slides = pool.map((p) => ({ img: p.images[0], title: p.name, cap: p.stone || p.metal || (catOf(p) || {}).name, link: `#/p/${p.id}` }));
    }
    if (!slides.length) {
      const feat = state.prods.filter((p) => p.featured);
      const pool = (feat.length > 1 ? feat : state.prods).slice(0, 4);
      slides = pool.map((p) => ({ art: artOf(p), title: p.name, cap: [p.stone, p.metal].filter(Boolean).join(" · "), link: `#/p/${p.id}` }));
    }
    if (!slides.length) slides = [{ art: A.depIcon("star"), title: state.s.brand.name, cap: state.s.brand.tagline }];
    return slides;
  }

  /* the hero ornament (dashboard: Identity → "زخرفة الواجهة"): a gold mihrab round the hero
     card — pointed arch, cusps, an eight-pointed star, arabesque vines — with soft white roses
     at its feet and crown, a faint girih star lattice behind, and a few petals falling slowly
     on the card's side. A sprig of roses on the About picture. Purely decorative: aria-hidden,
     never clickable, never over text; still for visitors who prefer reduced motion. */
  // [lane %, seconds to fall, start offset, size, sway direction] — lanes kept to the sides of the card
  const PETALS = [[6, 21, -3, 0.9], [92, 25, -14, 0.75], [30, 19, -9, 1], [72, 24, -2, 0.8], [14, 27, -19, 0.7], [85, 22, -11, 0.85]];
  const bloomsOn = () => state.s.theme.flowers !== false && !!(A.emb);
  function heroBlooms() {
    if (!bloomsOn()) return { back: "", petals: "", cls: "" };
    const E = A.emb;
    return {
      cls: " has-orn",
      back: `<div class="orn" aria-hidden="true"><div class="orn-frame"><div class="orn-in">${E.frame()}</div></div>
        <div class="bloom orn-foot orn-a"><div class="bl-in">${E.bouquet(0)}</div></div><div class="bloom orn-foot orn-b"><div class="bl-in">${E.bouquet(1)}</div></div></div>`,
      petals: `<div class="petals" aria-hidden="true">${PETALS.map(([x, t, d, sc], k) => `<i style="--x:${x}%;--t:${t}s;--d:${d}s;--s:${sc};--r:${k % 2 ? -1 : 1}">${E.fall()}</i>`).join("")}</div>`
    };
  }
  /* the embroidered roses that run through every page: scattered over the background, under
     section titles, along the top of the footer (CSS images made once from art.js) */
  let embDone = false;
  function embroidery() {
    const on = bloomsOn();
    document.documentElement.classList.toggle("emb", on);
    if (!on || embDone) return;
    embDone = true;
    const E = A.emb, st = document.documentElement.style;
    st.setProperty("--emb-scatter", E.scatterTile(0.3));
    st.setProperty("--emb-divider", E.dividerImg());
    st.setProperty("--emb-garland", E.garlandImg());
    st.setProperty("--emb-rose", E.roseImg("white"));
  }

  function renderHome(scrollTo) {
    const s = state.s, sec = s.sections;
    const bl = heroBlooms();
    const slides = heroSlides();
    const stats = (s.hero.stats || []).filter((x) => x && x.value).slice();
    // live counts fill the row, so the hero never repeats the shipping figures shown in the globe section
    const arPlural = (n, few, many) => (n % 100 >= 3 && n % 100 <= 10 ? few : many); // Arabic: 3–10 take the plural, 11+ the singular
    const otherLabel = (k, n) => uiRaw(`${k}_${plural(n) === "one" ? "one" : "other"}`);
    if (state.cats.length && stats.length < 3) stats.push({ value: num(state.cats.length), label: L === "ar" ? arPlural(state.cats.length, "أقسام", "قسماً") + " في المعرض" : otherLabel("stat_depts", state.cats.length) });
    const nAll = countAll();
    if (nAll && stats.length < 3) stats.push({ value: num(nAll), label: L === "ar" ? arPlural(nAll, "قطع", "قطعة") + " في المتجر" : otherLabel("stat_pieces", nAll) });

    const flips = [s.hero.title2, ...((s.hero.flip_more || []).filter(Boolean))].filter(Boolean);
    const line2 = flips.length > 1
      ? `<span class="flip" data-flip>${flips.map((w, k) => `<span class="fw grad${k ? "" : " on"}">${esc(w)}</span>`).join("")}</span>`
      : splitWords(s.hero.title2, "grad");
    let html = `<header class="hero${bl.cls}" id="top"><span class="spotlight s1" aria-hidden="true"></span><span class="spotlight s2" aria-hidden="true"></span>${bl.petals}<div class="wrap hero-grid">
        <div class="hero-txt">
          <div class="pill" data-hero><span class="dot"></span>${esc(s.hero.eyebrow)}</div>
          <h1>${splitWords(s.hero.title1)}<span class="line2">${line2}</span></h1>
          <p class="lead" data-hero>${esc(s.hero.text)}</p>
          <div class="cta" data-hero>
            <a class="btn shine" href="#/shop" data-magnet>${esc(s.hero.cta1)} ${A.ui.arrow}</a>
            <a class="btn glass-btn" href="#/?to=departments" data-magnet>${esc(s.hero.cta2)}</a>
          </div>
          ${stats.length ? `<div class="hero-stats" data-hero>${stats.map((v) => `<div class="glass"><b data-count="${esc(v.value)}">${esc(v.value)}</b><span>${esc(v.label)}</span></div>`).join("")}</div>` : ""}
        </div>
        <div class="showcase${bl.cls ? " with-orn" : ""}" data-show style="--slide-ms:${Math.round((Number(s.hero.slide_seconds) || 5.5) * 1000)}ms">
          <div class="orbit" data-orbit>${orbitSVG()}</div>
          ${bl.back}
          <div class="deck" id="deck" data-tilt>
            ${slides.map((sl, i) => `<a class="deck-card" data-i="${i}" ${safeUrl(sl.link) ? `href="${esc(safeUrl(sl.link))}"` : ""} aria-label="${esc(sl.title || "")}">
              ${slides.length > 1 ? `<span class="deck-no" aria-hidden="true">${String(i + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}</span>` : ""}
              ${sl.img ? `<img ${imgSrc(sl.img, SZ.wide)} alt="${esc(sl.title || "")}" ${i ? 'loading="lazy"' : ""}>` : `<div class="slide-art">${sl.art}</div>`}
              ${sl.title ? `<div class="cap"><b${DA}>${esc(sl.title)}</b>${sl.cap ? `<small>${esc(sl.cap)}</small>` : ""}</div>` : ""}<span class="gloss"></span></a>`).join("")}
          </div>
          ${slides.length > 1 ? `<div class="show-dots">${slides.map((_, i) => `<button type="button" aria-label="${ui("a11y_photo", { n: num(i + 1) })}" data-dot="${i}"></button>`).join("")}</div>` : ""}
        </div>
      </div></header>`;

    if (sec.departments.show && state.cats.length) {
      const n = state.cats.length;
      const w = (4 - ((n + 3) % 4)) % 4, wides = new Set();
      if (w && n > 6) wides.add(5);
      for (let k = n - 1; wides.size < w && k > 0; k--) if (k !== 5) wides.add(k);
      html += `<section class="block" id="departments"><div class="wrap">${titleBlock(sec.departments.eyebrow, sec.departments.title, sec.departments.text)}
        <div class="bento" data-stagger>${state.cats.map((c, i) => {
          const count = countCat(c.id);
          const cls = i === 0 ? "big" : wides.has(i) ? "wide" : "";
          return `<a href="#/c/${esc(c.slug)}" class="tile glass spot edge tilt ${cls}"><span class="glare"></span>
            ${c.image_url ? `<div class="t-img"><img ${imgSrc(c.image_url, SZ.half)} alt="" loading="lazy"></div>` : ""}
            <div class="t-art">${A.depIcon(c.icon)}</div>
            <div class="t-top"><div class="t-ic">${A.depIcon(c.icon)}</div><span class="t-count">${count ? pieces(count) : ui("soon")}</span></div>
            <div><h3>${esc(c.name)}</h3><p>${esc(c.subtitle)}</p></div>
            <span class="t-go">${A.ui.arrowL}</span></a>`;
        }).join("")}</div></div></section>`;
    }

    const fp = findProd(sec.featured.product_id) || state.prods.find((p) => p.featured && p.badge) || state.prods.find((p) => p.featured) || state.prods[0];
    if (sec.featured.show && fp) {
      const c = catOf(fp);
      const spec = [[ui("spec_category"), c && c.name], [ui("spec_metal"), fp.metal], [ui("spec_stone"), fp.stone], [ui("spec_weight"), fp.weight]].filter((x) => x[1]);
      html += `<section class="block" style="padding-top:0">
        <div class="wrap"><div class="sec-title"><span class="rule" aria-hidden="true"></span><h2 data-split>${splitWords(sec.featured.eyebrow, "grad")}</h2><span class="rule" aria-hidden="true"></span></div><div class="feature glass edge lit" data-feature>
        <div class="txt"><div>${eyebrow((c && c.name) || "")}</div>
          <h2 data-split${DA}>${splitWords(fp.name)}</h2>
          ${fp.description ? `<p data-rv>${esc(fp.description.split("\n")[0])}</p>` : ""}
          <div class="chips-spec" data-rv>${spec.map(([k, v]) => `<span><b>${k}</b>${esc(v)}</span>`).join("")}</div>
          <div class="price-big" data-rv>${money(fp.price)}${fp.old_price && fp.old_price > fp.price ? `<s>${num(fp.old_price)}</s>` : ""}</div>
          <div class="cta" data-rv><a class="btn shine" href="#/p/${fp.id}" data-magnet>${esc(sec.featured.button)}</a>
          ${inStock(fp) ? `<button class="btn glass-btn" type="button" data-add="${fp.id}">${A.ui.cart} ${ui("featured_add")}</button>` : ""}</div>
        </div>
        <div class="pic" data-feature-pic><span class="halo h2"></span><span class="halo"></span>${fp.images && fp.images[0] ? `<img ${imgSrc(fp.images[0], SZ.wide)} alt="${esc(fp.name)}" loading="lazy">` : artOf(fp)}</div>
      </div></div></section>`;
    }

    const room = (state.prods.filter((p) => p.featured).length >= 3 ? state.prods.filter((p) => p.featured) : state.prods).slice(0, 6);
    const sr = sec.showroom || {};
    if (sr.show !== false && room.length >= 3) {
      html += `<section class="showroom" id="showroom" aria-label="${esc(sr.eyebrow || sr.title)}"><div class="room-pin">
        <div class="wrap room-head"><div>${sr.eyebrow ? eyebrow(sr.eyebrow) : ""}<h2 data-split>${splitWords(sr.title)}</h2></div>
          <p class="room-hint">${esc(fine ? sr.hint : sr.hint_touch)} ${A.ui.arrowL}</p></div>
        <div class="room-track" id="roomTrack">${room.map((p, k) => {
          const c = catOf(p);
          return `<a class="room-card glass edge" href="#/p/${p.id}">
            <span class="room-no" aria-hidden="true">${String(k + 1).padStart(2, "0")}</span>
            <div class="room-ph">${p.images && p.images[0] ? `<img ${imgSrc(p.images[0], SZ.room)} alt="${esc(p.name)}" loading="lazy">` : `<span class="halo"></span>${artOf(p)}`}</div>
            <div class="room-txt"><small>${esc((c && c.name) || "")}</small><h3${DA}>${esc(p.name)}</h3><span class="price">${money(p.price)}</span></div></a>`;
        }).join("")}<a class="room-card room-end glass" href="#/shop"><b>${esc(sr.end_title)}</b><span>${ui("room_count", { pieces: pieces(countAll()) })}</span><span class="t-go">${A.ui.arrowL}</span></a></div>
      </div></section>`;
    }

    if (sec.collection.show) {
      const usedCats = state.cats.filter((c) => countCat(c.id) > 0);
      html += `<section class="block" id="collection" style="padding-top:0"><div class="wrap">${titleBlock(sec.collection.eyebrow, sec.collection.title, sec.collection.text)}
        ${usedCats.length > 1 ? `<div class="seg" data-rv role="group" aria-label="${ui("sort_label")}"><button class="chip on" type="button" data-filter="">${ui("filter_all")}</button>${usedCats.map((c) => `<button class="chip" type="button" data-filter="${c.id}">${esc(c.name)}</button>`).join("")}</div>` : ""}
        <div id="homeGrid">${grid(state.prods.slice(0, Number(sec.collection.count) || 8), uiRaw("collection_empty"))}</div>
        ${state.prods.length ? `<div class="more" data-rv><a class="btn glass-btn" href="#/shop" data-magnet>${ui("collection_more", { n: num(countAll()) })} ${A.ui.arrow}</a></div>` : ""}
      </div></section>`;
    }


    const gl = sec.globe || {};
    if (s.shop.intl_enabled && gl.show !== false) {
      const cs = (s.shop.countries || []).filter(Boolean);
      html += `<section class="block globe-sec" id="world"><div class="wrap globe-grid">
        <div class="globe-txt">
          <div data-rv>${eyebrow(gl.eyebrow || "Worldwide")}</div>
          <h2 data-split>${splitWords(gl.title || "من كربلاء إلى العالم")}</h2>
          <p data-rv>${esc(gl.text || "")}</p>
          <div class="g-stats" data-rv>
            <div class="glass"><b>${num((s.shop.cities || []).length)}</b><span>${esc(gl.stat_cities)}</span></div>
            <div class="glass"><b>${num(cs.length)}+</b><span>${esc(gl.stat_countries)}</span></div>
            <div class="glass"><b>${A.ui.shield}</b><span>${esc(gl.stat_pack)}</span></div>
          </div>
          ${cs.length ? `<div class="g-countries" data-rv>${cs.slice(0, 9).map((c) => `<span>${esc(place(c))}</span>`).join("")}${cs.length > 9 ? `<span class="more">+${num(cs.length - 9)}</span>` : ""}</div>` : ""}
        </div>
        <div class="globe-wrap" data-rv>
          <div class="globe-halo" aria-hidden="true"></div>
          <canvas id="globe" role="img" aria-label="${esc(gl.title)}"></canvas>
          <div class="globe-pin glass" aria-hidden="true"><span class="dot"></span>${esc(gl.pin)}</div>
          <p class="globe-hint">${esc(fine ? gl.hint : gl.hint_touch)}</p>
        </div>
      </div></section>`;
    }

    if (sec.about.show) {
      const values = (sec.about.values || []).filter((v) => v && v.title);
      html += `<section class="block" id="about"><div class="wrap about">
        <div class="about-pic"><div class="about-media glass edge lit" data-clip>${sec.about.image ? `<img ${imgSrc(sec.about.image, SZ.half)} alt="" loading="lazy">` : `<div class="logo-art"><img src="${esc(s.brand.logo || LOGO_FULL)}" alt="${ui("a11y_logo", { brand: s.brand.full })}" loading="lazy"></div>`}</div>${bloomsOn() ? `<div class="bloom bl-about" aria-hidden="true" data-rv><div class="bl-in">${A.emb.bouquet(1)}</div></div>` : ""}</div>
        <div><div data-rv>${eyebrow(sec.about.eyebrow)}</div><h2 data-split>${splitWords(sec.about.title)}</h2><p class="lit-text" data-lit>${String(sec.about.text || "").split("\n").map((line) => line.split(/\s+/).filter(Boolean).map((w) => `<span class="lw">${esc(w)}</span>`).join(" ")).join("<br>")}</p>
          ${values.length ? `<div class="values" data-stagger>${values.map((v) => `<div class="glass">${A.ui[v.icon] || A.ui.shield}<span><b>${esc(v.title)}</b>${esc(v.text || "")}</span></div>`).join("")}</div>` : ""}
          ${sec.about.button ? `<div class="cta" data-rv style="margin-top:26px"><a class="btn shine" href="#/shop" data-magnet>${esc(sec.about.button)} ${A.ui.arrow}</a></div>` : ""}</div>
      </div></section>`;
    }

    const quotes = (sec.testimonials.items || []).filter((q) => q && q.text);
    if (sec.testimonials.show && quotes.length) {
      html += `<section class="block" style="padding-top:0"><div class="wrap">${titleBlock("", sec.testimonials.title, "")}
        <div class="quotes" data-stagger>${quotes.map((q) => `<figure class="quote glass spot"><p>${esc(q.text)}</p><b>${esc(q.name)}</b>${q.city ? `<span>${esc(q.city)}</span>` : ""}</figure>`).join("")}</div></div></section>`;
    }

    if (sec.visit.show) html += visitSection();

    app.innerHTML = html;
    bindHome();
    try { animateHome(); } catch (e) { console.warn("animation skipped", e); }
    try { startGlobe(); } catch (e) { console.warn("globe skipped", e); }
    if (scrollTo) requestAnimationFrame(() => scrollToId(scrollTo));
  }

  function visitSection() {
    const s = state.s, c = s.contact, sec = s.sections.visit;
    const rows = [
      c.address && [A.ui.pin, ui("lbl_address"), esc(c.address) + (safeUrl(c.map_url) ? ` · <a href="${esc(safeUrl(c.map_url))}" target="_blank" rel="noopener" style="color:var(--emerald)">${ui("map_link")}</a>` : "")],
      c.hours && [A.ui.clock, ui("lbl_hours"), esc(c.hours)],
      c.phone && [A.ui.phone, ui("lbl_phone"), `<a href="tel:${esc(toLatin(c.phone).replace(/[^\d+]/g, ""))}" dir="ltr">${esc(c.phone)}</a>`],
      c.whatsapp && [A.ui.whatsapp, ui("lbl_whatsapp"), `<a href="${esc(waLink(uiRaw("wa_hello")))}" target="_blank" rel="noopener" dir="ltr">${esc(c.whatsapp)}</a>`],
      c.email && [A.ui.mail, ui("lbl_email"), `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`]
    ].filter(Boolean);
    return `<section class="block" id="visit"><div class="wrap">${titleBlock(sec.eyebrow, sec.title, "")}
      <div class="visit">
        <div class="visit-card glass spot info-card" data-rv>${sec.image ? `<img class="card-photo" ${imgSrc(sec.image, SZ.half)} alt="" loading="lazy">` : ""}<h3>${esc(s.brand.full)}</h3>
          ${rows.map(([ic, k, v]) => `<div class="info-row"><span class="ic">${ic}</span><div><small>${k}</small>${v}</div></div>`).join("")}
          <div class="socials">${socialLinks()}</div>
        </div>
        <form class="visit-card glass spot" id="contactForm" data-rv novalidate>
          <h3>${esc(sec.form_title)}</h3><p style="color:var(--soft);margin-top:-8px">${esc(sec.form_text)}</p>
          <div class="two"><div class="field"><label for="cfName">${ui("form_name")}</label><input id="cfName" name="name" required maxlength="120" autocomplete="name"></div>
          <div class="field"><label for="cfPhone">${ui("form_phone")}</label><input id="cfPhone" name="phone" type="tel" inputmode="tel" maxlength="30" dir="ltr" autocomplete="tel"></div></div>
          <div class="field"><label for="cfBody">${ui("form_body")}</label><textarea id="cfBody" name="body" required maxlength="3000"></textarea></div>
          ${HONEYPOT}<div class="ts-holder" id="cfHuman"></div>
          <button class="btn shine block" type="submit">${ui("form_send")}</button>
        </form>
      </div></div></section>`;
  }

  function bindHome() {
    const deck = $("#deck");
    if (deck) {
      const cards = $$(".deck-card", deck), dots = $$("[data-dot]"), n = cards.length;
      let top = 0, timer, moving = false;
      const ms = Math.round((Number(state.s.hero.slide_seconds) || 5.5) * 1000);
      const place = (el, k, instant) => { // k = position in the stack, 0 = front
        // a neat stack: the next card waits straight behind, its top edge just showing
        const v = { y: -k * 16, scale: 1 - k * 0.05, rotate: 0, opacity: k > 1 ? 0 : 1 - k * 0.45, zIndex: 10 - k };
        el.classList.toggle("top", k === 0);
        el.setAttribute("aria-hidden", k ? "true" : "false"); el.tabIndex = k ? -1 : 0;
        if (G && !instant) G.to(el, { ...v, duration: 0.9, ease: "expo.out" }); else if (G) G.set(el, v);
        else Object.assign(el.style, { transform: `translateY(${v.y}px) scale(${v.scale}) rotate(${v.rotate}deg)`, opacity: v.opacity, zIndex: v.zIndex });
      };
      const layout = (instant) => cards.forEach((el, k) => place(el, (k - top + n) % n, instant));
      const mark = () => dots.forEach((d, k) => { d.classList.remove("on"); void d.offsetWidth; d.classList.toggle("on", k === top); });
      const go = (to, dir = 1) => {
        if (moving || n < 2) return;
        to = (to + n) % n; if (to === top) return;
        moving = true;
        const out = cards[top];
        top = to; mark();
        if (!G) { layout(true); moving = false; return; }
        G.to(out, { x: dir * -window.innerWidth * 0.35, y: 30, rotate: dir * -16, opacity: 0, duration: 0.55, ease: "power3.in", onComplete: () => {
          G.set(out, { x: 0 }); layout(false); moving = false; } });
        cards.forEach((el, k) => { if (el !== out) place(el, (k - top + n) % n); });
      };
      const play = () => { clearInterval(timer); if (n > 1) timer = setInterval(() => go(top + 1), ms); };
      layout(true);
      dots.forEach((d) => d.addEventListener("click", () => { const k = +d.dataset.dot; go(k, k > top ? 1 : -1); play(); }));
      if (n > 1) { mark(); play(); }
      let sx = null;
      deck.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
      deck.addEventListener("touchend", (e) => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) { go(top + 1, dx > 0 ? -1 : 1); play(); } sx = null; });
      cleanups.push(() => clearInterval(timer));
    }
    const flip = $("[data-flip]");
    if (flip && G) {
      const words = $$(".fw", flip); let k = 0;
      const t = setInterval(() => {
        const cur = words[k]; k = (k + 1) % words.length; const nxt = words[k];
        // one word leaves completely before the next arrives, so the two never overlap
        G.to(cur, { yPercent: -30, opacity: 0, duration: 0.45, ease: "power2.in", onComplete: () => cur.classList.remove("on") });
        G.fromTo(nxt, { yPercent: 30, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, delay: 0.5, ease: "expo.out", onStart: () => nxt.classList.add("on") });
      }, 3600);
      cleanups.push(() => clearInterval(t));
    }
    $$("[data-filter]").forEach((b) => b.addEventListener("click", () => {
      $$("[data-filter]").forEach((x) => x.classList.toggle("on", x === b));
      const id = b.dataset.filter, n = Number(state.s.sections.collection.count) || 8;
      const local = (id ? state.prods.filter((p) => p.category_id === id) : state.prods).slice(0, n);
      const getList = !state.complete && id
        ? rpcGet("list_products", { p_category: id, p_limit: n }).then((r) => (r.data && r.data.items ? r.data.items.map(remember) : local)).catch(() => local)
        : Promise.resolve(local);
      const box = $("#homeGrid");
      const swap = async () => { const list = await getList; box.innerHTML = grid(list); if (G) G.fromTo($$(".card", box), { opacity: 0, y: 40, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.05, ease: "expo.out", clearProps: "transform" }); if (window.ScrollTrigger) window.ScrollTrigger.refresh(); };
      if (G) G.to($$(".card", box), { opacity: 0, y: -20, duration: 0.25, stagger: 0.02, onComplete: swap }); else swap();
    }));
    bindContactForm();
  }

  function bindContactForm() {
    const f = $("#contactForm");
    if (!f) return;
    let human = null;
    const wake = () => { if (!human && cfg.gateway === "edge" && cfg.turnstile) human = humanCheck($("#cfHuman", f), "inquiry"); };
    f.addEventListener("focusin", wake, { once: true });
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = f.name.value.trim(), phone = f.phone.value.trim(), body = f.body.value.trim();
      if (name.length < 2) { toast(uiRaw("form_need_name")); f.name.focus(); return; }
      if (body.length < 2) { toast(uiRaw("form_need_body")); f.body.focus(); return; }
      const btn = $("button[type=submit]", f); btn.disabled = true; btn.textContent = uiRaw("form_sending");
      let res;
      if (cfg.gateway === "edge") {
        wake();
        res = await edge("submit-inquiry", { name, phone, body, website: f.website.value, turnstile: human ? await human.get() : "" });
        if (res.error && res.error.status === 404) res = await db.insert("inquiries", { name, phone, body });   // function not deployed yet
        if (human) human.reset();
      } else res = await db.insert("inquiries", { name, phone, body });
      btn.disabled = false; btn.textContent = uiRaw("form_send");
      if (res.error) { toast(uiRaw(/rate_limited/.test(res.error.message || "") ? "form_busy" : "form_err")); return; }
      f.reset(); toast(uiRaw("form_ok"));
    });
  }

  /* ---------- shop / category ---------- */
  let navToken = 0;   // a response that arrives after the visitor moved on is ignored
  const skeletons = (n) => `<div class="grid">${'<div class="skeleton" style="aspect-ratio:3/4"></div>'.repeat(n)}</div>`;
  function renderShop(slug, sort, subSlug) {
    const cat = slug ? state.cats.find((c) => c.slug === slug) : null;
    if (slug && !cat && state.ready) { location.hash = "#/shop"; return; }
    const kids = cat ? subsOf(cat.id) : [];
    const sub = subSlug ? kids.find((x) => x.slug === subSlug) : null;
    if (subSlug && !sub && state.ready) { location.hash = `#/c/${cat ? cat.slug : ""}`; return; }
    const paged = !state.complete;
    let list = cat ? state.prods.filter((p) => p.category_id === cat.id) : state.prods.slice();
    if (sub) list = list.filter((p) => p.subcategory_id === sub.id);
    const here = sub || cat;
    sort = sort || "default";
    if (sort === "low") list.sort((a, b) => a.price - b.price);
    if (sort === "high") list.sort((a, b) => b.price - a.price);
    if (sort === "new") list.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    app.innerHTML = `<div class="page-head"><div class="wrap">
        <nav class="crumbs" aria-label="${ui("nav_shop")}" data-rv><a href="#/">${ui("nav_home")}</a><span>/</span>${cat ? `<a href="#/shop">${ui("nav_shop")}</a><span>/</span>${sub ? `<a href="#/c/${esc(cat.slug)}">${esc(cat.name)}</a><span>/</span><span>${esc(sub.name)}</span>` : `<span>${esc(cat.name)}</span>`}` : `<span>${ui("nav_shop")}</span>`}</nav>
        <h1 data-split>${splitWords(here ? here.name : uiRaw("shop_title"))}</h1>
        <p data-rv>${esc(here ? here.subtitle : state.s.brand.tagline)}</p></div></div>
      <section style="padding-bottom:40px"><div class="wrap">
        <div class="seg" data-rv><a class="chip${cat ? "" : " on"}" href="#/shop">${ui("filter_all")}</a>${state.cats.map((c) => `<a class="chip${cat && cat.id === c.id ? " on" : ""}" href="#/c/${esc(c.slug)}">${esc(c.name)}</a>`).join("")}</div>
        ${kids.length ? `<div class="seg seg-sub" data-rv><a class="chip${sub ? "" : " on"}" href="#/c/${esc(cat.slug)}">${ui("filter_all_sub", { name: cat.name })}</a>${kids.map((x) => `<a class="chip${sub && sub.id === x.id ? " on" : ""}" href="#/c/${esc(cat.slug)}/${esc(x.slug)}">${esc(x.name)}</a>`).join("")}</div>` : ""}
        <div class="toolbar" data-rv><span class="count" id="shopCount">${paged ? uiN("shop_count", sub ? countSub(sub.id) : cat ? countCat(cat.id) : countAll()) : uiN("shop_count", list.length)}</span>
          <label>${ui("sort_label")}
          <select id="sortSel" aria-label="${ui("sort_label")}">
            <option value="default">${ui("sort_default")}</option><option value="new">${ui("sort_new")}</option><option value="low">${ui("sort_low")}</option><option value="high">${ui("sort_high")}</option>
          </select></label></div>
        ${paged ? `<div id="shopGrid">${skeletons(8)}</div><div class="more" id="shopMore" hidden><button class="btn glass-btn" type="button" id="moreBtn"></button></div>` : grid(list)}
      </div></section>`;
    // the row of sub-departments on a phone: show the chosen one, and mark the row when it scrolls
    const segSub = $(".seg-sub");
    if (segSub) {
      const edge = () => { const max = segSub.scrollWidth - segSub.clientWidth; segSub.classList.toggle("scrolls", max > 2); segSub.classList.toggle("at-end", max > 2 && Math.abs(segSub.scrollLeft) >= max - 2); };
      const on = $(".chip.on", segSub);
      if (on && segSub.scrollWidth > segSub.clientWidth + 2) segSub.scrollLeft += on.getBoundingClientRect().left + on.offsetWidth / 2 - (segSub.getBoundingClientRect().left + segSub.clientWidth / 2);
      edge(); segSub.addEventListener("scroll", edge, { passive: true });
    }
    const sel = $("#sortSel"); sel.value = sort;
    sel.addEventListener("change", () => { killMotion(); renderShop(slug, sel.value, subSlug); });
    const onSub = $(".seg-sub .chip.on");
    if (onSub && sub) onSub.scrollIntoView({ block: "nearest", inline: "center" });   // phones: the chosen sub-department in view
    animateCommon();
    if (paged) shopPages(cat, sort, sub);
  }
  // large catalogues: the shop asks the database for one page at a time ("show more")
  function shopPages(cat, sort, sub) {
    const token = ++navToken, box = $("#shopGrid"), more = $("#shopMore"), btn = $("#moreBtn");
    let shown = 0;
    const show = async (offset) => {
      btn.disabled = true;
      const r = await rpcGet("list_products", { p_category: cat ? cat.id : null, p_sort: sort, p_limit: PAGE, p_offset: offset, p_sub: sub ? sub.id : null });
      if (token !== navToken) return;
      btn.disabled = false;
      if (r.error || !r.data) {
        if (!offset) box.innerHTML = `<div class="empty">${ui("net_down")}<br><br><button class="btn glass-btn" type="button" id="shopRetry">${ui("net_retry")}</button></div>`;
        else toast(uiRaw("net_down"));
        const rb = $("#shopRetry"); if (rb) rb.addEventListener("click", () => { box.innerHTML = skeletons(8); show(0); });
        return;
      }
      const items = (r.data.items || []).map(remember), total = r.data.total || 0;
      $("#shopCount").innerHTML = uiN("shop_count", total);
      let fresh;
      if (!offset) { box.innerHTML = grid(items); fresh = $$(".card", box); }
      else {
        const g = $(".grid", box), tmp = document.createElement("div");
        tmp.innerHTML = items.map(card).join(""); fresh = Array.from(tmp.children); fresh.forEach((el) => g.appendChild(el));
      }
      if (G && fresh.length) G.fromTo(fresh, { opacity: 0, y: 40, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.05, ease: "expo.out", clearProps: "transform" });
      shown = offset + items.length;
      more.hidden = shown >= total;
      btn.innerHTML = `${ui("shop_more", { n: num(total - shown) })} ${A.ui.arrow}`;
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    };
    btn.addEventListener("click", () => show(shown));
    show(0);
  }

  /* ---------- product ---------- */
  const relatedOf = new Map(), productAsked = new Set();
  function productOnDemand(id, hasLocal) {
    const token = ++navToken;
    productAsked.add(id);
    rpcGet("product_page", { p_id: id }).then((r) => {
      if (r.error) { productAsked.delete(id); }
      else if (r.data && r.data.product) { remember(r.data.product); relatedOf.set(id, (r.data.related || []).map(remember)); }
      if (token !== navToken || parse().parts[1] !== id) return;
      if (!hasLocal) { killMotion(); renderProduct(id); if (window.ScrollTrigger) window.ScrollTrigger.refresh(); return; }
      const rel = relatedOf.get(id) || [];
      if (rel.length && !$("#relatedSec")) {
        $(".product", app).insertAdjacentHTML("afterend", `<section class="block" id="relatedSec" style="padding-top:20px">${titleBlock("", uiRaw("related"), "")}${grid(rel)}</section>`);
        if (G) G.from("#relatedSec .card, #relatedSec h2 .w, #relatedSec h2", { opacity: 0, y: 30, duration: 0.8, stagger: 0.05, ease: "expo.out", clearProps: "transform,opacity" });
      }
    });
  }
  function renderProduct(id) {
    const p = findProd(id);
    if (!state.complete && !productAsked.has(id) && !(p && relatedOf.has(id))) {
      productOnDemand(id, !!p);
      if (!p) { app.innerHTML = `<div class="wrap" style="padding-block:110px 60px"><div class="product"><div class="skeleton" style="aspect-ratio:1"></div><div><div class="skeleton" style="height:48px;margin-bottom:18px"></div><div class="skeleton" style="height:28px;width:40%;margin-bottom:28px"></div><div class="skeleton" style="height:160px"></div></div></div></div>`; return; }
    }
    if (!p) {
      app.innerHTML = `<div class="page-head"><div class="wrap"><h1>${ui("notfound_title")}</h1><p>${ui("notfound_text")}</p><div class="cta" style="justify-content:center;margin-top:20px"><a class="btn shine" href="#/shop">${ui("notfound_btn")}</a></div></div></div>`;
      return;
    }
    const c = catOf(p), sc = subOf(p), imgs = (p.images || []).filter(Boolean), out = !inStock(p);
    const spec = [[ui("spec_category"), sc ? sc.name : c && c.name], [ui("spec_metal"), p.metal], [ui("spec_stone"), p.stone], [ui("spec_weight"), p.weight], [ui("spec_size"), p.size],
      [ui("spec_stock"), out ? uiRaw("out_of_stock") : p.stock ? uiRaw("in_stock_n", { n: num(p.stock) }) : uiRaw("in_stock")]].filter((x) => x[1]);
    const related = (!state.complete && relatedOf.get(id)) || (state.complete ? state.prods.filter((x) => x.id !== p.id && x.category_id === p.category_id).slice(0, 4) : []);
    const wa = waLink(`${uiRaw("wa_product", { name: p.name, price: `${num(p.price)} ${state.s.shop.currency}` })}\n${location.href}`);
    app.innerHTML = `<div class="wrap"><div class="product">
      <div class="gallery" data-rv>
        <div class="g-main" id="gMain">${imgs.length ? `<img ${imgSrc(imgs[0], SZ.half)} alt="${esc(p.name)}">` : artOf(p)}
          ${imgs.length > 1 ? `<button class="icon-btn g-nav prev" type="button" aria-label="‹">${A.ui.arrowR}</button><button class="icon-btn g-nav next" type="button" aria-label="›">${A.ui.arrowL}</button>` : ""}</div>
        ${imgs.length > 1 ? `<div class="g-thumbs">${imgs.map((u, i) => `<button type="button" class="${i ? "" : "on"}" data-g="${i}" aria-label="${ui("a11y_photo", { n: num(i + 1) })}"><img ${smallSrc(u)} alt="" loading="lazy"></button>`).join("")}</div>` : ""}
      </div>
      <div class="p-info">
        <nav class="crumbs" style="justify-content:flex-start" aria-label="${ui("nav_shop")}" data-rv><a href="#/">${ui("nav_home")}</a><span>/</span>${c ? `<a href="#/c/${esc(c.slug)}">${esc(c.name)}</a>${sc ? `<span>/</span><a href="#/c/${esc(c.slug)}/${esc(sc.slug)}">${esc(sc.name)}</a>` : ""}` : `<a href="#/shop">${ui("nav_shop")}</a>`}</nav>
        ${p.badge && !out ? `<span class="tag" style="position:static;display:inline-block;margin-top:10px" data-rv>${esc(p.badge)}</span>` : ""}
        <h1 data-split${DA}>${splitWords(p.name)}</h1>
        <div class="p-price price" data-rv>${priceHTML(p)}</div>
        ${p.description ? `<p class="desc" data-rv${DA}>${esc(p.description)}</p>` : ""}
        <dl class="spec glass" data-rv>${spec.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
        ${out ? `<div class="empty" style="padding:20px;margin-bottom:12px">${ui("out_note")}</div>` : `
        <div class="buy-row" data-rv>
          <div class="qty" role="group" aria-label="${ui("qty")}"><button type="button" id="qMinus" aria-label="${ui("a11y_less")}">−</button><span id="qVal">${num(1)}</span><button type="button" id="qPlus" aria-label="${ui("a11y_more")}">+</button></div>
          <button class="btn shine" type="button" id="addBtn" data-magnet>${A.ui.cart} ${ui("add_to_cart")}</button>
        </div>
        <div class="buy-row" data-rv><button class="btn glass-btn block" type="button" id="buyNow">${ui("buy_now")}</button></div>`}
        ${wa ? `<a class="btn wa block" href="${esc(wa)}" target="_blank" rel="noopener" data-rv>${A.ui.whatsapp} ${ui("ask_whatsapp")}</a>` : ""}
        <div class="assure" data-rv><div class="glass">${A.ui.shield}${ui("assure_1")}</div><div class="glass">${A.ui.truck}${ui(state.s.shop.intl_enabled ? "assure_2" : "assure_2_local")}</div><div class="glass">${A.ui.gift}${ui("assure_3")}</div></div>
      </div></div>
      ${related.length ? `<section class="block" id="relatedSec" style="padding-top:20px">${titleBlock("", uiRaw("related"), "")}${grid(related)}</section>` : ""}
    </div>`;

    // gallery
    if (imgs.length > 1) {
      let gi = 0;
      const main = $("#gMain");
      const go = (n) => {
        gi = (n + imgs.length) % imgs.length;
        $$("[data-g]").forEach((b, k) => b.classList.toggle("on", k === gi));
        const old = $("img", main);
        const img = document.createElement("img");
        if (VAR.test(imgs[gi])) { img.sizes = SZ.half; img.srcset = `${sizedUrl(imgs[gi], 480)} 480w, ${sizedUrl(imgs[gi], 1080)} 1080w, ${imgs[gi]} 1800w`; img.src = sizedUrl(imgs[gi], 1080); }
        else img.src = imgs[gi];
        img.alt = p.name;
        main.insertBefore(img, old.nextSibling);
        if (G) {
          G.fromTo(img, { clipPath: LTR ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)", scale: 1.1 }, { clipPath: "inset(0 0 0 0%)", scale: 1, duration: 0.9, ease: "expo.inOut", onComplete: () => old.remove() });
        } else old.remove();
      };
      $$("[data-g]").forEach((b) => b.addEventListener("click", () => go(+b.dataset.g)));
      $(".g-nav.next", main).addEventListener("click", () => go(gi + 1));
      $(".g-nav.prev", main).addEventListener("click", () => go(gi - 1));
      let sx = null;
      main.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
      main.addEventListener("touchend", (e) => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) go(gi + ((LTR ? dx < 0 : dx > 0) ? 1 : -1)); sx = null; });
    }
    // quantity + add
    let q = 1;
    const qv = $("#qVal");
    if (qv) {
      $("#qMinus").addEventListener("click", () => { q = Math.max(1, q - 1); qv.textContent = num(q); });
      $("#qPlus").addEventListener("click", () => { q = Math.min(p.stock || 50, q + 1); qv.textContent = num(q); });
      $("#addBtn").addEventListener("click", (e) => addToCart(p.id, q, e.currentTarget));
      $("#buyNow").addEventListener("click", () => { addToCart(p.id, q, null, true); openCheckout(); });
    }
    animateCommon();
  }

  /* ---------- cart ---------- */
  function readCart() { return safeLS(() => JSON.parse(localStorage.getItem("rq_cart") || "[]"), []).filter((x) => x && x.id && x.qty > 0); }
  function saveCart() { safeLS(() => localStorage.setItem("rq_cart", JSON.stringify(state.cart))); updateCartCount(); }
  // large catalogues: cart items that are not among the loaded products are fetched by id
  async function ensureCartProducts() {
    if (state.complete || state.legacy) return;
    const missing = state.cart.map((l) => l.id).filter((id) => !findProd(id));
    if (!missing.length) return;
    const r = await db.rpc("products_by_ids", { p_ids: missing.slice(0, 60) });
    if (!Array.isArray(r.data) || !r.data.length) return;
    r.data.forEach(remember);
    updateCartCount();
    if ($("#cart").classList.contains("open")) renderCart();
  }
  function cartLines() { return state.cart.map((l) => ({ ...l, p: findProd(l.id) })).filter((l) => l.p && inStock(l.p)); }
  const LOCAL = "العراق";
  function totals(country) {
    const sh = state.s.shop, intl = !!country && country !== LOCAL;
    const sub = cartLines().reduce((a, l) => a + l.p.price * l.qty, 0);
    const fee = Number(intl ? sh.intl_delivery_fee : sh.delivery_fee) || 0;
    const free = Number(intl ? sh.intl_free_over : sh.free_delivery_over) || 0;
    const freed = !!free && sub >= free;
    const delivery = sub === 0 || freed ? 0 : fee;
    const tbd = intl && !freed && fee === 0;
    return { sub, delivery, total: sub + delivery, free, intl, tbd };
  }
  const feeLabel = (t) => t.tbd ? ui("tbd") : t.delivery ? money(t.delivery) : ui("free");
  function updateCartCount() {
    const n = cartLines().reduce((a, l) => a + l.qty, 0);
    const b = $("#cartCount");
    b.textContent = num(n); b.hidden = !n;
    if (G && n) G.fromTo(b, { scale: 1.6 }, { scale: 1, duration: 0.6, ease: "elastic.out(1, .4)" });
  }
  function addToCart(id, qty = 1, srcEl, silent) {
    const p = findProd(id); if (!p) return;
    const line = state.cart.find((l) => l.id === id);
    if (line) line.qty = Math.min(50, line.qty + qty); else state.cart.push({ id, qty });
    saveCart(); renderCart();
    if (!silent) toast(uiRaw("added_toast", { name: p.name }));
    if (G && srcEl) flyToCart(srcEl);
  }
  function flyToCart(srcEl) {
    const from = srcEl.getBoundingClientRect(), to = $("#cartBtn").getBoundingClientRect();
    const dot = document.createElement("div");
    Object.assign(dot.style, { position: "fixed", zIndex: 99, width: "18px", height: "18px", borderRadius: "50%", background: "var(--emerald)", left: from.left + from.width / 2 - 9 + "px", top: from.top + from.height / 2 - 9 + "px", pointerEvents: "none" });
    document.body.appendChild(dot);
    G.to(dot, { x: to.left + to.width / 2 - (from.left + from.width / 2), duration: 0.8, ease: "power1.inOut" });
    G.to(dot, { y: to.top + to.height / 2 - (from.top + from.height / 2), duration: 0.8, ease: "back.in(1.6)", onComplete: () => dot.remove() });
    G.to(dot, { scale: 0.4, duration: 0.8 });
  }
  function renderCart() {
    const lines = cartLines(), t = totals();
    const body = $("#cartBody"), foot = $("#cartFoot");
    if (!lines.length) {
      body.innerHTML = `<div class="cart-empty">${A.ui.cart}<p>${ui("cart_empty")}</p><a class="btn shine" href="#/shop" data-close="cart">${ui("cart_browse")}</a></div>`;
      foot.innerHTML = "";
      return;
    }
    body.innerHTML = lines.map((l) => `<div class="c-item">
      <a class="ph" href="#/p/${l.p.id}" data-close="cart">${l.p.images && l.p.images[0] ? `<img ${smallSrc(l.p.images[0])} alt="">` : artOf(l.p)}</a>
      <div><h5${DA}>${esc(l.p.name)}</h5><div class="price" style="font-size:14px">${money(l.p.price)}</div>
        <div class="qty"><button type="button" data-q="${l.id}" data-d="-1" aria-label="−">−</button><span>${num(l.qty)}</span><button type="button" data-q="${l.id}" data-d="1" aria-label="+">+</button></div></div>
      <button class="rm" type="button" data-rm="${l.id}">${ui("cart_remove")}</button></div>`).join("");
    foot.innerHTML = `<div class="sum"><span>${ui("cart_subtotal")}</span><span>${money(t.sub)}</span></div>
      <div class="sum"><span>${ui("cart_delivery")}</span><span>${feeLabel(t)}</span></div>
      ${t.free && t.sub < t.free ? `<div class="sum" style="color:var(--soft);font-size:13px"><span>${ui("cart_free_hint", { amount: money(t.free - t.sub) })}</span></div>` : ""}
      ${state.s.shop.intl_enabled ? `<div class="sum" style="color:var(--soft);font-size:13px"><span>${ui("cart_intl_hint")}</span></div>` : ""}
      <div class="sum total"><span>${ui("cart_total")}</span><span>${money(t.total)}</span></div>
      <button class="btn shine block" type="button" id="toCheckout" style="margin-top:12px">${ui("cart_checkout")}</button>
      <p style="text-align:center;color:var(--soft);font-size:13px;margin:8px 0 0">${esc(state.s.shop.payment_note)}</p>`;
    $("#toCheckout").addEventListener("click", openCheckout);
  }
  document.addEventListener("click", (e) => {
    const q = e.target.closest("[data-q]");
    if (q) { const l = state.cart.find((x) => x.id === q.dataset.q); if (l) { l.qty = Math.max(1, Math.min(50, l.qty + +q.dataset.d)); saveCart(); renderCart(); } return; }
    const rm = e.target.closest("[data-rm]");
    if (rm) { state.cart = state.cart.filter((x) => x.id !== rm.dataset.rm); saveCart(); renderCart(); return; }
    const add = e.target.closest("[data-add]");
    if (add) { e.preventDefault(); addToCart(add.dataset.add, 1, add); return; }
    const cl = e.target.closest("[data-close]");
    if (cl) { closePanel(cl.dataset.close); }
  });

  /* ---------- panels ---------- */
  function openPanel(name) {
    $("#toast").classList.remove("show");      // a message from before does not sit on the panel
    $("#" + name).classList.add("open"); $("#" + name).setAttribute("aria-hidden", "false");
    $("#" + name + "Bg").classList.add("open"); lock(true);
    const f = $("#" + name + " .icon-btn"); if (f) setTimeout(() => f.focus(), 50);
  }
  function closePanel(name) {
    const el = $("#" + name); if (!el) return;
    el.classList.remove("open"); el.setAttribute("aria-hidden", "true");
    const bg = $("#" + name + "Bg"); if (bg) bg.classList.remove("open");
    lock(false);
  }
  $("#menuBg").addEventListener("click", () => closePanel("menu"));
  $("#cartBg").addEventListener("click", () => closePanel("cart"));
  $("#menuList").addEventListener("click", (e) => { if (e.target.closest("a")) closePanel("menu"); });

  /* ---------- checkout ---------- */
  function openCheckout() {
    closePanel("cart"); $("#toast").classList.remove("show");
    const lines = cartLines(), s = state.s, sh = s.shop;
    if (!lines.length) { toast(uiRaw("cart_is_empty")); return; }
    const countries = sh.intl_enabled ? (sh.countries || []).filter((c) => c && c !== LOCAL) : [];
    $("#checkout").innerHTML = `<button class="icon-btn x" type="button" id="coClose" aria-label="${ui("a11y_close")}">${A.ui.close}</button>
      <h3 id="coTitle">${ui("co_title")}</h3><p style="color:var(--soft);margin-top:0" id="coLead"></p>
      <form id="coForm" novalidate>
        <div class="field"><label for="coName">${ui("co_name")}</label><input id="coName" name="name" required maxlength="120" autocomplete="name"></div>
        <div class="field"><label for="coPhone">${ui("co_phone")}</label><input id="coPhone" name="phone" type="tel" inputmode="tel" required maxlength="30" dir="ltr" placeholder="07XX XXX XXXX" autocomplete="tel"></div>
        ${countries.length ? `<div class="field"><label for="coCountry">${ui("co_country")}</label><select id="coCountry" name="country" autocomplete="country-name">
          <option value="${LOCAL}">${esc(place(LOCAL))}</option>${countries.map((c) => `<option value="${esc(c)}">${esc(place(c))}</option>`).join("")}<option value="__other">${ui("co_other")}</option></select></div>
          <div class="field" id="coOtherWrap" hidden><label for="coOther">${ui("co_other_name")}</label><input id="coOther" name="other" maxlength="60" autocomplete="country-name"></div>` : ""}
        <div class="two">
          <div class="field" id="coCityWrap"><label for="coCity">${ui("co_city")}</label><select id="coCity" name="city">${(sh.cities || []).map((c) => `<option value="${esc(c)}">${esc(place(c))}</option>`).join("")}</select></div>
          <div class="field" id="coCityIntlWrap" hidden><label for="coCityIntl">${ui("co_city_intl")}</label><input id="coCityIntl" name="cityIntl" maxlength="80" autocomplete="address-level2"></div>
          <div class="field"><label for="coAddr" id="coAddrLbl">${ui("co_addr")}</label><input id="coAddr" name="address" maxlength="300" placeholder="${ui("co_addr_ph")}" autocomplete="street-address"></div>
        </div>
        <div class="field"><label for="coNotes">${ui("co_notes")}</label><textarea id="coNotes" name="notes" maxlength="1000" style="min-height:80px" placeholder="${ui("co_notes_ph")}"></textarea></div>
        <div id="coSum"></div>
        ${HONEYPOT}<div class="ts-holder" id="coHuman"></div>
        <button class="btn shine block" type="submit">${ui("co_submit")}</button>
      </form>`;
    const f = $("#coForm");
    const country = () => { const v = f.country ? f.country.value : LOCAL; return v === "__other" ? (f.other.value.trim() || uiRaw("co_other").replace(/…$/, "")) : v; };
    const refresh = () => {
      const c = country(), t = totals(c), intl = t.intl;
      $("#coCityWrap").hidden = intl; $("#coCityIntlWrap").hidden = !intl;
      if (f.country) $("#coOtherWrap").hidden = f.country.value !== "__other";
      f.address.placeholder = uiRaw(intl ? "co_addr_ph_intl" : "co_addr_ph");
      $("#coAddrLbl").textContent = uiRaw(intl ? "co_addr_intl" : "co_addr");
      f.phone.placeholder = intl ? "+00 000 000 0000" : "07XX XXX XXXX";
      $("#coLead").innerHTML = `${pieces(lines.reduce((a, l) => a + l.qty, 0))} · ${ui("co_total")} <b class="price">${money(t.total)}</b>${t.tbd ? " " + ui("co_plus_shipping") : ""}`;
      $("#coSum").innerHTML = `<div class="sum"><span>${ui("co_sub")}</span><span>${money(t.sub)}</span></div>
        <div class="sum"><span>${ui(intl ? "co_intl_shipping" : "co_delivery")}</span><span>${feeLabel(t)}</span></div>
        <div class="sum total"><span>${ui("co_total")}</span><span>${money(t.total)}${t.tbd ? ` <small style="font-weight:400;color:var(--soft)">${ui("co_plus_shipping")}</small>` : ""}</span></div>
        <p style="color:var(--soft);font-size:13px">${esc(intl ? [t.tbd ? sh.intl_note : "", sh.intl_payment_note].filter(Boolean).join(" · ") : sh.payment_note)}</p>`;
    };
    if (f.country) { f.country.addEventListener("change", refresh); f.other.addEventListener("input", refresh); }
    refresh();
    checkoutHuman = cfg.gateway === "edge" && cfg.turnstile ? humanCheck($("#coHuman"), "order") : null;
    $("#checkoutBg").classList.add("open"); lock(true);
    setTimeout(() => { if (!f.contains(document.activeElement)) $("#coName").focus(); }, 100);   // never steal focus from a field already in use
    $("#coClose").addEventListener("click", closeCheckout);
    f.addEventListener("submit", (e) => submitOrder(e, country));
  }
  function closeCheckout() { $("#checkoutBg").classList.remove("open"); lock(false); }
  $("#checkoutBg").addEventListener("click", (e) => { if (e.target.id === "checkoutBg") closeCheckout(); });

  /* One random key per checkout. If the connection drops after the order was saved,
     sending the same key again returns that same order instead of creating a second one. */
  const uuid4 = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> (c / 4)).toString(16));
  function checkoutKey(items) {
    const sig = JSON.stringify(items);
    const saved = safeLS(() => JSON.parse(sessionStorage.getItem("rq_ck") || "null"), null);
    if (saved && saved.sig === sig && saved.key) return saved.key;
    const key = uuid4();
    safeLS(() => sessionStorage.setItem("rq_ck", JSON.stringify({ sig, key })));
    return key;
  }
  const forgetCheckoutKey = () => safeLS(() => sessionStorage.removeItem("rq_ck"));
  const retryable = (err) => err && (err.network || err.status >= 500 || err.status === 408);
  let checkoutHuman = null;
  async function viaRpc(cust, items, key) {
    let res = await db.rpc("place_order", { p_customer: cust, p_items: items, p_idempotency_key: key });
    // database not upgraded yet (function without the key): same call as before
    if (res.error && (res.error.code === "PGRST202" || /p_idempotency_key/.test(res.error.message || "")))
      res = await db.rpc("place_order", { p_customer: cust, p_items: items });
    return res;
  }
  async function viaEdge(cust, items, key, website) {
    const turnstile = checkoutHuman ? await checkoutHuman.get() : "";
    const res = await edge("submit-order", { customer: cust, items, key, turnstile, website });
    if (checkoutHuman) checkoutHuman.reset();          // a Turnstile token works once
    if (res.error && res.error.status === 404) return viaRpc(cust, items, key);   // function not deployed yet: previous path
    return res;
  }
  async function sendOrder(cust, items, website = "") {
    const key = checkoutKey(items);
    let res;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 800 * attempt));
      res = cfg.gateway === "edge" ? await viaEdge(cust, items, key, website) : await viaRpc(cust, items, key);
      if (!retryable(res.error)) break;
    }
    // a definite "no" from the server created nothing: the next attempt may use a fresh key
    if (res.error && !retryable(res.error)) forgetCheckoutKey();
    return res;
  }

  async function submitOrder(e, getCountry) {
    e.preventDefault();
    const f = e.target;
    const country = getCountry(), intl = country !== LOCAL;
    const cust = { name: f.name.value.trim(), phone: f.phone.value.trim(), country, city: intl ? f.cityIntl.value.trim() : f.city.value, address: f.address.value.trim(), notes: f.notes.value.trim() };
    if (cust.name.length < 2) { toast(uiRaw("co_err_name")); f.name.focus(); return; }
    if (toLatin(cust.phone).replace(/\D/g, "").length < 7) { toast(uiRaw("co_err_phone")); f.phone.focus(); return; }
    if (intl && f.country.value === "__other" && !f.other.value.trim()) { toast(uiRaw("co_err_country")); f.other.focus(); return; }
    if (intl && !cust.city) { toast(uiRaw("co_err_city")); f.cityIntl.focus(); return; }
    if (intl && cust.address.length < 6) { toast(uiRaw("co_err_addr")); f.address.focus(); return; }
    const btn = $("button[type=submit]", f); btn.disabled = true; btn.textContent = uiRaw("co_sending");
    const items = cartLines().map((l) => ({ id: l.id, qty: l.qty }));
    const { data, error } = await sendOrder(cust, items, f.website ? f.website.value : "");
    if (error) {
      btn.disabled = false; btn.textContent = uiRaw("co_submit");
      const m = String(error.message || "");
      toast(uiRaw(m.includes("out_of_stock") ? "co_err_stock" : m.includes("product_unavailable") ? "co_err_gone" : m.includes("invalid_phone") ? "co_err_phone"
        : m.includes("rate_limited") ? "co_err_busy" : m.includes("captcha_failed") ? "co_err_human" : "co_err_failed"));
      return;
    }
    forgetCheckoutKey();
    const s = state.s;
    // the message the customer sends on WhatsApp, in the customer's language
    const cur = s.shop.currency, addr = cust.address ? " — " + cust.address : "", nameOf = (i) => (findProd(i.id) || {}).name || i.name;
    const msg = [uiRaw("wa_order", { brand: s.brand.full }), `${uiRaw("wa_order_no")}: #${data.order_no}`, `${uiRaw("form_name")}: ${cust.name}`, `${uiRaw("lbl_phone")}: ${cust.phone}`,
      intl ? `${uiRaw("co_country")}: ${place(country)} — ${cust.city}${addr}` : `${uiRaw("co_city")}: ${place(cust.city)}${addr}`, "", `${uiRaw("wa_items")}:`,
      ...data.items.map((i) => `• ${nameOf(i)} × ${i.qty} — ${num(i.price * i.qty)} ${cur}`), "",
      `${uiRaw(intl ? "co_intl_shipping" : "co_delivery")}: ${data.shipping_tbd ? uiRaw("tbd") : data.delivery ? num(data.delivery) + " " + cur : uiRaw("free")}`,
      `${uiRaw("co_total")}: ${num(data.total)} ${cur}${data.shipping_tbd ? " " + uiRaw("co_plus_shipping") : ""}`, cust.notes ? `${uiRaw("wa_notes")}: ${cust.notes}` : ""].filter((x) => x !== undefined).join("\n");
    const wa = s.shop.whatsapp_orders ? waLink(msg) : "";
    state.cart = []; saveCart(); renderCart();
    $("#checkout").innerHTML = `<div class="success"><div class="ok">${A.ui.check}</div>
      <h3>${ui("ok_title")}</h3><p style="color:var(--soft)">${ui("ok_text", { name: cust.name })}</p>
      <div class="no">#${esc(data.order_no)}</div><p style="margin-top:0;color:var(--soft)">${ui("ok_no")} · ${ui("co_total")} ${money(data.total)}${data.shipping_tbd ? " " + ui("co_plus_shipping") : ""}</p>
      ${data.shipping_tbd ? `<p style="color:var(--soft);font-size:14px">${esc(s.shop.intl_note)}</p>` : ""}
      ${wa ? `<a class="btn wa block" href="${esc(wa)}" target="_blank" rel="noopener" style="margin-bottom:10px">${A.ui.whatsapp} ${ui("ok_wa")}</a>` : ""}
      <button class="btn glass-btn block" type="button" id="coDone">${ui("ok_continue")}</button></div>`;
    $("#coDone").addEventListener("click", () => { closeCheckout(); location.hash = "#/"; });
    if (G) G.from(".success > *", { y: 24, opacity: 0, stagger: 0.08, duration: 0.7, ease: "expo.out" });
  }

  /* ---------- search ---------- */
  function openSearch() {
    $("#search").classList.add("open"); $("#search").setAttribute("aria-hidden", "false"); lock(true);
    setTimeout(() => $("#searchInput").focus(), 60); doSearch();
  }
  function closeSearch() { $("#search").classList.remove("open"); $("#search").setAttribute("aria-hidden", "true"); lock(false); }
  // same rules as private.ar_norm() in the database
  function norm(t) {
    return toLatin(String(t || "")).replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
      .replace(/ؤ/g, "و").replace(/ئ/g, "ي").toLowerCase().replace(/\s+/g, " ").trim();
  }
  let searchT = 0, searchSeq = 0;
  function showResults(list, total) {
    $("#searchRes").innerHTML = list.length ? `<p class="count" style="color:var(--soft)">${uiN("search_results", total)}</p>${grid(list)}` : `<div class="empty">${ui("search_none", { q: $("#searchInput").value })}</div>`;
  }
  function searchLocal(q) {
    const src = (o) => (o && o._src) || {};
    const all = state.prods.filter((p) => norm([p.name, p.stone, p.metal, p.badge, p.description, (catOf(p) || {}).name, (subOf(p) || {}).name,
      src(p).name, src(p).stone, src(p).description, src(catOf(p)).name, src(subOf(p)).name].join(" ")).includes(q));
    showResults(all.slice(0, 24), all.length);
  }
  function doSearch() {
    const raw = $("#searchInput").value.trim(), q = norm(raw);
    const res = $("#searchRes");
    clearTimeout(searchT); const seq = ++searchSeq;
    if (!q) { res.innerHTML = `<div class="seg">${state.cats.map((c) => `<a class="chip" href="#/c/${esc(c.slug)}">${esc(c.name)}</a>`).join("")}</div>`; return; }
    if (state.complete) { searchLocal(q); return; }
    searchT = setTimeout(async () => {
      const r = await rpcGet("search_products", { p_q: raw.slice(0, 80), p_limit: PAGE });
      if (seq !== searchSeq) return;
      if (r.error || !r.data) { searchLocal(q); return; }     // offline: search what is already loaded
      showResults((r.data.items || []).map(remember), r.data.total || 0);
    }, 220);
  }
  $("#searchInput").addEventListener("input", doSearch);
  $("#searchClose").addEventListener("click", closeSearch);
  $("#searchRes").addEventListener("click", (e) => { if (e.target.closest("a")) closeSearch(); });

  /* ---------- motion ---------- */
  let cleanups = [];
  let introPromise = Promise.resolve();
  function killMotion() {
    stopGlobe();
    cleanups.forEach((f) => f()); cleanups = [];
    if (window.ScrollTrigger) window.ScrollTrigger.getAll().forEach((t) => t.kill());
    if (G) G.set("footer.site .mark", { clearProps: "all" }); // the footer lives outside the routed view
  }
  function animateCommon() {
    if (!G) return;
    const ST = window.ScrollTrigger;
    $$("[data-split]").forEach((h) => {
      G.fromTo($$(".w", h), { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: h, start: "top 95%", once: true } });
    });
    $$("[data-rv]").forEach((el) => {
      G.fromTo(el, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, ease: "expo.out", clearProps: "transform", scrollTrigger: { trigger: el, start: "top 97%", once: true } });
    });
    $$("[data-clip]").forEach((el) => {
      G.fromTo(el, { clipPath: "inset(100% 0% 0% 0% round 36px)" }, { clipPath: "inset(0% 0% 0% 0% round 36px)", duration: 1.5, ease: "expo.inOut", scrollTrigger: { trigger: el, start: "top 82%", once: true }, onComplete: () => G.set(el, { clearProps: "clipPath" }) });
    });
    $$("[data-stagger]").forEach((box) => {
      G.fromTo(box.children, { opacity: 0, y: 50, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 1, ease: "expo.out", stagger: 0.05, scrollTrigger: { trigger: box, start: "top 88%", once: true }, onComplete: () => G.set(box.children, { clearProps: "transform" }) });
    });
    $$("[data-batch]").forEach((box) => {
      G.set(box.children, { opacity: 0, y: 50 });
      ST.batch(box.children, { start: "top 92%", once: true, onEnter: (els) => G.to(els, { opacity: 1, y: 0, duration: 1, ease: "expo.out", stagger: 0.08, onComplete: () => G.set(els, { clearProps: "transform" }) }) });
    });
    magnet();
  }
  function animateHome() {
    animateCommon();
    if (!G) return;
    // hero entrance, played once the opening has finished
    const tl = G.timeline({ paused: true, delay: 0.05 });
    introPromise.then(() => tl.play());
    $(".hero").classList.add("spot-on");
    const flip0 = $("[data-flip] .fw.on");
    tl.fromTo(".hero h1 .w", { yPercent: 120, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.3, ease: "expo.out", stagger: 0.09 });
    if (flip0) tl.fromTo(flip0, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.2, ease: "expo.out" }, 0.15);
    tl
      .fromTo("[data-hero]", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.1 }, "-=1")
      .fromTo("#deck", { y: 80, opacity: 0, rotateX: 18, scale: 0.92 }, { y: 0, opacity: 1, rotateX: 0, scale: 1, duration: 1.6, ease: "expo.out" }, 0)
      .fromTo("[data-orbit]", { scale: 0.6, opacity: 0, rotate: -90 }, { scale: 1, opacity: 1, rotate: 0, duration: 2.2, ease: "expo.out" }, 0.1);
    // the embroidered frame and its roses open once the card has landed
    const orn = $(".hero .orn");
    if (orn) tl.fromTo([$(".orn-frame", orn), ...$$(".orn-foot", orn)], { opacity: 0, scale: 0.9, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 2, ease: "expo.out", stagger: 0.25 }, 0.9);
    // parallax
    G.to("[data-show]", { yPercent: -10, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    G.to("[data-orbit]", { rotate: 60, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    const pic = $("[data-feature-pic] > svg, [data-feature-pic] > img");
    if (pic) G.fromTo(pic, { scale: 1.18, rotate: -6 }, { scale: 1, rotate: 0, ease: "none", scrollTrigger: { trigger: "[data-feature]", start: "top bottom", end: "bottom top", scrub: true } });
    const feat = $("[data-feature]");
    if (feat) G.fromTo(feat, { scale: 0.94, opacity: 0.5 }, { scale: 1, opacity: 1, ease: "none", scrollTrigger: { trigger: feat, start: "top 95%", end: "top 50%", scrub: true } });
    // about text: each word lights up as it scrolls through the viewport
    const lit = $("[data-lit]");
    // words light up as the reader scrolls, but are never too faint to read
    if (lit) G.fromTo($$(".lw", lit), { opacity: 0.68 }, { opacity: 1, ease: "none", stagger: 0.08, scrollTrigger: { trigger: lit, start: "top 88%", end: "center 55%", scrub: true } });
    // showroom: vertical scroll drives a horizontal walk through the pieces (desktop)
    const track = $("#roomTrack");
    if (track && innerWidth > 920) {
      const dist = () => Math.max(0, track.scrollWidth - track.clientWidth + 40);
      G.to(track, { x: () => (LTR ? -1 : 1) * dist(), ease: "none", scrollTrigger: { trigger: "#showroom", start: "top top", end: () => "+=" + dist(), pin: ".room-pin", scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 } });
      $$(".room-card .room-ph > svg, .room-card .room-ph > img", track).forEach((el) => G.fromTo(el, { rotate: -8 }, { rotate: 8, ease: "none", scrollTrigger: { trigger: "#showroom", start: "top top", end: () => "+=" + dist(), scrub: true } }));
    }
  }
  function magnet() {
    if (!fine) return;
    $$("[data-magnet]").forEach((el) => {
      const xTo = G.quickTo(el, "x", { duration: 0.6, ease: "power3" }), yTo = G.quickTo(el, "y", { duration: 0.6, ease: "power3" });
      el.addEventListener("mousemove", (e) => { const r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * 0.25); yTo((e.clientY - r.top - r.height / 2) * 0.35); });
      el.addEventListener("mouseleave", () => { xTo(0); yTo(0); });
    });
    $$("[data-tilt]").forEach((el) => {
      const rx = G.quickTo(el, "rotateX", { duration: 0.8, ease: "power3" }), ry = G.quickTo(el, "rotateY", { duration: 0.8, ease: "power3" });
      G.set(el.parentElement, { perspective: 1000 });
      el.parentElement.addEventListener("mousemove", (e) => { const r = el.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - 0.5) * 14); rx(-((e.clientY - r.top) / r.height - 0.5) * 14); });
      el.parentElement.addEventListener("mouseleave", () => { rx(0); ry(0); });
    });
  }

  /* ---------- globe: Karbala and the countries we ship to ---------- */
  const PLACES = { "العراق": [32.62, 44.02], "السعودية": [24.71, 46.68], "الكويت": [29.37, 47.98], "الإمارات": [25.2, 55.27], "قطر": [25.29, 51.53], "البحرين": [26.23, 50.59], "عُمان": [23.59, 58.38], "عمان": [23.59, 58.38],
    "الأردن": [31.95, 35.93], "لبنان": [33.89, 35.5], "سوريا": [33.51, 36.29], "إيران": [35.69, 51.39], "تركيا": [41.01, 28.98], "مصر": [30.04, 31.24], "المملكة المتحدة": [51.51, -0.13], "بريطانيا": [51.51, -0.13],
    "ألمانيا": [52.52, 13.4], "السويد": [59.33, 18.07], "هولندا": [52.37, 4.9], "فرنسا": [48.86, 2.35], "الدنمارك": [55.68, 12.57], "النرويج": [59.91, 10.75], "بلجيكا": [50.85, 4.35], "النمسا": [48.21, 16.37], "فنلندا": [60.17, 24.94],
    "إيطاليا": [41.9, 12.5], "إسبانيا": [40.42, -3.7], "الولايات المتحدة": [42.33, -83.05], "أمريكا": [42.33, -83.05], "كندا": [43.65, -79.38], "أستراليا": [-33.87, 151.21], "نيوزيلندا": [-36.85, 174.76], "الهند": [28.61, 77.21], "باكستان": [33.68, 73.05], "أذربيجان": [40.41, 49.87], "روسيا": [55.76, 37.62], "ماليزيا": [3.14, 101.69] };
  let globe = null, globeIO = null;
  const scripts = {};
  const loadScript = (src) => scripts[src] || (scripts[src] = new Promise((ok, fail) => { const el = document.createElement("script"); el.src = src; el.async = true; el.onload = ok; el.onerror = () => { delete scripts[src]; fail(); }; document.head.appendChild(el); }));
  const GLOBE_JS = "assets/vendor/cobe.min.js?v=c673039448";
  function stopGlobe() { if (globe) { globe.destroy(); globe = null; } if (globeIO) { globeIO.disconnect(); globeIO = null; } }
  function startGlobe() {
    stopGlobe();
    const cv = $("#globe");
    if (!cv) return;
    if (!window.createGlobe) {
      if (!("IntersectionObserver" in window)) return;
      globeIO = new IntersectionObserver(([en]) => {
        if (!en.isIntersecting) return;
        globeIO.disconnect(); globeIO = null;
        loadScript(GLOBE_JS).then(() => { if (document.contains(cv)) startGlobe(); }).catch(() => cv.closest(".globe-wrap").classList.add("no-webgl"));
      }, { rootMargin: "900px" });
      globeIO.observe(cv);
      return;
    }
    const css = getComputedStyle(document.documentElement);
    const rgb = (v) => { const h = (css.getPropertyValue(v).trim() || "#34e3a8").replace("#", ""); const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6); return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255); };
    const light = document.documentElement.getAttribute("data-theme") === "light";
    const markers = [{ location: PLACES["العراق"], size: 0.11 }];
    (state.s.shop.countries || []).forEach((c) => { const loc = PLACES[c]; if (loc) markers.push({ location: loc, size: 0.045 }); });
    const small = innerWidth < 700;
    const dpr = Math.min(small ? 1.5 : 2, devicePixelRatio || 1);
    // face Karbala first: phi turns the globe to its longitude
    let phi = Math.PI - ((44.02 * Math.PI) / 180 - Math.PI / 2), drag = null, dragDelta = 0, vel = 0, size = 0;
    const theta = 0.42;
    const measure = () => { size = cv.offsetWidth; };
    measure();
    try {
      globe = window.createGlobe(cv, {
        devicePixelRatio: dpr, width: size * dpr, height: size * dpr, phi, theta, dark: light ? 0 : 1, diffuse: light ? 1.4 : 2,
        mapSamples: small ? 12000 : 18000, mapBrightness: light ? 4.5 : 9, mapBaseBrightness: light ? 0.05 : 0.02,
        baseColor: light ? [1, 1, 1] : rgb("--silver").map((x) => Math.min(1, x * 0.85)),
        markerColor: light ? rgb("--accent") : rgb("--emerald"), glowColor: light ? [0.9, 0.9, 0.86] : rgb("--emerald").map((x) => x * 0.55),
        markers, opacity: light ? 0.9 : 0.95,
        onRender: (st) => {
          if (drag === null) { phi += 0.0028 + vel; vel *= 0.94; }
          st.phi = phi + dragDelta; st.width = size * dpr; st.height = size * dpr;
        }
      });
    } catch (e) { cv.closest(".globe-wrap").classList.add("no-webgl"); return; }
    cv.closest(".globe-wrap").classList.add("ready");
    G && G.fromTo(cv, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 1.1, ease: "expo.out" });
    // drag to spin
    cv.onpointerdown = (e) => { drag = e.clientX; cv.setPointerCapture(e.pointerId); cv.style.cursor = "grabbing"; };
    cv.onpointermove = (e) => { if (drag !== null) dragDelta = (e.clientX - drag) / 180; };
    const up = () => { if (drag === null) return; phi += dragDelta; vel = Math.max(-0.05, Math.min(0.05, dragDelta / 12)); dragDelta = 0; drag = null; cv.style.cursor = "grab"; };
    cv.onpointerup = up; cv.onpointercancel = up;
    let rt; const onR = () => { clearTimeout(rt); rt = setTimeout(measure, 120); }; addEventListener("resize", onR, { passive: true });
    cleanups.push(() => removeEventListener("resize", onR));
    // draw only while it is on screen
    if ("IntersectionObserver" in window) {
      globeIO = new IntersectionObserver(([en]) => { if (globe) globe.toggle(en.isIntersecting); }, { rootMargin: "120px" });
      globeIO.observe(cv);
    }
  }

  /* ---------- ambient light: spotlight cards, cursor glow ---------- */
  function ambient() {
    // spotlight + 3D tilt + glare follow the pointer (mouse / trackpad only)
    let tiltEl = null;
    const resetTilt = (el) => { el.classList.remove("moving", "follow"); el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); };
    document.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const t = e.target.closest ? e.target : null; if (!t) return;
      const sp = t.closest(".spot");
      if (sp) { const r = sp.getBoundingClientRect(); sp.style.setProperty("--mx", `${e.clientX - r.left}px`); sp.style.setProperty("--my", `${e.clientY - r.top}px`); }
      const ed = t.closest(".edge");
      if (ed) { const r = ed.getBoundingClientRect(); const a = Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI; ed.classList.add("follow"); ed.style.setProperty("--ang", `${(a - 266).toFixed(1)}deg`); }
      const el = reduce ? null : t.closest(".tilt");
      if (tiltEl && tiltEl !== el) resetTilt(tiltEl);
      tiltEl = el;
      if (!el) return;
      const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.classList.add("moving");
      el.style.setProperty("--ry", `${((px - 0.5) * 10).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${(-(py - 0.5) * 10).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
    }, { passive: true });
    document.addEventListener("pointerleave", () => { if (tiltEl) resetTilt(tiltEl); tiltEl = null; });
    if (fine && G) {
      const light = $("#cursorLight");
      const lx = G.quickTo(light, "x", { duration: 0.9, ease: "power3" }), ly = G.quickTo(light, "y", { duration: 0.9, ease: "power3" });
      addEventListener("pointermove", (e) => { if (e.pointerType !== "mouse") return; light.style.opacity = 1; lx(e.clientX); ly(e.clientY); }, { passive: true });
    }
    // pause every CSS animation inside sections that are off screen
    if ("IntersectionObserver" in window) {
      const off = new IntersectionObserver((es) => es.forEach((en) => en.target.classList.toggle("offscreen", !en.isIntersecting)), { rootMargin: "150px 0px" });
      const watchOff = () => $$("#app > section:not([data-off]), #app > header:not([data-off]), #app > .band:not([data-off]), #app .wrap > section:not([data-off]), footer.site:not([data-off]), .topbar:not([data-off])").forEach((el) => { el.dataset.off = "1"; off.observe(el); });
      new MutationObserver(watchOff).observe(app, { childList: true });
      watchOff();
    }
    // glowing border beams run only while their card is on screen
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => es.forEach((en) => en.target.classList.toggle("in-view", en.isIntersecting)), { rootMargin: "0px 0px -10% 0px" });
      const watch = () => $$(".edge.lit:not([data-io])").forEach((el) => { el.dataset.io = "1"; io.observe(el); });
      new MutationObserver(watch).observe(app, { childList: true });
      watch();
    }
  }
  let lenis = null;
  function smoothScroll() {
    if (reduce || !window.Lenis || !G || !fine) return;
    lenis = new window.Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on("scroll", () => window.ScrollTrigger && window.ScrollTrigger.update());
    G.ticker.add((t) => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
  }
  function jumpTop() { if (lenis) lenis.scrollTo(0, { immediate: true, force: true }); else scrollTo(0, 0); }
  function scrollToId(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const off = -($("#nav").offsetHeight + 10);
    if (lenis) { lenis.scrollTo(el, { offset: off, duration: 1.4 }); return; }
    window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + off, behavior: reduce ? "auto" : "smooth" });
  }

  /* nav hide / show */
  let lastY = 0;
  addEventListener("scroll", () => {
    const y = scrollY, nav = $("#nav");
    nav.classList.toggle("scrolled", y > 10);
    nav.classList.toggle("hide", y > 400 && y > lastY + 4 && !document.body.classList.contains("locked"));
    if (y < lastY - 4) nav.classList.remove("hide");
    lastY = y;
  }, { passive: true });

  /* ---------- router ---------- */
  function parse() {
    const h = location.hash.replace(/^#/, "") || "/";
    const [path, query = ""] = h.split("?");
    const parts = path.split("/").filter(Boolean);
    const qs = new URLSearchParams(query);
    return { parts, to: qs.get("to") };
  }
  function render() {
    killMotion();
    const { parts, to } = parse();
    const key = parts.join("/") || "home";
    state.view = key;
    $$(".nav-links a").forEach((a) => a.classList.toggle("on", a.dataset.link === (parts[0] || "home")));
    if (!parts.length) renderHome(to);
    else if (parts[0] === "shop") renderShop(null);
    else if (parts[0] === "c") renderShop(decodeURIComponent(parts[1] || ""), null, parts[2] ? decodeURIComponent(parts[2]) : null);
    else if (parts[0] === "p") renderProduct(decodeURIComponent(parts[1] || ""));
    else renderHome();
    if (window.ScrollTrigger) requestAnimationFrame(() => window.ScrollTrigger.refresh());
    fabCheck(); setTimeout(fabCheck, 900);
  }
  let busy = false;
  function navigate() {
    const { parts, to } = parse();
    closePanel("menu"); closePanel("cart"); closeSearch(); toggleLangPop(false);
    // the browser's Back button while the order form is open: close the form with the page
    if ($("#checkoutBg").classList.contains("open")) closeCheckout();
    if (!parts.length && state.view === "home" && to) { scrollToId(to); return; }
    if (!G || busy) { render(); jumpTop(); if (to) setTimeout(() => scrollToId(to), 60); return; }
    busy = true;
    app.classList.add("leaving");
    setTimeout(() => {
      jumpTop(); render();
      app.classList.remove("leaving");
      G.fromTo(app, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out", clearProps: "all", onComplete: () => { busy = false; } });
      if (to) setTimeout(() => scrollToId(to), 120);
    }, 180);
  }
  addEventListener("hashchange", navigate);

  /* ---------- static bindings ---------- */
  $("#menuBtn").innerHTML = A.ui.menu;
  $("#themeBtn").innerHTML = A.ui.sun.replace("<svg ", '<svg class="i-sun" ') + A.ui.moon.replace("<svg ", '<svg class="i-moon" ');
  $("#themeBtn").addEventListener("click", toggleTheme);
  $("#searchBtn").innerHTML = A.ui.search;
  $("#cartBtn").insertAdjacentHTML("afterbegin", A.ui.cart);
  $("#searchClose").innerHTML = A.ui.close;
  $$("[data-close]").forEach((b) => { if (!b.innerHTML.trim()) b.innerHTML = A.ui.close; });
  $("#menuBtn").addEventListener("click", () => openPanel("menu"));
  $("#cartBtn").addEventListener("click", () => { renderCart(); openPanel("cart"); });
  $("#searchBtn").addEventListener("click", openSearch);
  // language links are built once; the page the visitor is on is read at click time
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-lang]");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault(); location.href = langHref(a.dataset.lang);
  });
  if ($("#langBtn")) {
    $("#langBtn").addEventListener("click", (e) => { e.stopPropagation(); toggleLangPop(); });
    document.addEventListener("click", (e) => { if (!e.target.closest("#langPop")) toggleLangPop(false); });
  }
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closePanel("menu"); closePanel("cart"); closeSearch(); toggleLangPop(false); if ($("#checkoutBg").classList.contains("open")) closeCheckout();
  });

  /* ---------- boot ---------- */
  (async function boot() {
    const hadCache = !!safeLS(() => localStorage.getItem("rq_cache"), null);
    const loading = load();
    // a first visit waits briefly so the intro knows whether a logo video was uploaded
    if (!hadCache) await Promise.race([loading, new Promise((r) => setTimeout(r, 450))]);
    const safe = (fn) => { try { fn(); } catch (e) { console.warn("effect skipped", e); } };
    applySettings();
    safe(ambient);
    safe(smoothScroll);
    try { introPromise = intro(); } catch (e) { const el = $("#intro"); if (el) el.remove(); introPromise = Promise.resolve(); }
    if (state.ready) { render(); updateCartCount(); }
    else app.innerHTML = `<div class="wrap" style="padding-block:80px"><div class="grid">${'<div class="skeleton" style="aspect-ratio:3/4"></div>'.repeat(4)}</div></div>`;
    const changed = await loading;
    if (changed) { applySettings(); render(); updateCartCount(); }
    offlineNote();
    ensureCartProducts().catch(() => {});
    await introPromise;
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    if (state.s.shop.intl_enabled) {
      const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1200));
      if (!window.createGlobe) idle(() => loadScript(GLOBE_JS).catch(() => {}), { timeout: 3000 });
    }
  })();
})();
