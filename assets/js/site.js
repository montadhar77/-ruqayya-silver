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
  function lock(on) { document.body.classList.toggle("locked", on || !!$(".drawer.open, .modal-bg.open, .search-bg.open")); }
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

  /* ---------- settings → page ---------- */
  function applySettings() {
    const s = state.s, root = document.documentElement.style, t = s.theme;
    ["pearl", "paper", "emerald", "deep", "silver", "accent", "ink"].forEach((k) => { if (t[k]) root.setProperty(`--${k}`, t[k]); });
    root.setProperty("--floral", t.floral === false ? "none" : A.floral(t.emerald));
    document.title = s.seo.title || s.brand.full;
    const md = $('meta[name="description"]'); if (md) md.setAttribute("content", s.seo.description || "");
    const tc = $('meta[name="theme-color"]'); if (tc) tc.setAttribute("content", t.emerald);
    if (s.brand.favicon || s.brand.logo) $("#favicon").href = s.brand.favicon || s.brand.logo;

    // brand
    const logo = $("#brandLogo");
    if (s.brand.logo) { logo.src = s.brand.logo; logo.alt = s.brand.full; logo.hidden = false; } else logo.hidden = true;
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
    $("#footer").innerHTML = `<div class="wrap">
      <div class="cols">
        <div class="f-brand">${s.brand.logo ? `<img src="${esc(s.brand.logo)}" alt="${esc(s.brand.full)}">` : ""}<b>${esc(s.brand.full)}</b><p>${esc(s.footer.text)}</p><div class="socials">${socialLinks()}</div></div>
        <div><h4>الأقسام</h4><ul>${state.cats.slice(0, 6).map((c) => `<li><a href="#/c/${esc(c.slug)}">${esc(c.name)}</a></li>`).join("")}</ul></div>
        <div><h4>تواصل</h4><ul>
          ${s.contact.address ? `<li>${esc(s.contact.address)}</li>` : ""}
          ${s.contact.phone ? `<li><a href="tel:${esc(toLatin(s.contact.phone).replace(/[^\d+]/g, ""))}" dir="ltr">${esc(s.contact.phone)}</a></li>` : ""}
          ${s.contact.hours ? `<li>${esc(s.contact.hours)}</li>` : ""}
          <li><a href="#/shop">المتجر</a></li>
        </ul></div>
      </div>
      <div class="copy">© ${num(new Date().getFullYear()).replace(/٬/g, "")} — ${esc(s.footer.copyright)}</div>
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
        if (G) G.to(el, { yPercent: -100, duration: 1.1, ease: "expo.inOut", onComplete: () => { el.remove(); } });
        else el.remove();
        setTimeout(resolve, G ? 450 : 0);
      };
      if (!s.enabled || (seen && !s.every_visit)) { el.remove(); resolve(); return; }
      $("#introSkip").addEventListener("click", finish);
      const max = Math.max(3, Math.min(30, Number(s.max_seconds) || 9)) * 1000;

      if (s.video) {
        $("#introMark").hidden = true;
        const v = document.createElement("video");
        Object.assign(v, { src: s.video, muted: true, playsInline: true, autoplay: true, preload: "auto" });
        v.setAttribute("playsinline", ""); v.setAttribute("muted", "");
        v.addEventListener("ended", finish);
        v.addEventListener("error", () => { v.remove(); $("#introMark").hidden = false; logoReveal(finish); });
        el.prepend(v);
        const p = v.play(); if (p && p.catch) p.catch(() => { v.remove(); $("#introMark").hidden = false; logoReveal(finish); });
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
    if (s.brand.logo) { logo.src = s.brand.logo; logo.hidden = false; $("#introArch").style.display = "none"; }
    if (!G) { $$("#introMark > *").forEach((e) => (e.style.opacity = 1)); setTimeout(finish, 1200); return; }
    const paths = $$("#introArch path");
    paths.forEach((p) => { const l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = l; });
    const tl = G.timeline({ onComplete: () => setTimeout(finish, 500) });
    if (!s.brand.logo) tl.to(paths, { strokeDashoffset: 0, duration: 1.6, ease: "power2.inOut", stagger: 0.15 });
    else tl.fromTo(logo, { opacity: 0, scale: 0.7, filter: "blur(12px) brightness(2)" }, { opacity: 1, scale: 1, filter: "blur(0px) brightness(1)", duration: 1.6, ease: "expo.out" });
    tl.fromTo("#introName", { opacity: 0, y: 30, filter: "blur(10px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.1, ease: "expo.out" }, "-=0.7")
      .fromTo("#introSub", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, "-=0.6");
  }

  /* ---------- small renderers ---------- */
  function media(p, cls = "") {
    const imgs = (p.images || []).filter(Boolean);
    if (imgs.length) {
      return `<img class="main ${cls}" src="${esc(imgs[0])}" alt="${esc(p.name)}" loading="lazy" decoding="async">` +
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
    return `<article class="card" data-card>
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
  function titleBlock(eb, title, text) {
    return `<div class="title">${eb ? `<div class="orn" data-rv>${eyebrow(eb)}</div>` : `<div class="orn" data-rv>✦</div>`}
      <h2 data-split>${splitWords(title)}</h2>${text ? `<p data-rv>${esc(text)}</p>` : ""}</div>`;
  }

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
      const pool = (state.prods.filter((p) => p.featured).length ? state.prods.filter((p) => p.featured) : state.prods).slice(0, 4);
      slides = pool.map((p) => ({ art: A.productArt(p, iconOf(p)), title: p.name, cap: p.stone || p.metal, link: `#/p/${p.id}` }));
    }
    if (!slides.length) slides = [{ art: A.depIcon("star"), title: state.s.brand.name, cap: state.s.brand.tagline }];
    return slides;
  }
  function stat(v) {
    return `<div><b data-count="${esc(v.value)}">${esc(v.value)}</b><span>${esc(v.label)}</span></div>`;
  }

  function renderHome(scrollTo) {
    const s = state.s, sec = s.sections;
    const slides = heroSlides();
    const stats = (s.hero.stats || []).filter((x) => x && x.value).slice();
    if (state.cats.length) stats.push({ value: num(state.cats.length), label: "أقسام في المعرض" });

    let html = `<header class="hero" id="top">
      <div class="hero-orn a" data-orn>${A.ornament}</div><div class="hero-orn b" data-orn>${A.ornament}</div>
      <div class="wrap hero-grid">
        <div class="hero-txt">
          <div data-hero>${eyebrow(s.hero.eyebrow)}</div>
          <h1>${splitWords(s.hero.title1)}<span class="line2">${splitWords(s.hero.title2, "silver-text")}</span></h1>
          <p class="lead" data-hero>${esc(s.hero.text)}</p>
          <div class="cta" data-hero>
            <a class="btn" href="#/shop" data-magnet>${esc(s.hero.cta1)} ${A.ui.arrow}</a>
            <a class="btn ghost" href="#/?to=departments" data-magnet>${esc(s.hero.cta2)}</a>
          </div>
          ${stats.length ? `<div class="hero-stats" data-hero>${stats.map(stat).join("")}</div>` : ""}
        </div>
        <div class="arch-col" data-hero-arch>
          <div class="arch" id="heroArch" style="--slide-ms:${Math.round((Number(s.hero.slide_seconds) || 5.5) * 1000)}ms">
            ${slides.map((sl, i) => `<a class="slide${i === 0 ? " on" : ""}" ${sl.link ? `href="${esc(sl.link)}"` : ""} aria-label="${esc(sl.title || "")}">
              ${sl.img ? `<img src="${esc(sl.img)}" alt="${esc(sl.title || "")}" ${i ? 'loading="lazy"' : ""}>` : `<div class="slide-art">${sl.art}</div>`}
              ${sl.title ? `<div class="cap">${esc(sl.title)}${sl.cap ? `<small>${esc(sl.cap)}</small>` : ""}</div>` : ""}</a>`).join("")}
          </div>
          ${slides.length > 1 ? `<div class="arch-dots">${slides.map((_, i) => `<button type="button" aria-label="الصورة ${num(i + 1)}" data-dot="${i}"></button>`).join("")}</div>` : ""}
        </div>
      </div>
    </header>`;

    if (sec.departments.show && state.cats.length) {
      html += `<section class="block" id="departments"><div class="wrap">${titleBlock(sec.departments.eyebrow, sec.departments.title, sec.departments.text)}
        <div class="niches" data-stagger>${state.cats.map((c) => `<a href="#/c/${esc(c.slug)}" class="niche">
          <div class="n-arch">${c.image_url ? `<img src="${esc(c.image_url)}" alt="" loading="lazy">` : A.depIcon(c.icon)}</div>
          <h3>${esc(c.name)}</h3><span>${esc(c.subtitle)}</span></a>`).join("")}</div></div></section>`;
    }

    const fp = findProd(sec.featured.product_id) || state.prods.find((p) => p.featured && p.badge) || state.prods.find((p) => p.featured) || state.prods[0];
    if (sec.featured.show && fp) {
      const c = catOf(fp);
      const spec = [["القسم", c && c.name], ["المعدن", fp.metal], ["الحجر", fp.stone], ["الوزن", fp.weight], ["السعر", money(fp.price)]].filter((x) => x[1]);
      html += `<section class="block" style="padding-top:0"><div class="wrap"><div class="feature" data-feature>
        <div class="txt"><div>${eyebrow(sec.featured.eyebrow)}</div>
          <h2 data-split>${splitWords(fp.name)}</h2>
          <p data-rv>${esc((fp.description || "").split("\n")[0])}</p>
          <dl class="spec" data-rv>${spec.map(([k, v]) => `<dt>${k}</dt><dd>${k === "السعر" ? v : esc(v)}</dd>`).join("")}</dl>
          <div class="cta" data-rv><a class="btn light" href="#/p/${fp.id}" data-magnet>${esc(sec.featured.button)}</a>
          ${inStock(fp) ? `<button class="btn light" type="button" data-add="${fp.id}" style="background:transparent;color:#eef5f1">${A.ui.cart} أضف للسلة</button>` : ""}</div>
        </div>
        <div class="pic" data-feature-pic>${fp.images && fp.images[0] ? `<img src="${esc(fp.images[0])}" alt="${esc(fp.name)}" loading="lazy">` : A.productArt(fp, iconOf(fp))}</div>
      </div></div></section>`;
    }

    if (sec.collection.show) {
      const usedCats = state.cats.filter((c) => state.prods.some((p) => p.category_id === c.id));
      html += `<section class="block" id="collection" style="padding-top:0"><div class="wrap">${titleBlock(sec.collection.eyebrow, sec.collection.title, sec.collection.text)}
        ${usedCats.length > 1 ? `<div class="chips" data-rv role="group" aria-label="تصفية حسب القسم"><button class="chip on" type="button" data-filter="">الكل</button>${usedCats.map((c) => `<button class="chip" type="button" data-filter="${c.id}">${esc(c.name)}</button>`).join("")}</div>` : ""}
        <div id="homeGrid">${grid(state.prods.slice(0, Number(sec.collection.count) || 8), "ستُعرض المنتجات هنا فور إضافتها من لوحة التحكم.")}</div>
        ${state.prods.length ? `<div class="more" data-rv><a class="btn ghost" href="#/shop" data-magnet>عرض كل المنتجات (${num(state.prods.length)})</a></div>` : ""}
      </div></section>`;
    }

    const band = (sec.band.items || []).filter(Boolean);
    if (sec.band.show && band.length) {
      const row = band.map((b) => `<span>${esc(b)}</span>`).join("");
      html += `<div class="band" aria-hidden="true"><div class="track" data-band>${row}${row}${row}${row}</div></div>`;
    }

    if (sec.about.show) {
      html += `<section class="block" id="about"><div class="wrap about">
        <div class="arch rv-clip" data-clip>${sec.about.image ? `<img src="${esc(sec.about.image)}" alt="" loading="lazy">` : `<div class="slide-art" style="color:#cfe3da;top:22%">${A.ornament.replace('stroke-opacity=".14"', 'stroke-opacity=".6"')}</div>`}</div>
        <div><div data-rv>${eyebrow(sec.about.eyebrow)}</div><h2 data-split>${splitWords(sec.about.title)}</h2><p data-rv>${esc(sec.about.text)}</p>
        <div class="cta" data-rv style="margin-top:24px"><a class="btn" href="#/shop" data-magnet>تصفّح المتجر</a></div></div>
      </div></section>`;
    }

    const quotes = (sec.testimonials.items || []).filter((q) => q && q.text);
    if (sec.testimonials.show && quotes.length) {
      html += `<section class="block" style="padding-top:0"><div class="wrap">${titleBlock("", sec.testimonials.title, "")}
        <div class="quotes" data-stagger>${quotes.map((q) => `<figure class="quote" style="margin:0"><p>${esc(q.text)}</p><b>${esc(q.name)}</b>${q.city ? `<span>${esc(q.city)}</span>` : ""}</figure>`).join("")}</div></div></section>`;
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
    return `<section class="block" id="visit"><div class="wrap">${titleBlock("Visit", sec.title, "")}
      <div class="visit">
        <div class="visit-card" data-rv><h3>${esc(s.brand.full)}</h3>
          ${rows.map(([ic, k, v]) => `<div class="info-row">${ic}<div><small>${k}</small>${v}</div></div>`).join("")}
          <div class="socials">${socialLinks()}</div>
        </div>
        <form class="visit-card" id="contactForm" data-rv novalidate>
          <h3>${esc(sec.form_title)}</h3><p style="color:var(--soft);margin-top:-8px">${esc(sec.form_text)}</p>
          <div class="two"><div class="field"><label for="cfName">الاسم</label><input id="cfName" name="name" required maxlength="120" autocomplete="name"></div>
          <div class="field"><label for="cfPhone">رقم الهاتف</label><input id="cfPhone" name="phone" type="tel" inputmode="tel" maxlength="30" dir="ltr" autocomplete="tel"></div></div>
          <div class="field"><label for="cfBody">رسالتك</label><textarea id="cfBody" name="body" required maxlength="3000"></textarea></div>
          <button class="btn block" type="submit">إرسال الرسالة</button>
        </form>
      </div></div></section>`;
  }

  function bindHome() {
    // slideshow
    const arch = $("#heroArch");
    if (arch) {
      const slides = $$(".slide", arch), dots = $$("[data-dot]");
      let i = 0, timer;
      const ms = Math.round((Number(state.s.hero.slide_seconds) || 5.5) * 1000);
      const show = (n) => {
        const prev = slides[i];
        i = (n + slides.length) % slides.length;
        const cur = slides[i];
        dots.forEach((d, k) => { d.classList.remove("on"); void d.offsetWidth; d.classList.toggle("on", k === i); });
        if (prev === cur) return;
        if (G) {
          G.set(cur, { zIndex: 2, opacity: 1, clipPath: "circle(0% at 50% 100%)" });
          G.set(prev, { zIndex: 1 });
          G.to(cur, { clipPath: "circle(150% at 50% 100%)", duration: 1.4, ease: "expo.inOut", onComplete: () => { prev.classList.remove("on"); G.set(prev, { opacity: 0 }); cur.classList.add("on"); } });
          const img = $("img", cur); if (img) G.fromTo(img, { scale: 1.25 }, { scale: 1.04, duration: ms / 1000 + 1.4, ease: "none" });
          const cap = $(".cap", cur); if (cap) G.fromTo(cap, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, delay: 0.6, ease: "expo.out" });
        } else { prev.classList.remove("on"); cur.classList.add("on"); }
      };
      const play = () => { clearInterval(timer); if (slides.length > 1) timer = setInterval(() => show(i + 1), ms); };
      dots.forEach((d) => d.addEventListener("click", () => { show(+d.dataset.dot); play(); }));
      if (slides.length > 1) { dots[0].classList.add("on"); play(); }
      if (G) { const img = $(".slide.on img", arch); if (img) G.fromTo(img, { scale: 1.25 }, { scale: 1.04, duration: ms / 1000 + 1.4, ease: "none" }); }
      cleanups.push(() => clearInterval(timer));
    }
    // filter chips
    $$("[data-filter]").forEach((b) => b.addEventListener("click", () => {
      $$("[data-filter]").forEach((x) => x.classList.toggle("on", x === b));
      const id = b.dataset.filter, n = Number(state.s.sections.collection.count) || 8;
      const list = (id ? state.prods.filter((p) => p.category_id === id) : state.prods).slice(0, n);
      const box = $("#homeGrid");
      const swap = () => { box.innerHTML = grid(list); if (G) G.fromTo($$(".card", box), { opacity: 0, y: 40, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.06, ease: "expo.out" }); ScrollTrigger && window.ScrollTrigger.refresh(); };
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
        <div class="chips" data-rv><a class="chip${cat ? "" : " on"}" href="#/shop">الكل</a>${state.cats.map((c) => `<a class="chip${cat && cat.id === c.id ? " on" : ""}" href="#/c/${esc(c.slug)}">${esc(c.name)}</a>`).join("")}</div>
        <div class="toolbar" data-rv><span class="count">${num(list.length)} منتج</span>
          <label><span class="latin" style="letter-spacing:.05em;margin-inline-end:8px;font-family:var(--body);text-transform:none">ترتيب</span>
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
      app.innerHTML = `<div class="page-head"><div class="wrap"><h1>المنتج غير متوفر</h1><p>ربما بيع أو أُزيل من المعرض.</p><div class="cta" style="justify-content:center;margin-top:20px"><a class="btn" href="#/shop">العودة إلى المتجر</a></div></div></div>`;
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
        <dl class="spec" data-rv>${spec.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
        ${out ? `<div class="empty" style="padding:20px">نفدت الكمية حالياً — راسلنا ليصلك خبر توفّرها.</div>` : `
        <div class="buy-row" data-rv>
          <div class="qty" role="group" aria-label="الكمية"><button type="button" id="qMinus" aria-label="إنقاص">−</button><span id="qVal">${num(1)}</span><button type="button" id="qPlus" aria-label="زيادة">+</button></div>
          <button class="btn" type="button" id="addBtn" data-magnet>${A.ui.cart} أضف إلى السلة</button>
        </div>
        <div class="buy-row" data-rv><button class="btn ghost block" type="button" id="buyNow">اطلب الآن</button></div>`}
        ${wa ? `<a class="btn ghost block" href="${esc(wa)}" target="_blank" rel="noopener" data-rv style="border-color:#1f8f5f;color:#1f8f5f">${A.ui.whatsapp} اسأل عنه على واتساب</a>` : ""}
        <div class="assure" data-rv><div>${A.ui.shield}فضة أصلية مضمونة</div><div>${A.ui.truck}توصيل لكل المحافظات</div><div>${A.ui.gift}تغليف هدايا</div></div>
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
  function totals() {
    const sub = cartLines().reduce((a, l) => a + l.p.price * l.qty, 0);
    const fee = Number(state.s.shop.delivery_fee) || 0, free = Number(state.s.shop.free_delivery_over) || 0;
    const delivery = sub === 0 ? 0 : free && sub >= free ? 0 : fee;
    return { sub, delivery, total: sub + delivery, free };
  }
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
      body.innerHTML = `<div class="cart-empty">${A.ui.cart}<p>سلتك فارغة</p><a class="btn" href="#/shop" data-close="cart">تصفّح المنتجات</a></div>`;
      foot.innerHTML = "";
      return;
    }
    body.innerHTML = lines.map((l) => `<div class="c-item">
      <a class="ph" href="#/p/${l.p.id}" data-close="cart">${l.p.images && l.p.images[0] ? `<img src="${esc(l.p.images[0])}" alt="">` : A.productArt(l.p, iconOf(l.p))}</a>
      <div><h5>${esc(l.p.name)}</h5><div class="price" style="font-size:14px">${money(l.p.price)}</div>
        <div class="qty"><button type="button" data-q="${l.id}" data-d="-1" aria-label="إنقاص">−</button><span>${num(l.qty)}</span><button type="button" data-q="${l.id}" data-d="1" aria-label="زيادة">+</button></div></div>
      <button class="rm" type="button" data-rm="${l.id}">حذف</button></div>`).join("");
    foot.innerHTML = `<div class="sum"><span>المجموع الفرعي</span><span>${money(t.sub)}</span></div>
      <div class="sum"><span>التوصيل</span><span>${t.delivery ? money(t.delivery) : "مجاني"}</span></div>
      ${t.free && t.sub < t.free ? `<div class="sum" style="color:var(--soft);font-size:13px"><span>أضف ${money(t.free - t.sub)} للحصول على توصيل مجاني</span></div>` : ""}
      <div class="sum total"><span>الإجمالي</span><span>${money(t.total)}</span></div>
      <button class="btn block" type="button" id="toCheckout" style="margin-top:12px">إتمام الطلب</button>
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
    const lines = cartLines(), t = totals(), s = state.s;
    if (!lines.length) { toast("السلة فارغة"); return; }
    $("#checkout").innerHTML = `<button class="icon-btn x" type="button" id="coClose" aria-label="إغلاق">${A.ui.close}</button>
      <h3 id="coTitle">إتمام الطلب</h3><p style="color:var(--soft);margin-top:0">${num(lines.reduce((a, l) => a + l.qty, 0))} قطعة · الإجمالي <b class="price">${money(t.total)}</b></p>
      <form id="coForm" novalidate>
        <div class="field"><label for="coName">الاسم الكامل</label><input id="coName" name="name" required maxlength="120" autocomplete="name"></div>
        <div class="field"><label for="coPhone">رقم الهاتف</label><input id="coPhone" name="phone" type="tel" inputmode="tel" required maxlength="30" dir="ltr" placeholder="07XX XXX XXXX" autocomplete="tel"></div>
        <div class="two">
          <div class="field"><label for="coCity">المحافظة</label><select id="coCity" name="city">${(s.shop.cities || []).map((c) => `<option>${esc(c)}</option>`).join("")}</select></div>
          <div class="field"><label for="coAddr">العنوان</label><input id="coAddr" name="address" maxlength="300" placeholder="المنطقة، أقرب نقطة دالة" autocomplete="street-address"></div>
        </div>
        <div class="field"><label for="coNotes">ملاحظات (اختياري)</label><textarea id="coNotes" name="notes" maxlength="1000" style="min-height:80px" placeholder="مقاس الخاتم، تغليف هدية…"></textarea></div>
        <div class="sum"><span>المجموع</span><span>${money(t.sub)}</span></div>
        <div class="sum"><span>التوصيل</span><span>${t.delivery ? money(t.delivery) : "مجاني"}</span></div>
        <div class="sum total"><span>الإجمالي</span><span>${money(t.total)}</span></div>
        <p style="color:var(--soft);font-size:13px">${esc(s.shop.payment_note)}</p>
        <button class="btn block" type="submit">تأكيد الطلب</button>
      </form>`;
    $("#checkoutBg").classList.add("open"); lock(true);
    setTimeout(() => $("#coName").focus(), 100);
    $("#coClose").addEventListener("click", closeCheckout);
    $("#coForm").addEventListener("submit", submitOrder);
  }
  function closeCheckout() { $("#checkoutBg").classList.remove("open"); lock(false); }
  $("#checkoutBg").addEventListener("click", (e) => { if (e.target.id === "checkoutBg") closeCheckout(); });

  async function submitOrder(e) {
    e.preventDefault();
    const f = e.target;
    const cust = { name: f.name.value.trim(), phone: f.phone.value.trim(), city: f.city.value, address: f.address.value.trim(), notes: f.notes.value.trim() };
    if (cust.name.length < 2) { toast("يرجى كتابة الاسم"); f.name.focus(); return; }
    if (toLatin(cust.phone).replace(/\D/g, "").length < 7) { toast("يرجى كتابة رقم هاتف صحيح"); f.phone.focus(); return; }
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
    const msg = [`السلام عليكم، طلب جديد من موقع ${s.brand.full}`, `رقم الطلب: #${data.order_no}`, `الاسم: ${cust.name}`, `الهاتف: ${cust.phone}`, `المحافظة: ${cust.city}${cust.address ? " — " + cust.address : ""}`, "", "المنتجات:",
      ...data.items.map((i) => `• ${i.name} × ${i.qty} — ${num(i.price * i.qty)} ${s.shop.currency}`), "",
      `التوصيل: ${data.delivery ? num(data.delivery) + " " + s.shop.currency : "مجاني"}`, `الإجمالي: ${num(data.total)} ${s.shop.currency}`, cust.notes ? `ملاحظات: ${cust.notes}` : ""].filter((x) => x !== undefined).join("\n");
    const wa = s.shop.whatsapp_orders ? waLink(msg) : "";
    state.cart = []; saveCart(); renderCart();
    $("#checkout").innerHTML = `<div class="success"><div class="ok">${A.ui.check}</div>
      <h3>تمّ استلام طلبك</h3><p style="color:var(--soft)">شكراً لك يا ${esc(cust.name)}، سنتواصل معك قريباً لتأكيد الطلب.</p>
      <div class="no">#${esc(data.order_no)}</div><p style="margin-top:0;color:var(--soft)">رقم طلبك · الإجمالي ${money(data.total)}</p>
      ${wa ? `<a class="btn block" href="${esc(wa)}" target="_blank" rel="noopener" style="background:#1f8f5f;border-color:#1f8f5f;margin-bottom:10px">${A.ui.whatsapp} أرسل تفاصيل الطلب على واتساب</a>` : ""}
      <button class="btn ghost block" type="button" id="coDone">متابعة التسوق</button></div>`;
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
    if (!q) { res.innerHTML = `<div class="chips" style="justify-content:flex-start">${state.cats.map((c) => `<a class="chip" href="#/c/${esc(c.slug)}">${esc(c.name)}</a>`).join("")}</div>`; return; }
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
  }
  function animateCommon() {
    if (!G) return;
    const ST = window.ScrollTrigger;
    $$("[data-split]").forEach((h) => {
      G.fromTo($$(".w", h), { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: h, start: "top 88%", once: true } });
    });
    $$("[data-rv]").forEach((el) => {
      G.fromTo(el, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
    });
    $$("[data-clip]").forEach((el) => {
      G.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: "expo.inOut", scrollTrigger: { trigger: el, start: "top 82%", once: true } });
    });
    $$("[data-stagger]").forEach((box) => {
      G.fromTo(box.children, { opacity: 0, y: 60, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: "expo.out", stagger: 0.07, scrollTrigger: { trigger: box, start: "top 85%", once: true } });
    });
    $$("[data-batch]").forEach((box) => {
      G.set(box.children, { opacity: 0, y: 50 });
      ST.batch(box.children, { start: "top 92%", once: true, onEnter: (els) => G.to(els, { opacity: 1, y: 0, duration: 1, ease: "expo.out", stagger: 0.08 }) });
    });
    magnet();
  }
  function animateHome() {
    animateCommon();
    if (!G) return;
    // hero entrance
    const tl = G.timeline({ paused: true, delay: 0.05 });
    introPromise.then(() => tl.play());
    tl.fromTo(".hero h1 .w", { yPercent: 120, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.3, ease: "expo.out", stagger: 0.1 })
      .fromTo("[data-hero]", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.1 }, "-=0.9")
      .fromTo("[data-hero-arch] .arch", { clipPath: "inset(100% 0% 0% 0%)", y: 60 }, { clipPath: "inset(0% 0% 0% 0%)", y: 0, duration: 1.6, ease: "expo.inOut" }, 0)
      .fromTo("[data-orn]", { scale: 0.6, opacity: 0, rotate: -40 }, { scale: 1, opacity: 0.55, rotate: 0, duration: 2, ease: "expo.out" }, 0.3);
    countUp();
    // parallax
    G.to("#heroArch", { yPercent: -8, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    $$("[data-orn]").forEach((o, i) => G.to(o, { rotate: i ? -60 : 60, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } }));
    const pic = $("[data-feature-pic] > *");
    if (pic) G.fromTo(pic, { scale: 1.2 }, { scale: 1, ease: "none", scrollTrigger: { trigger: "[data-feature]", start: "top bottom", end: "bottom top", scrub: true } });
    const feat = $("[data-feature]");
    if (feat) G.fromTo(feat, { clipPath: "inset(8% 6% 8% 6% round 30px)" }, { clipPath: "inset(0% 0% 0% 0% round 30px)", ease: "none", scrollTrigger: { trigger: feat, start: "top 95%", end: "top 40%", scrub: true } });
    // band skews with scroll speed
    const band = $("[data-band]");
    if (band) {
      const setSkew = G.quickTo(band, "skewX", { duration: 0.5, ease: "power3" });
      window.ScrollTrigger.create({ trigger: band, start: "top bottom", end: "bottom top", onUpdate: (self) => setSkew(G.utils.clamp(-12, 12, self.getVelocity() / -180)) });
    }
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
  }
  function scrollToId(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + scrollY - ($("#nav").offsetHeight + 10);
    window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
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
    if (!G || busy) { render(); scrollTo(0, 0); if (to) setTimeout(() => scrollToId(to), 60); return; }
    busy = true;
    const cur = $("#curtain");
    G.timeline({ onComplete: () => { busy = false; } })
      .set(cur, { clipPath: "ellipse(0% 0% at 50% 100%)" })
      .to(cur, { clipPath: "ellipse(150% 150% at 50% 100%)", duration: 0.55, ease: "power3.in" })
      .add(() => { scrollTo(0, 0); render(); if (to) setTimeout(() => scrollToId(to), 60); })
      .to(cur, { clipPath: "ellipse(150% 0% at 50% 0%)", duration: 0.7, ease: "power3.out" });
  }
  addEventListener("hashchange", navigate);

  /* ---------- static bindings ---------- */
  $("#menuBtn").innerHTML = A.ui.menu;
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
    introPromise = intro();
    if (state.ready) { render(); updateCartCount(); }
    else app.innerHTML = `<div class="wrap" style="padding-block:80px"><div class="grid">${'<div class="skeleton" style="aspect-ratio:3/4"></div>'.repeat(4)}</div></div>`;
    const changed = await loading;
    if (changed) { applySettings(); render(); updateCartCount(); }
    await introPromise;
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  })();
})();
