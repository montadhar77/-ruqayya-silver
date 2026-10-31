/* =========================================================================
   معرض رقية (عليها السلام) — public site
   Data: Supabase (settings, categories, products, place_order, inquiries)
   Motion: GSAP + ScrollTrigger (respects "reduce motion")
   ========================================================================= */
(() => {
  "use strict";
  const A = window.RQ_ART;
  const cfg = window.RQ_CONFIG;
  const db = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: false, autoRefreshToken: false } });

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
  const num = (n) => Number(n || 0).toLocaleString("ar-IQ");
  const money = (n) => `${num(n)} ${esc(state.s.shop.currency || "د.ع")}`;
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
  const isAr = (t) => /[\u0600-\u06FF]/.test(t || "");
  const eyebrow = (t, attrs = "") => t ? `<span class="${isAr(t) ? "eyebrow" : "latin"}" ${attrs}>${esc(t)}</span>` : "";
  const catOf = (p) => state.cats.find((c) => c.id === p.category_id);
  const iconOf = (p) => (catOf(p) || {}).icon || "star";
  const findProd = (id) => state.prods.find((p) => p.id === id);
  const inStock = (p) => p.stock === null || p.stock === undefined || p.stock > 0;
  let toastT;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("show"), 2400);
  }
  function lock(on) {
    const locked = on || !!$(".drawer.open, .modal-bg.open, .search-bg.open");
    document.body.classList.toggle("locked", locked);
    if (lenis) { if (locked) lenis.stop(); else lenis.start(); }
  }
  function safeLS(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }

  /* ---------- data ---------- */
  function applyData(settings, cats, prods) {
    state.s = window.rqMerge(window.RQ_DEFAULTS, settings || {});
    state.cats = cats || [];
    state.prods = prods || [];
  }
  async function fetchAll() {
    const [s, c, p] = await Promise.all([
      db.from("settings").select("data").eq("id", 1).maybeSingle(),
      db.from("categories").select("*").eq("active", true).order("sort").order("created_at"),
      db.from("products").select("*").eq("active", true).order("sort").order("created_at", { ascending: false })
    ]);
    if (s.error || c.error || p.error) throw s.error || c.error || p.error;
    return { settings: (s.data && s.data.data) || {}, cats: c.data || [], prods: p.data || [] };
  }
  async function load() {
    const cached = safeLS(() => JSON.parse(localStorage.getItem("rq_cache") || "null"), null);
    if (cached) { applyData(cached.settings, cached.cats, cached.prods); state.sig = JSON.stringify(cached); state.ready = true; }
    try {
      const fresh = await fetchAll();
      const sig = JSON.stringify(fresh);
      safeLS(() => localStorage.setItem("rq_cache", sig));
      const changed = sig !== state.sig;
      applyData(fresh.settings, fresh.cats, fresh.prods);
      state.sig = sig;
      state.ready = true;
      return changed;
    } catch (e) {
      console.warn("Could not load data", e);
      state.ready = true;
      return !cached;
    }
  }

  /* ---------- light / dark ---------- */
  function resolveMode(m) { return m === "light" ? "light" : m === "system" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : "dark"; }
  function syncThemeMeta() {
    const cs = getComputedStyle(document.documentElement);
    const tc = $('meta[name="theme-color"]'); if (tc) tc.setAttribute("content", cs.getPropertyValue("--deep").trim());
    if (window.__rqSparkColor) window.__rqSparkColor(cs.getPropertyValue("--emerald").trim());
  }
  function setTheme(mode, save) {
    document.documentElement.setAttribute("data-theme", mode);
    if (save) safeLS(() => localStorage.setItem("rq_theme", mode));
    syncThemeMeta();
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
    document.body.classList.toggle("no-jasmine", t.jasmine === false);
    if (!safeLS(() => localStorage.getItem("rq_theme"), null)) setTheme(resolveMode(t.mode), false);
    document.title = s.seo.title || s.brand.full;
    const md = $('meta[name="description"]'); if (md) md.setAttribute("content", s.seo.description || "");
    syncThemeMeta();
    if (s.brand.favicon) $("#favicon").href = s.brand.favicon;

    // brand
    const logo = $("#brandLogo");
    logo.src = s.brand.logo || LOGO_MARK; logo.alt = `شعار ${s.brand.full}`; logo.hidden = false;
    $("#brandName").textContent = s.brand.name;
    $("#brandSub").textContent = /عليها السلام/.test(s.brand.full) ? "عليها السلام" : s.brand.tagline;

    // announcement marquee
    const items = (s.announcement.items || []).filter(Boolean);
    const tb = $("#topbar");
    if (s.announcement.enabled && items.length) {
      const row = items.map((i) => `<span>${esc(i)}</span>`).join("");
      $("#topTrack").innerHTML = row + row + row + row;
      tb.hidden = false;
    } else tb.hidden = true;

    // whatsapp float
    const wa = $("#waFloat"), wl = waLink(`السلام عليكم، أودّ الاستفسار من ${s.brand.full}`);
    if (wl) { wa.href = wl; wa.innerHTML = A.ui.whatsapp; wa.hidden = false; } else wa.hidden = true;

    // mobile menu
    $("#menuList").innerHTML =
      `<a href="#/">الرئيسية <small>${A.ui.arrowL}</small></a><a href="#/shop">كل المنتجات <small>${num(state.prods.length)}</small></a>` +
      state.cats.map((c) => `<a href="#/c/${esc(c.slug)}">${esc(c.name)} <small>${num(state.prods.filter((p) => p.category_id === c.id).length)}</small></a>`).join("") +
      `<a href="#/?to=visit">تواصل معنا <small>${A.ui.arrowL}</small></a>`;
    $$("#menuList small svg").forEach((sv) => { sv.style.width = "18px"; });

    renderFooter();
  }

  function socialLinks(cls = "icon-btn") {
    const c = state.s.contact;
    const map = [["instagram", "انستغرام"], ["facebook", "فيسبوك"], ["tiktok", "تيك توك"], ["telegram", "تيليغرام"], ["snapchat", "سناب شات"]];
    let out = map.filter(([k]) => c[k]).map(([k, n]) => `<a class="${cls}" href="${esc(c[k])}" target="_blank" rel="noopener" aria-label="${n}">${A.ui[k]}</a>`).join("");
    const wl = waLink("السلام عليكم");
    if (wl) out = `<a class="${cls}" href="${esc(wl)}" target="_blank" rel="noopener" aria-label="واتساب">${A.ui.whatsapp}</a>` + out;
    return out;
  }

  function renderFooter() {
    const s = state.s;
    $("#footer").innerHTML = `<div class="jas j-foot">${A.jasmine()}</div><div class="wrap">
      <p class="mark grad" aria-hidden="true">${esc(s.brand.name)}</p>
      <div class="cols">
        <div><img class="f-logo" src="${esc(s.brand.logo || LOGO_FULL)}" alt="${esc(s.brand.full)}" loading="lazy"><h4>${esc(s.brand.full)}</h4><p>${esc(s.footer.text)}</p><div class="socials">${socialLinks()}</div></div>
        <div><h4>الأقسام</h4><ul>${state.cats.slice(0, 6).map((c) => `<li><a href="#/c/${esc(c.slug)}">${esc(c.name)}</a></li>`).join("")}</ul></div>
        <div><h4>تواصل</h4><ul>
          ${s.contact.address ? `<li>${esc(s.contact.address)}</li>` : ""}
          ${s.contact.phone ? `<li><a href="tel:${esc(toLatin(s.contact.phone).replace(/[^\d+]/g, ""))}" dir="ltr">${esc(s.contact.phone)}</a></li>` : ""}
          ${s.contact.hours ? `<li>${esc(s.contact.hours)}</li>` : ""}
          <li><a href="#/shop">المتجر</a></li>
        </ul></div>
      </div>
      <div class="copy">© ${new Date().getFullYear().toLocaleString("ar-IQ", { useGrouping: false })} — ${esc(s.footer.copyright)}</div>
    </div>`;
  }

  /* ---------- intro ---------- */
  function intro() {
    const el = $("#intro");
    const s = state.s.intro;
    const seen = safeLS(() => sessionStorage.getItem("rq_intro"), null);
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return; done = true;
        safeLS(() => sessionStorage.setItem("rq_intro", "1"));
        if (G) G.to(el, { clipPath: "circle(0% at 50% 50%)", duration: 1.1, ease: "expo.inOut", onComplete: () => el.remove() });
        else el.remove();
        setTimeout(resolve, G ? 500 : 0);
      };
      if (!s.enabled || (seen && !s.every_visit)) { el.remove(); resolve(); return; }
      if (G) G.set(el, { clipPath: "circle(150% at 50% 50%)" });
      $("#introSkip").addEventListener("click", finish);
      const max = Math.max(3, Math.min(30, Number(s.max_seconds) || 9)) * 1000;
      if (s.video) {
        $("#introMark").hidden = true;
        const v = document.createElement("video");
        Object.assign(v, { src: s.video, muted: true, playsInline: true, autoplay: true, preload: "auto" });
        v.setAttribute("playsinline", ""); v.setAttribute("muted", "");
        const fallback = () => { v.remove(); $("#introMark").hidden = false; logoReveal(finish); };
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
  function logoReveal(finish) {
    const s = state.s;
    const logo = $("#introLogo");
    $("#introName").textContent = s.brand.name;
    $("#introSub").textContent = s.intro.subtitle || s.brand.tagline;
    logo.src = s.brand.logo || LOGO_FULL; logo.hidden = false; $("#introArch").style.display = "none"; $("#introName").hidden = true;
    if (!G) { $$("#introMark > *").forEach((e) => (e.style.opacity = 1)); setTimeout(finish, 1200); return; }
    const paths = $$("#introArch circle, #introArch path");
    paths.forEach((p) => { const l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = l; });
    const tl = G.timeline({ onComplete: () => setTimeout(finish, 450) });
    tl.to("#introBloom", { scale: 1, duration: 2.4, ease: "expo.out" }, 0);
    tl.fromTo(logo, { opacity: 0, scale: 0.6, filter: "blur(16px) brightness(2.2)" }, { opacity: 1, scale: 1, filter: "blur(0px) brightness(1)", duration: 1.6, ease: "expo.out" }, 0.2);
    tl.fromTo("#introSub", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, "-=0.7");
  }

  /* ---------- small renderers ---------- */
  function media(p) {
    const imgs = (p.images || []).filter(Boolean);
    if (imgs.length) {
      return `<img class="main" src="${esc(imgs[0])}" alt="${esc(p.name)}" loading="lazy" decoding="async">` +
        (imgs[1] ? `<img class="alt" src="${esc(imgs[1])}" alt="" loading="lazy" decoding="async">` : "");
    }
    return A.productArt(p, iconOf(p));
  }
  function priceHTML(p) {
    return `${money(p.price)}${p.old_price && p.old_price > p.price ? `<s>${num(p.old_price)}</s>` : ""}`;
  }
  function card(p) {
    const c = catOf(p);
    const out = !inStock(p);
    return `<article class="card glass spot edge" data-card>
      <div class="ph">${out ? `<span class="tag out">نفدت الكمية</span>` : p.badge ? `<span class="tag">${esc(p.badge)}</span>` : ""}${media(p)}</div>
      <h4>${esc(p.name)}</h4>
      <div class="meta">${esc([c && c.name, p.stone || p.metal].filter(Boolean).join(" · "))}</div>
      <div class="row"><span class="price">${priceHTML(p)}</span>
        ${out ? "" : `<button class="add" type="button" data-add="${p.id}" aria-label="أضف ${esc(p.name)} إلى السلة">${A.ui.plus}</button>`}</div>
      <a class="stretch" href="#/p/${p.id}" aria-label="${esc(p.name)}"></a>
    </article>`;
  }
  function grid(list, empty = "لا توجد منتجات في هذا القسم حالياً — قريباً بإذن الله.") {
    return list.length ? `<div class="grid" data-batch>${list.map(card).join("")}</div>` : `<div class="empty">${empty}</div>`;
  }
  function splitWords(text, wordCls = "") {
    return esc(text).split(/\s+/).filter(Boolean).map((w) => `<span class="wl"><span class="w ${wordCls}">${w}</span></span>`).join(" ");
  }
  function titleBlock(eb, title, text, flower) {
    return `<div class="title">${flower ? `<span class="jas j-title">${A.jasmine("flower")}</span>` : ""}${eb ? `<div data-rv>${eyebrow(eb)}</div>` : ""}
      <h2 data-split>${splitWords(title)}</h2>${text ? `<p data-rv>${esc(text)}</p>` : ""}</div>`;
  }
  const orbitSVG = () => `<svg viewBox="0 0 500 500" aria-hidden="true">
      <circle class="o" cx="250" cy="250" r="246"/><circle class="o" cx="250" cy="250" r="196" stroke-dasharray="2 6"/><circle class="o" cx="250" cy="250" r="150"/>
      <g class="g1"><circle class="sat" cx="250" cy="4" r="4"/><circle class="sat gold" cx="496" cy="250" r="3"/></g>
      <g class="g2"><circle class="sat" cx="250" cy="446" r="3"/><circle class="sat" cx="54" cy="250" r="2.5"/></g></svg>`;

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
      slides = pool.map((p) => ({ art: A.productArt(p, iconOf(p)), title: p.name, cap: [p.stone, p.metal].filter(Boolean).join(" · "), link: `#/p/${p.id}` }));
    }
    if (!slides.length) slides = [{ art: A.depIcon("star"), title: state.s.brand.name, cap: state.s.brand.tagline }];
    return slides;
  }

  function renderHome(scrollTo) {
    const s = state.s, sec = s.sections;
    const slides = heroSlides();
    const stats = (s.hero.stats || []).filter((x) => x && x.value).slice();
    if (state.cats.length && stats.length < 3) stats.push({ value: num(state.cats.length), label: "أقسام في المعرض" });

    let html = `<header class="hero" id="top"><div class="wrap hero-grid">
        <div class="hero-txt">
          <div class="pill" data-hero><span class="dot"></span>${esc(s.hero.eyebrow)}</div>
          <h1>${splitWords(s.hero.title1)}<span class="line2">${splitWords(s.hero.title2, "grad")}</span></h1>
          <p class="lead" data-hero>${esc(s.hero.text)}</p>
          <div class="cta" data-hero>
            <a class="btn shine" href="#/shop" data-magnet>${esc(s.hero.cta1)} ${A.ui.arrow}</a>
            <a class="btn glass-btn" href="#/?to=departments" data-magnet>${esc(s.hero.cta2)}</a>
          </div>
          ${stats.length ? `<div class="hero-stats" data-hero>${stats.map((v) => `<div class="glass"><b data-count="${esc(v.value)}">${esc(v.value)}</b><span>${esc(v.label)}</span></div>`).join("")}</div>` : ""}
        </div>
        <div class="showcase" data-show style="--slide-ms:${Math.round((Number(s.hero.slide_seconds) || 5.5) * 1000)}ms">
          <div class="orbit" data-orbit>${orbitSVG()}</div>
          <div class="jas j-hero-a">${A.jasmine()}</div><div class="jas j-hero-b">${A.jasmine()}</div>
          <div class="show-card" id="showCard" data-tilt>
            <div class="stage"></div>
            ${slides.map((sl, i) => `<a class="slide${i === 0 ? " on" : ""}" ${sl.link ? `href="${esc(sl.link)}"` : ""} aria-label="${esc(sl.title || "")}">
              ${sl.img ? `<img src="${esc(sl.img)}" alt="${esc(sl.title || "")}" ${i ? 'loading="lazy"' : ""}>` : `<div class="slide-art">${sl.art}</div>`}
              ${sl.title ? `<div class="cap"><b>${esc(sl.title)}</b>${sl.cap ? `<small>${esc(sl.cap)}</small>` : ""}</div>` : ""}</a>`).join("")}
            <div class="gloss"></div>
          </div>
          <div class="float-chip glass a" data-float>${A.ui.shield}<div><b>فضة ٩٢٥ أصلية</b><span>مدموغة ومضمونة</span></div></div>
          <div class="float-chip glass b" data-float>${A.ui.truck}<div><b>${s.shop.intl_enabled ? "شحن لكل دول العالم" : "توصيل لكل العراق"}</b><span>${s.shop.intl_enabled ? "ومن كربلاء إلى بابك" : "الدفع عند الاستلام"}</span></div></div>
          ${slides.length > 1 ? `<div class="show-dots">${slides.map((_, i) => `<button type="button" aria-label="الصورة ${num(i + 1)}" data-dot="${i}"></button>`).join("")}</div>` : ""}
        </div>
      </div></header>`;

    if (sec.departments.show && state.cats.length) {
      const n = state.cats.length;
      const w = (4 - ((n + 3) % 4)) % 4, wides = new Set();
      if (w && n > 6) wides.add(5);
      for (let k = n - 1; wides.size < w && k > 0; k--) if (k !== 5) wides.add(k);
      html += `<section class="block" id="departments"><div class="wrap">${titleBlock(sec.departments.eyebrow, sec.departments.title, sec.departments.text, true)}
        <div class="bento" data-stagger>${state.cats.map((c, i) => {
          const count = state.prods.filter((p) => p.category_id === c.id).length;
          const cls = i === 0 ? "big" : wides.has(i) ? "wide" : "";
          return `<a href="#/c/${esc(c.slug)}" class="tile glass spot edge ${cls}">
            ${c.image_url ? `<div class="t-img"><img src="${esc(c.image_url)}" alt="" loading="lazy"></div>` : ""}
            <div class="t-art">${A.depIcon(c.icon)}</div>
            <div class="t-top"><div class="t-ic">${A.depIcon(c.icon)}</div><span class="t-count">${count ? `${num(count)} قطعة` : "قريباً"}</span></div>
            <div><h3>${esc(c.name)}</h3><p>${esc(c.subtitle)}</p></div>
            <span class="t-go">${A.ui.arrowL}</span></a>`;
        }).join("")}</div></div></section>`;
    }

    const fp = findProd(sec.featured.product_id) || state.prods.find((p) => p.featured && p.badge) || state.prods.find((p) => p.featured) || state.prods[0];
    if (sec.featured.show && fp) {
      const c = catOf(fp);
      const spec = [["القسم", c && c.name], ["المعدن", fp.metal], ["الحجر", fp.stone], ["الوزن", fp.weight]].filter((x) => x[1]);
      html += `<section class="block" style="padding-top:0"><div class="wrap"><div class="feature glass edge lit" data-feature>
        <div class="txt"><div>${eyebrow(sec.featured.eyebrow)}</div>
          <h2 data-split>${splitWords(fp.name)}</h2>
          ${fp.description ? `<p data-rv>${esc(fp.description.split("\n")[0])}</p>` : ""}
          <div class="chips-spec" data-rv>${spec.map(([k, v]) => `<span><b>${k}</b>${esc(v)}</span>`).join("")}</div>
          <div class="price-big" data-rv>${money(fp.price)}${fp.old_price && fp.old_price > fp.price ? `<s>${num(fp.old_price)}</s>` : ""}</div>
          <div class="cta" data-rv><a class="btn shine" href="#/p/${fp.id}" data-magnet>${esc(sec.featured.button)}</a>
          ${inStock(fp) ? `<button class="btn glass-btn" type="button" data-add="${fp.id}">${A.ui.cart} أضف للسلة</button>` : ""}</div>
        </div>
        <div class="pic" data-feature-pic><span class="halo h2"></span><span class="halo"></span>${fp.images && fp.images[0] ? `<img src="${esc(fp.images[0])}" alt="${esc(fp.name)}" loading="lazy">` : A.productArt(fp, iconOf(fp))}</div>
      </div></div></section>`;
    }

    const room = (state.prods.filter((p) => p.featured).length >= 3 ? state.prods.filter((p) => p.featured) : state.prods).slice(0, 6);
    if (room.length >= 3) {
      html += `<section class="showroom" id="showroom" aria-label="جولة في المعرض"><div class="room-pin">
        <div class="wrap room-head"><div>${eyebrow("جولة في المعرض")}<h2 data-split>${splitWords("قطعٌ تُروى حكايتها")}</h2></div>
          <p class="room-hint">${fine ? "مرّر للأسفل لتتجوّل بين القطع" : "اسحب لتتجوّل بين القطع"} ${A.ui.arrowL}</p></div>
        <div class="room-track" id="roomTrack">${room.map((p, k) => {
          const c = catOf(p);
          return `<a class="room-card glass edge" href="#/p/${p.id}">
            <span class="room-no" aria-hidden="true">${String(k + 1).padStart(2, "0")}</span>
            <div class="room-ph">${p.images && p.images[0] ? `<img src="${esc(p.images[0])}" alt="${esc(p.name)}" loading="lazy">` : `<span class="halo"></span>${A.productArt(p, iconOf(p))}`}</div>
            <div class="room-txt"><small>${esc((c && c.name) || "")}</small><h3>${esc(p.name)}</h3><span class="price">${money(p.price)}</span></div></a>`;
        }).join("")}<a class="room-card room-end glass" href="#/shop"><b>كل القطع</b><span>${num(state.prods.length)} قطعة في المتجر</span><span class="t-go">${A.ui.arrowL}</span></a></div>
      </div></section>`;
    }

    if (sec.collection.show) {
      const usedCats = state.cats.filter((c) => state.prods.some((p) => p.category_id === c.id));
      html += `<section class="block" id="collection" style="padding-top:0"><div class="wrap">${titleBlock(sec.collection.eyebrow, sec.collection.title, sec.collection.text)}
        ${usedCats.length > 1 ? `<div class="seg" data-rv role="group" aria-label="تصفية حسب القسم"><button class="chip on" type="button" data-filter="">الكل</button>${usedCats.map((c) => `<button class="chip" type="button" data-filter="${c.id}">${esc(c.name)}</button>`).join("")}</div>` : ""}
        <div id="homeGrid">${grid(state.prods.slice(0, Number(sec.collection.count) || 8), "ستُعرض المنتجات هنا فور إضافتها من لوحة التحكم.")}</div>
        ${state.prods.length ? `<div class="more" data-rv><a class="btn glass-btn" href="#/shop" data-magnet>عرض كل المنتجات (${num(state.prods.length)}) ${A.ui.arrow}</a></div>` : ""}
      </div></section>`;
    }

    const band = (sec.band.items || []).filter(Boolean);
    if (sec.band.show && band.length) {
      const row = band.map((b) => `<span>${esc(b)}</span>`).join("");
      html += `<div class="band" aria-hidden="true"><div class="track" data-band>${row}${row}${row}${row}</div></div>`;
    }

    if (sec.about.show) {
      html += `<section class="block" id="about"><div class="wrap about">
        <div style="position:relative"><div class="jas j-about">${A.jasmine()}</div><div class="about-media glass edge lit" data-clip>${sec.about.image ? `<img src="${esc(sec.about.image)}" alt="" loading="lazy">` : `<div class="logo-art"><img src="${esc(s.brand.logo || LOGO_FULL)}" alt="شعار ${esc(s.brand.full)}" loading="lazy"></div>`}</div></div>
        <div><div data-rv>${eyebrow(sec.about.eyebrow)}</div><h2 data-split>${splitWords(sec.about.title)}</h2><p data-rv>${esc(sec.about.text)}</p>
          <div class="values" data-stagger>
            <div class="glass">${A.ui.shield}<span><b>أصالة مضمونة</b>فضة ٩٢٥ مدموغة وأحجار طبيعية</span></div>
            <div class="glass">${A.ui.gift}<span><b>تغليف فاخر</b>جاهز للإهداء</span></div>
            <div class="glass">${A.ui.truck}<span><b>${s.shop.intl_enabled ? "من كربلاء إلى العالم" : "توصيل لكل العراق"}</b>${s.shop.intl_enabled ? "توصيل داخل العراق وشحن دولي" : "والدفع عند الاستلام"}</span></div>
          </div>
          <div class="cta" data-rv style="margin-top:26px"><a class="btn shine" href="#/shop" data-magnet>تصفّح المتجر ${A.ui.arrow}</a></div></div>
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
    animateHome();
    if (scrollTo) requestAnimationFrame(() => scrollToId(scrollTo));
  }

  function visitSection() {
    const s = state.s, c = s.contact, sec = s.sections.visit;
    const rows = [
      c.address && [A.ui.pin, "العنوان", esc(c.address) + (c.map_url ? ` · <a href="${esc(c.map_url)}" target="_blank" rel="noopener" style="color:var(--emerald)">الموقع على الخريطة</a>` : "")],
      c.hours && [A.ui.clock, "أوقات الدوام", esc(c.hours)],
      c.phone && [A.ui.phone, "الهاتف", `<a href="tel:${esc(toLatin(c.phone).replace(/[^\d+]/g, ""))}" dir="ltr">${esc(c.phone)}</a>`],
      c.whatsapp && [A.ui.whatsapp, "واتساب", `<a href="${esc(waLink("السلام عليكم"))}" target="_blank" rel="noopener" dir="ltr">${esc(c.whatsapp)}</a>`],
      c.email && [A.ui.mail, "البريد", `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`]
    ].filter(Boolean);
    return `<section class="block" id="visit"><div class="wrap">${titleBlock("Visit us", sec.title, "", true)}
      <div class="visit">
        <div class="visit-card glass spot" data-rv><h3>${esc(s.brand.full)}</h3>
          ${rows.map(([ic, k, v]) => `<div class="info-row"><span class="ic">${ic}</span><div><small>${k}</small>${v}</div></div>`).join("")}
          <div class="socials">${socialLinks()}</div>
        </div>
        <form class="visit-card glass spot" id="contactForm" data-rv novalidate>
          <h3>${esc(sec.form_title)}</h3><p style="color:var(--soft);margin-top:-8px">${esc(sec.form_text)}</p>
          <div class="two"><div class="field"><label for="cfName">الاسم</label><input id="cfName" name="name" required maxlength="120" autocomplete="name"></div>
          <div class="field"><label for="cfPhone">رقم الهاتف</label><input id="cfPhone" name="phone" type="tel" inputmode="tel" maxlength="30" dir="ltr" autocomplete="tel"></div></div>
          <div class="field"><label for="cfBody">رسالتك</label><textarea id="cfBody" name="body" required maxlength="3000"></textarea></div>
          <button class="btn shine block" type="submit">إرسال الرسالة</button>
        </form>
      </div></div></section>`;
  }

  function bindHome() {
    const cardEl = $("#showCard");
    if (cardEl) {
      const slides = $$(".slide", cardEl), dots = $$("[data-dot]");
      let i = 0, timer;
      const ms = Math.round((Number(state.s.hero.slide_seconds) || 5.5) * 1000);
      const kb = (sl) => { const img = $("img", sl); if (img && G) G.fromTo(img, { scale: 1.25 }, { scale: 1.04, duration: ms / 1000 + 1.4, ease: "none" }); const art = $(".slide-art", sl); if (art && G) G.fromTo(art, { y: 30, rotate: -8, scale: .9 }, { y: 0, rotate: 0, scale: 1, duration: 1.6, ease: "expo.out" }); };
      const show = (n) => {
        const prev = slides[i];
        i = (n + slides.length) % slides.length;
        const cur = slides[i];
        dots.forEach((d, k) => { d.classList.remove("on"); void d.offsetWidth; d.classList.toggle("on", k === i); });
        if (prev === cur) return;
        if (G) {
          G.set(cur, { zIndex: 2, opacity: 1, clipPath: "circle(0% at 50% 50%)" });
          G.set(prev, { zIndex: 1 });
          G.to(cur, { clipPath: "circle(75% at 50% 50%)", duration: 1.3, ease: "expo.inOut", onComplete: () => { prev.classList.remove("on"); G.set(prev, { opacity: 0 }); G.set(cur, { clearProps: "clipPath" }); cur.classList.add("on"); } });
          kb(cur);
          const cap = $(".cap", cur); if (cap) G.fromTo(cap, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, delay: 0.5, ease: "expo.out" });
        } else { prev.classList.remove("on"); cur.classList.add("on"); }
      };
      const play = () => { clearInterval(timer); if (slides.length > 1) timer = setInterval(() => show(i + 1), ms); };
      dots.forEach((d) => d.addEventListener("click", () => { show(+d.dataset.dot); play(); }));
      if (slides.length > 1) { dots[0].classList.add("on"); play(); }
      kb(slides[0]);
      let sx = null;
      cardEl.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
      cardEl.addEventListener("touchend", (e) => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) { show(i + (dx > 0 ? 1 : -1)); play(); } sx = null; });
      cleanups.push(() => clearInterval(timer));
    }
    $$("[data-filter]").forEach((b) => b.addEventListener("click", () => {
      $$("[data-filter]").forEach((x) => x.classList.toggle("on", x === b));
      const id = b.dataset.filter, n = Number(state.s.sections.collection.count) || 8;
      const list = (id ? state.prods.filter((p) => p.category_id === id) : state.prods).slice(0, n);
      const box = $("#homeGrid");
      const swap = () => { box.innerHTML = grid(list); if (G) G.fromTo($$(".card", box), { opacity: 0, y: 40, scale: 0.94, filter: "blur(6px)" }, { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 0.9, stagger: 0.06, ease: "expo.out" }); if (window.ScrollTrigger) window.ScrollTrigger.refresh(); };
      if (G) G.to($$(".card", box), { opacity: 0, y: -20, duration: 0.25, stagger: 0.02, onComplete: swap }); else swap();
    }));
    bindContactForm();
  }

  function bindContactForm() {
    const f = $("#contactForm");
    if (!f) return;
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = f.name.value.trim(), phone = f.phone.value.trim(), body = f.body.value.trim();
      if (name.length < 2) { toast("يرجى كتابة الاسم"); f.name.focus(); return; }
      if (body.length < 2) { toast("يرجى كتابة الرسالة"); f.body.focus(); return; }
      const btn = $("button[type=submit]", f); btn.disabled = true; btn.textContent = "جارٍ الإرسال…";
      const { error } = await db.from("inquiries").insert({ name, phone, body });
      btn.disabled = false; btn.textContent = "إرسال الرسالة";
      if (error) { toast("تعذّر الإرسال، حاول مرة أخرى"); return; }
      f.reset(); toast("وصلتنا رسالتك، شكراً لك");
    });
  }

  /* ---------- shop / category ---------- */
  function renderShop(slug, sort) {
    const cat = slug ? state.cats.find((c) => c.slug === slug) : null;
    if (slug && !cat && state.ready) { location.hash = "#/shop"; return; }
    let list = cat ? state.prods.filter((p) => p.category_id === cat.id) : state.prods.slice();
    sort = sort || "default";
    if (sort === "low") list.sort((a, b) => a.price - b.price);
    if (sort === "high") list.sort((a, b) => b.price - a.price);
    if (sort === "new") list.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    app.innerHTML = `<div class="page-head"><div class="wrap">
        <nav class="crumbs" aria-label="مسار الصفحة" data-rv><a href="#/">الرئيسية</a><span>/</span>${cat ? `<a href="#/shop">المتجر</a><span>/</span><span>${esc(cat.name)}</span>` : "<span>المتجر</span>"}</nav>
        <h1 data-split>${splitWords(cat ? cat.name : "كل المنتجات")}</h1>
        <p data-rv>${esc(cat ? cat.subtitle : state.s.brand.tagline)}</p></div></div>
      <section style="padding-bottom:40px"><div class="wrap">
        <div class="seg" data-rv><a class="chip${cat ? "" : " on"}" href="#/shop">الكل</a>${state.cats.map((c) => `<a class="chip${cat && cat.id === c.id ? " on" : ""}" href="#/c/${esc(c.slug)}">${esc(c.name)}</a>`).join("")}</div>
        <div class="toolbar" data-rv><span class="count">${num(list.length)} منتج</span>
          <label>ترتيب
          <select id="sortSel" aria-label="ترتيب المنتجات">
            <option value="default">المقترح</option><option value="new">الأحدث</option><option value="low">السعر: من الأقل</option><option value="high">السعر: من الأعلى</option>
          </select></label></div>
        ${grid(list)}
      </div></section>`;
    const sel = $("#sortSel"); sel.value = sort;
    sel.addEventListener("change", () => { killMotion(); renderShop(slug, sel.value); });
    animateCommon();
  }

  /* ---------- product ---------- */
  function renderProduct(id) {
    const p = findProd(id);
    if (!p) {
      app.innerHTML = `<div class="page-head"><div class="wrap"><h1>المنتج غير متوفر</h1><p>ربما بيع أو أُزيل من المعرض.</p><div class="cta" style="justify-content:center;margin-top:20px"><a class="btn shine" href="#/shop">العودة إلى المتجر</a></div></div></div>`;
      return;
    }
    const c = catOf(p), imgs = (p.images || []).filter(Boolean), out = !inStock(p);
    const spec = [["القسم", c && c.name], ["المعدن", p.metal], ["الحجر", p.stone], ["الوزن", p.weight], ["المقاس", p.size],
      ["التوفر", out ? "نفدت الكمية" : p.stock ? `متوفر (${num(p.stock)})` : "متوفر"]].filter((x) => x[1]);
    const related = state.prods.filter((x) => x.id !== p.id && x.category_id === p.category_id).slice(0, 4);
    const wa = waLink(`السلام عليكم، أريد طلب: ${p.name} — ${num(p.price)} ${state.s.shop.currency}\n${location.href}`);
    app.innerHTML = `<div class="wrap"><div class="product">
      <div class="gallery" data-rv>
        <div class="g-main" id="gMain">${imgs.length ? `<img src="${esc(imgs[0])}" alt="${esc(p.name)}">` : A.productArt(p, iconOf(p))}
          ${imgs.length > 1 ? `<button class="icon-btn g-nav prev" type="button" aria-label="الصورة السابقة">${A.ui.arrowR}</button><button class="icon-btn g-nav next" type="button" aria-label="الصورة التالية">${A.ui.arrowL}</button>` : ""}</div>
        ${imgs.length > 1 ? `<div class="g-thumbs">${imgs.map((u, i) => `<button type="button" class="${i ? "" : "on"}" data-g="${i}" aria-label="الصورة ${num(i + 1)}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}
      </div>
      <div class="p-info">
        <nav class="crumbs" style="justify-content:flex-start" aria-label="مسار الصفحة" data-rv><a href="#/">الرئيسية</a><span>/</span>${c ? `<a href="#/c/${esc(c.slug)}">${esc(c.name)}</a>` : `<a href="#/shop">المتجر</a>`}</nav>
        ${p.badge && !out ? `<span class="tag" style="position:static;display:inline-block;margin-top:10px" data-rv>${esc(p.badge)}</span>` : ""}
        <h1 data-split>${splitWords(p.name)}</h1>
        <div class="p-price price" data-rv>${priceHTML(p)}</div>
        ${p.description ? `<p class="desc" data-rv>${esc(p.description)}</p>` : ""}
        <dl class="spec glass" data-rv>${spec.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
        ${out ? `<div class="empty" style="padding:20px;margin-bottom:12px">نفدت الكمية حالياً — راسلنا ليصلك خبر توفّرها.</div>` : `
        <div class="buy-row" data-rv>
          <div class="qty" role="group" aria-label="الكمية"><button type="button" id="qMinus" aria-label="إنقاص">−</button><span id="qVal">${num(1)}</span><button type="button" id="qPlus" aria-label="زيادة">+</button></div>
          <button class="btn shine" type="button" id="addBtn" data-magnet>${A.ui.cart} أضف إلى السلة</button>
        </div>
        <div class="buy-row" data-rv><button class="btn glass-btn block" type="button" id="buyNow">اطلب الآن</button></div>`}
        ${wa ? `<a class="btn wa block" href="${esc(wa)}" target="_blank" rel="noopener" data-rv>${A.ui.whatsapp} اسأل عنه على واتساب</a>` : ""}
        <div class="assure" data-rv><div class="glass">${A.ui.shield}فضة أصلية مضمونة</div><div class="glass">${A.ui.truck}${state.s.shop.intl_enabled ? "شحن لكل دول العالم" : "توصيل لكل المحافظات"}</div><div class="glass">${A.ui.gift}تغليف هدايا</div></div>
      </div></div>
      ${related.length ? `<section class="block" style="padding-top:20px">${titleBlock("", "قد يعجبك أيضاً", "")}${grid(related)}</section>` : ""}
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
        img.src = imgs[gi]; img.alt = p.name;
        main.insertBefore(img, old.nextSibling);
        if (G) {
          G.fromTo(img, { clipPath: "inset(0 0 0 100%)", scale: 1.1 }, { clipPath: "inset(0 0 0 0%)", scale: 1, duration: 0.9, ease: "expo.inOut", onComplete: () => old.remove() });
        } else old.remove();
      };
      $$("[data-g]").forEach((b) => b.addEventListener("click", () => go(+b.dataset.g)));
      $(".g-nav.next", main).addEventListener("click", () => go(gi + 1));
      $(".g-nav.prev", main).addEventListener("click", () => go(gi - 1));
      let sx = null;
      main.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
      main.addEventListener("touchend", (e) => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) go(gi + (dx > 0 ? 1 : -1)); sx = null; });
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
  const feeLabel = (t) => t.tbd ? "يُحدَّد حسب الدولة" : t.delivery ? money(t.delivery) : "مجاني";
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
    if (!silent) toast(`أُضيف «${p.name}» إلى السلة`);
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
      body.innerHTML = `<div class="cart-empty">${A.ui.cart}<p>سلتك فارغة</p><a class="btn shine" href="#/shop" data-close="cart">تصفّح المنتجات</a></div>`;
      foot.innerHTML = "";
      return;
    }
    body.innerHTML = lines.map((l) => `<div class="c-item">
      <a class="ph" href="#/p/${l.p.id}" data-close="cart">${l.p.images && l.p.images[0] ? `<img src="${esc(l.p.images[0])}" alt="">` : A.productArt(l.p, iconOf(l.p))}</a>
      <div><h5>${esc(l.p.name)}</h5><div class="price" style="font-size:14px">${money(l.p.price)}</div>
        <div class="qty"><button type="button" data-q="${l.id}" data-d="-1" aria-label="إنقاص">−</button><span>${num(l.qty)}</span><button type="button" data-q="${l.id}" data-d="1" aria-label="زيادة">+</button></div></div>
      <button class="rm" type="button" data-rm="${l.id}">حذف</button></div>`).join("");
    foot.innerHTML = `<div class="sum"><span>المجموع الفرعي</span><span>${money(t.sub)}</span></div>
      <div class="sum"><span>التوصيل داخل العراق</span><span>${feeLabel(t)}</span></div>
      ${t.free && t.sub < t.free ? `<div class="sum" style="color:var(--soft);font-size:13px"><span>أضف ${money(t.free - t.sub)} للحصول على توصيل مجاني داخل العراق</span></div>` : ""}
      ${state.s.shop.intl_enabled ? `<div class="sum" style="color:var(--soft);font-size:13px"><span>نشحن أيضاً لكل دول العالم — اختر دولتك عند إتمام الطلب</span></div>` : ""}
      <div class="sum total"><span>الإجمالي</span><span>${money(t.total)}</span></div>
      <button class="btn shine block" type="button" id="toCheckout" style="margin-top:12px">إتمام الطلب</button>
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
    closePanel("cart");
    const lines = cartLines(), s = state.s, sh = s.shop;
    if (!lines.length) { toast("السلة فارغة"); return; }
    const countries = sh.intl_enabled ? (sh.countries || []).filter((c) => c && c !== LOCAL) : [];
    $("#checkout").innerHTML = `<button class="icon-btn x" type="button" id="coClose" aria-label="إغلاق">${A.ui.close}</button>
      <h3 id="coTitle">إتمام الطلب</h3><p style="color:var(--soft);margin-top:0" id="coLead"></p>
      <form id="coForm" novalidate>
        <div class="field"><label for="coName">الاسم الكامل</label><input id="coName" name="name" required maxlength="120" autocomplete="name"></div>
        <div class="field"><label for="coPhone">رقم الهاتف (واتساب)</label><input id="coPhone" name="phone" type="tel" inputmode="tel" required maxlength="30" dir="ltr" placeholder="07XX XXX XXXX" autocomplete="tel"></div>
        ${countries.length ? `<div class="field"><label for="coCountry">الدولة</label><select id="coCountry" name="country" autocomplete="country-name">
          <option value="${LOCAL}">${LOCAL}</option>${countries.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("")}<option value="__other">دولة أخرى…</option></select></div>
          <div class="field" id="coOtherWrap" hidden><label for="coOther">اسم الدولة</label><input id="coOther" name="other" maxlength="60" autocomplete="country-name"></div>` : ""}
        <div class="two">
          <div class="field" id="coCityWrap"><label for="coCity">المحافظة</label><select id="coCity" name="city">${(sh.cities || []).map((c) => `<option>${esc(c)}</option>`).join("")}</select></div>
          <div class="field" id="coCityIntlWrap" hidden><label for="coCityIntl">المدينة</label><input id="coCityIntl" name="cityIntl" maxlength="80" autocomplete="address-level2"></div>
          <div class="field"><label for="coAddr" id="coAddrLbl">العنوان</label><input id="coAddr" name="address" maxlength="300" placeholder="المنطقة، أقرب نقطة دالة" autocomplete="street-address"></div>
        </div>
        <div class="field"><label for="coNotes">ملاحظات (اختياري)</label><textarea id="coNotes" name="notes" maxlength="1000" style="min-height:80px" placeholder="مقاس الخاتم، تغليف هدية…"></textarea></div>
        <div id="coSum"></div>
        <button class="btn shine block" type="submit">تأكيد الطلب</button>
      </form>`;
    const f = $("#coForm");
    const country = () => { const v = f.country ? f.country.value : LOCAL; return v === "__other" ? (f.other.value.trim() || "دولة أخرى") : v; };
    const refresh = () => {
      const c = country(), t = totals(c), intl = t.intl;
      $("#coCityWrap").hidden = intl; $("#coCityIntlWrap").hidden = !intl;
      if (f.country) $("#coOtherWrap").hidden = f.country.value !== "__other";
      f.address.placeholder = intl ? "الشارع، رقم المبنى، الرمز البريدي" : "المنطقة، أقرب نقطة دالة";
      $("#coAddrLbl").textContent = intl ? "العنوان الكامل" : "العنوان";
      f.phone.placeholder = intl ? "+00 000 000 0000" : "07XX XXX XXXX";
      $("#coLead").innerHTML = `${num(lines.reduce((a, l) => a + l.qty, 0))} قطعة · الإجمالي <b class="price">${money(t.total)}</b>${t.tbd ? " + الشحن" : ""}`;
      $("#coSum").innerHTML = `<div class="sum"><span>المجموع</span><span>${money(t.sub)}</span></div>
        <div class="sum"><span>${intl ? "الشحن الدولي" : "التوصيل"}</span><span>${feeLabel(t)}</span></div>
        <div class="sum total"><span>الإجمالي</span><span>${money(t.total)}${t.tbd ? ` <small style="font-weight:400;color:var(--soft)">+ الشحن</small>` : ""}</span></div>
        <p style="color:var(--soft);font-size:13px">${esc(intl ? [t.tbd ? sh.intl_note : "", sh.intl_payment_note].filter(Boolean).join(" · ") : sh.payment_note)}</p>`;
    };
    if (f.country) { f.country.addEventListener("change", refresh); f.other.addEventListener("input", refresh); }
    refresh();
    $("#checkoutBg").classList.add("open"); lock(true);
    setTimeout(() => $("#coName").focus(), 100);
    $("#coClose").addEventListener("click", closeCheckout);
    f.addEventListener("submit", (e) => submitOrder(e, country));
  }
  function closeCheckout() { $("#checkoutBg").classList.remove("open"); lock(false); }
  $("#checkoutBg").addEventListener("click", (e) => { if (e.target.id === "checkoutBg") closeCheckout(); });

  async function submitOrder(e, getCountry) {
    e.preventDefault();
    const f = e.target;
    const country = getCountry(), intl = country !== LOCAL;
    const cust = { name: f.name.value.trim(), phone: f.phone.value.trim(), country, city: intl ? f.cityIntl.value.trim() : f.city.value, address: f.address.value.trim(), notes: f.notes.value.trim() };
    if (cust.name.length < 2) { toast("يرجى كتابة الاسم"); f.name.focus(); return; }
    if (toLatin(cust.phone).replace(/\D/g, "").length < 7) { toast("يرجى كتابة رقم هاتف صحيح"); f.phone.focus(); return; }
    if (intl && f.country.value === "__other" && !f.other.value.trim()) { toast("يرجى كتابة اسم الدولة"); f.other.focus(); return; }
    if (intl && !cust.city) { toast("يرجى كتابة المدينة"); f.cityIntl.focus(); return; }
    if (intl && cust.address.length < 6) { toast("يرجى كتابة العنوان الكامل للشحن"); f.address.focus(); return; }
    const btn = $("button[type=submit]", f); btn.disabled = true; btn.textContent = "جارٍ إرسال الطلب…";
    const items = cartLines().map((l) => ({ id: l.id, qty: l.qty }));
    const { data, error } = await db.rpc("place_order", { p_customer: cust, p_items: items });
    if (error) {
      btn.disabled = false; btn.textContent = "تأكيد الطلب";
      const m = String(error.message || "");
      toast(m.includes("out_of_stock") ? "إحدى القطع نفدت كميتها، يرجى مراجعة السلة" : m.includes("product_unavailable") ? "إحدى القطع لم تعد متوفرة" : m.includes("invalid_phone") ? "رقم الهاتف غير صحيح" : "تعذّر إرسال الطلب، حاول مرة أخرى");
      return;
    }
    const s = state.s;
    const msg = [`السلام عليكم، طلب جديد من موقع ${s.brand.full}`, `رقم الطلب: #${data.order_no}`, `الاسم: ${cust.name}`, `الهاتف: ${cust.phone}`, intl ? `الدولة: ${country} — ${cust.city}${cust.address ? " — " + cust.address : ""}` : `المحافظة: ${cust.city}${cust.address ? " — " + cust.address : ""}`, "", "المنتجات:",
      ...data.items.map((i) => `• ${i.name} × ${i.qty} — ${num(i.price * i.qty)} ${s.shop.currency}`), "",
      `${intl ? "الشحن الدولي" : "التوصيل"}: ${data.shipping_tbd ? "يُحدَّد حسب الدولة" : data.delivery ? num(data.delivery) + " " + s.shop.currency : "مجاني"}`, `الإجمالي: ${num(data.total)} ${s.shop.currency}${data.shipping_tbd ? " + الشحن" : ""}`, cust.notes ? `ملاحظات: ${cust.notes}` : ""].filter((x) => x !== undefined).join("\n");
    const wa = s.shop.whatsapp_orders ? waLink(msg) : "";
    state.cart = []; saveCart(); renderCart();
    $("#checkout").innerHTML = `<div class="success"><div class="ok">${A.ui.check}</div>
      <h3>تمّ استلام طلبك</h3><p style="color:var(--soft)">شكراً لك يا ${esc(cust.name)}، سنتواصل معك قريباً لتأكيد الطلب.</p>
      <div class="no">#${esc(data.order_no)}</div><p style="margin-top:0;color:var(--soft)">رقم طلبك · الإجمالي ${money(data.total)}${data.shipping_tbd ? " + الشحن" : ""}</p>
      ${data.shipping_tbd ? `<p style="color:var(--soft);font-size:14px">${esc(s.shop.intl_note)}</p>` : ""}
      ${wa ? `<a class="btn wa block" href="${esc(wa)}" target="_blank" rel="noopener" style="margin-bottom:10px">${A.ui.whatsapp} أرسل تفاصيل الطلب على واتساب</a>` : ""}
      <button class="btn glass-btn block" type="button" id="coDone">متابعة التسوق</button></div>`;
    $("#coDone").addEventListener("click", () => { closeCheckout(); location.hash = "#/"; });
    if (G) G.from(".success > *", { y: 24, opacity: 0, stagger: 0.08, duration: 0.7, ease: "expo.out" });
  }

  /* ---------- search ---------- */
  function openSearch() {
    $("#search").classList.add("open"); $("#search").setAttribute("aria-hidden", "false"); lock(true);
    setTimeout(() => $("#searchInput").focus(), 60); doSearch();
  }
  function closeSearch() { $("#search").classList.remove("open"); $("#search").setAttribute("aria-hidden", "true"); lock(false); }
  function norm(t) { return String(t || "").replace(/[ً-ْـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase(); }
  function doSearch() {
    const q = norm($("#searchInput").value.trim());
    const res = $("#searchRes");
    if (!q) { res.innerHTML = `<div class="seg">${state.cats.map((c) => `<a class="chip" href="#/c/${esc(c.slug)}">${esc(c.name)}</a>`).join("")}</div>`; return; }
    const list = state.prods.filter((p) => norm([p.name, p.stone, p.metal, p.description, (catOf(p) || {}).name].join(" ")).includes(q)).slice(0, 24);
    res.innerHTML = list.length ? `<p class="count" style="color:var(--soft)">${num(list.length)} نتيجة</p>${grid(list)}` : `<div class="empty">لا توجد نتائج لـ «${esc($("#searchInput").value)}»</div>`;
  }
  $("#searchInput").addEventListener("input", doSearch);
  $("#searchClose").addEventListener("click", closeSearch);
  $("#searchRes").addEventListener("click", (e) => { if (e.target.closest("a")) closeSearch(); });

  /* ---------- motion ---------- */
  let cleanups = [];
  let introPromise = Promise.resolve();
  function killMotion() {
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
      G.fromTo(el, { opacity: 0, y: 36, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 97%", once: true } });
    });
    $$("[data-clip]").forEach((el) => {
      G.fromTo(el, { clipPath: "inset(100% 0% 0% 0% round 36px)" }, { clipPath: "inset(0% 0% 0% 0% round 36px)", duration: 1.5, ease: "expo.inOut", scrollTrigger: { trigger: el, start: "top 82%", once: true }, onComplete: () => G.set(el, { clearProps: "clipPath" }) });
    });
    $$("[data-stagger]").forEach((box) => {
      G.fromTo(box.children, { opacity: 0, y: 60, scale: 0.94, filter: "blur(8px)" }, { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 1.1, ease: "expo.out", stagger: 0.06, scrollTrigger: { trigger: box, start: "top 85%", once: true }, onComplete: () => G.set(box.children, { clearProps: "filter,transform" }) });
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
    tl.fromTo(".hero h1 .w", { yPercent: 120, opacity: 0, filter: "blur(10px)" }, { yPercent: 0, opacity: 1, filter: "blur(0px)", duration: 1.4, ease: "expo.out", stagger: 0.09 })
      .fromTo("[data-hero]", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.1 }, "-=1")
      .fromTo("#showCard", { y: 80, opacity: 0, rotateX: 18, scale: 0.92 }, { y: 0, opacity: 1, rotateX: 0, scale: 1, duration: 1.8, ease: "expo.out" }, 0)
      .fromTo("[data-orbit]", { scale: 0.6, opacity: 0, rotate: -90 }, { scale: 1, opacity: 1, rotate: 0, duration: 2.2, ease: "expo.out" }, 0.1)
      .fromTo("[data-float]", { y: 30, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 1.2, ease: "back.out(1.6)", stagger: 0.15 }, 0.8);
    countUp();
    // gentle float of the hero chips
    $$("[data-float]").forEach((c, i) => G.to(c, { y: i ? 10 : -10, duration: 3 + i, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 2 }));
    // parallax
    G.to("[data-show]", { yPercent: -10, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    G.to("[data-orbit]", { rotate: 60, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    const pic = $("[data-feature-pic] > svg, [data-feature-pic] > img");
    if (pic) G.fromTo(pic, { scale: 1.18, rotate: -6 }, { scale: 1, rotate: 0, ease: "none", scrollTrigger: { trigger: "[data-feature]", start: "top bottom", end: "bottom top", scrub: true } });
    const feat = $("[data-feature]");
    if (feat) G.fromTo(feat, { scale: 0.92, opacity: 0.4 }, { scale: 1, opacity: 1, ease: "none", scrollTrigger: { trigger: feat, start: "top 95%", end: "top 45%", scrub: true } });
    // showroom: vertical scroll drives a horizontal walk through the pieces (desktop)
    const track = $("#roomTrack");
    if (track && innerWidth > 920) {
      const dist = () => Math.max(0, track.scrollWidth - track.clientWidth + 40);
      G.to(track, { x: () => dist(), ease: "none", scrollTrigger: { trigger: "#showroom", start: "top top", end: () => "+=" + dist(), pin: ".room-pin", scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 } });
      $$(".room-card .room-ph > svg, .room-card .room-ph > img", track).forEach((el) => G.fromTo(el, { rotate: -8 }, { rotate: 8, ease: "none", scrollTrigger: { trigger: "#showroom", start: "top top", end: () => "+=" + dist(), scrub: true } }));
    }
    // marquee leans with scroll speed
    const band = $("[data-band]");
    if (band) {
      const setSkew = G.quickTo(band, "skewX", { duration: 0.5, ease: "power3" });
      window.ScrollTrigger.create({ trigger: band, start: "top bottom", end: "bottom top", onUpdate: (self) => setSkew(G.utils.clamp(-12, 12, self.getVelocity() / -180)) });
    }
    // footer wordmark rises
    const mark = $("footer.site .mark");
    if (mark) G.fromTo(mark, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: "footer.site", start: "top bottom", end: "top 50%", scrub: true } });
  }
  function countUp() {
    $$("[data-count]").forEach((b) => {
      const m = toLatin(b.dataset.count).match(/^(\D*)(\d+)(\D*)$/);
      if (!m) return;
      const end = +m[2], o = { v: 0 };
      introPromise.then(() => G.to(o, { v: end, duration: 2, ease: "power2.out", delay: 0.6, onUpdate: () => { b.textContent = m[1] + Math.round(o.v).toLocaleString("ar-IQ", { useGrouping: end >= 10000 }) + m[3]; } }));
    });
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

  /* ---------- ambient light: sparkles, spotlight cards, cursor glow ---------- */
  function ambient() {
    // spotlight follows the pointer inside glass cards
    document.addEventListener("pointermove", (e) => {
      const el = e.target.closest && e.target.closest(".spot");
      if (el) { const r = el.getBoundingClientRect(); el.style.setProperty("--mx", `${e.clientX - r.left}px`); el.style.setProperty("--my", `${e.clientY - r.top}px`); }
    }, { passive: true });
    if (fine && G) {
      const light = $("#cursorLight");
      const lx = G.quickTo(light, "x", { duration: 0.9, ease: "power3" }), ly = G.quickTo(light, "y", { duration: 0.9, ease: "power3" });
      addEventListener("pointermove", (e) => { light.style.opacity = 1; lx(e.clientX); ly(e.clientY); }, { passive: true });
    }
    // twinkling sparkles
    const cv = $("#sparkles"); if (!cv || reduce) return;
    const ctx = cv.getContext("2d");
    let W, H, dots = [], raf;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const size = () => {
      W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr;
      const n = Math.round(Math.min(90, (innerWidth * innerHeight) / 16000));
      dots = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.3 + 0.4) * dpr, p: Math.random() * Math.PI * 2, s: 0.006 + Math.random() * 0.018, v: (Math.random() * 0.15 + 0.03) * dpr }));
    };
    let col = getComputedStyle(document.documentElement).getPropertyValue("--emerald").trim() || "#34e3a8";
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      for (const d of dots) {
        d.p += d.s; d.y -= d.v; if (d.y < -10) { d.y = H + 10; d.x = Math.random() * W; }
        const a = (Math.sin(d.p) + 1) / 2;
        ctx.globalAlpha = a * 0.85;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
        if (a > 0.92) { ctx.globalAlpha = (a - 0.92) * 6; ctx.fillRect(d.x - d.r * 4, d.y - 0.4 * dpr, d.r * 8, 0.8 * dpr); ctx.fillRect(d.x - 0.4 * dpr, d.y - d.r * 4, 0.8 * dpr, d.r * 8); }
      }
      raf = requestAnimationFrame(tick);
    };
    size(); tick();
    addEventListener("resize", () => { size(); }, { passive: true });
    document.addEventListener("visibilitychange", () => { cancelAnimationFrame(raf); if (!document.hidden) tick(); });
    window.__rqSparkColor = (c) => { col = c; };
  }
  let lenis = null;
  function smoothScroll() {
    if (reduce || !window.Lenis || !G) return;
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
    else if (parts[0] === "c") renderShop(decodeURIComponent(parts[1] || ""));
    else if (parts[0] === "p") renderProduct(decodeURIComponent(parts[1] || ""));
    else renderHome();
    if (window.ScrollTrigger) requestAnimationFrame(() => window.ScrollTrigger.refresh());
  }
  let busy = false;
  function navigate() {
    const { parts, to } = parse();
    closePanel("menu"); closePanel("cart"); closeSearch();
    if (!parts.length && state.view === "home" && to) { scrollToId(to); return; }
    if (!G || busy) { render(); jumpTop(); if (to) setTimeout(() => scrollToId(to), 60); return; }
    busy = true;
    const cur = $("#curtain");
    G.timeline({ onComplete: () => { busy = false; } })
      .set(cur, { clipPath: "circle(0% at 50% 50%)" })
      .to(cur, { clipPath: "circle(75% at 50% 50%)", duration: 0.55, ease: "power3.in" })
      .add(() => { jumpTop(); render(); if (to) setTimeout(() => scrollToId(to), 120); })
      .to(cur, { clipPath: "circle(0% at 50% 50%)", duration: 0.75, ease: "power3.out" });
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
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closePanel("menu"); closePanel("cart"); closeSearch(); if ($("#checkoutBg").classList.contains("open")) closeCheckout();
  });

  /* ---------- boot ---------- */
  (async function boot() {
    const hadCache = !!safeLS(() => localStorage.getItem("rq_cache"), null);
    const loading = load();
    // a first visit waits briefly so the intro knows whether a logo video was uploaded
    if (!hadCache) await Promise.race([loading, new Promise((r) => setTimeout(r, 1800))]);
    applySettings();
    ambient();
    smoothScroll();
    introPromise = intro();
    if (state.ready) { render(); updateCartCount(); }
    else app.innerHTML = `<div class="wrap" style="padding-block:80px"><div class="grid">${'<div class="skeleton" style="aspect-ratio:3/4"></div>'.repeat(4)}</div></div>`;
    const changed = await loading;
    if (changed) { applySettings(); render(); updateCartCount(); if (window.__rqSparkColor) window.__rqSparkColor(state.s.theme.emerald); }
    await introPromise;
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  })();
})();
