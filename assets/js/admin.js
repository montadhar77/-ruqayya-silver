/* =========================================================================
   لوحة تحكم معرض رقية — full control of the public site
   Products · departments · orders · messages · every text, image, color,
   the opening video, contact details and shop settings.
   ========================================================================= */
(() => {
  "use strict";
  const cfg = window.RQ_CONFIG, A = window.RQ_ART, DEF = window.RQ_DEFAULTS;
  const db = window.supabase.createClient(cfg.url, cfg.key, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "rq-admin", detectSessionInUrl: false }
  });
  const SITE = new URL("../", location.href).href;
  const root = document.getElementById("root");

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const toLatin = (t) => String(t ?? "").replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
  const intOrNull = (v) => { const d = toLatin(v).replace(/[^\d]/g, ""); return d === "" ? null : parseInt(d, 10); };
  const num = (n) => Number(n || 0).toLocaleString("ar-IQ");
  const money = (n) => `${num(n)} ${esc(state.s.shop.currency || "د.ع")}`;
  const when = (d) => { try { return new Date(d).toLocaleString("ar-IQ", { dateStyle: "medium", timeStyle: "short" }); } catch (e) { return d; } };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const waNumber = (p) => {
    let d = toLatin(p).replace(/\D/g, "");
    if (!d) return "";
    if (d.startsWith("00")) d = d.slice(2);
    if (d.startsWith("0")) d = "964" + d.slice(1); else if (d.length === 10 && d.startsWith("7")) d = "964" + d;
    return d;
  };
  let toastT;
  function toast(msg, err) {
    const t = $("#toast"); t.textContent = msg; t.classList.toggle("err", !!err); t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), err ? 4200 : 2600);
  }
  function errMsg(e) {
    const m = String((e && (e.message || e.error_description)) || e || "");
    if (/Invalid login/i.test(m)) return "البريد أو كلمة المرور غير صحيحة";
    if (/row-level security|permission|not authorized|JWT/i.test(m)) return "لا تملك صلاحية لهذا الإجراء — سجّل الدخول من جديد";
    if (/duplicate key.*slug/i.test(m)) return "الرابط المختصر مستخدم لقسم آخر";
    if (/Payload too large|exceeded the maximum/i.test(m)) return "الملف أكبر من الحد المسموح (٥٠ ميغابايت)";
    if (/Failed to fetch|NetworkError/i.test(m)) return "تعذّر الاتصال بالإنترنت";
    return m || "حدث خطأ غير متوقع";
  }
  const getPath = (o, p) => p.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o);
  function setPath(o, p, v) {
    const ks = p.split("."); let cur = o;
    ks.slice(0, -1).forEach((k, i) => { if (cur[k] == null || typeof cur[k] !== "object") cur[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; cur = cur[k]; });
    cur[ks[ks.length - 1]] = v;
  }

  /* ---------- icons ---------- */
  const S = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = {
    dash: S('<rect x="3.5" y="3.5" width="7" height="8" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="5" rx="1.5"/><rect x="13.5" y="11.5" width="7" height="9" rx="1.5"/><rect x="3.5" y="14.5" width="7" height="6" rx="1.5"/>'),
    box: S('<path d="M12 3 4 7v10l8 4 8-4V7z"/><path d="m4 7 8 4 8-4M12 11v10"/>'),
    folder: S('<path d="M3.5 7a2 2 0 0 1 2-2H10l2 2h6.5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>'),
    receipt: S('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h4"/>'),
    mail: A.ui.mail,
    home: S('<path d="M4 11 12 4l8 7v9H4z"/><path d="M10 20v-6h4v6"/>'),
    palette: S('<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-2 0-.6-.3-1-.6-1.4-.3-.4-.6-.8-.6-1.4 0-1.1.9-2 2-2H17a4 4 0 0 0 4-4c0-4-4-7.2-9-7.2z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="14.5" cy="7" r="1.2"/>'),
    phone: A.ui.phone,
    user: S('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
    logout: S('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 8l-4 4 4 4M6 12h10"/>'),
    eye: S('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
    edit: S('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
    trash: S('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
    copy: S('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
    star: S('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'),
    starOn: '<svg viewBox="0 0 24 24" fill="#b08d57" stroke="#b08d57" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
    up: S('<path d="m6 15 6-6 6 6"/>'),
    down: S('<path d="m6 9 6 6 6-6"/>'),
    left: S('<path d="m9 6 6 6-6 6"/>'),
    right: S('<path d="m15 6-6 6 6 6"/>'),
    img: S('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m4 18 5-5 4 4 2.5-2.5L20 19"/>'),
    video: S('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>'),
    plus: A.ui.plus, close: A.ui.close, check: A.ui.check, menu: A.ui.menu, whatsapp: A.ui.whatsapp,
    print: S('<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><rect x="7" y="14" width="10" height="7"/>'),
    refresh: S('<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>'),
    ext: S('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
    sparkle: S('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>')
  };

  /* ---------- state ---------- */
  const state = { user: null, raw: {}, s: clone(DEF), cats: [], prods: [], orders: [], inq: [], page: "", dirty: false, draft: null, pf: { q: "", cat: "", st: "" }, of: { st: "", q: "" }, counts: { orders: 0, inq: 0 } };
  const STATUS = { new: "جديد", confirmed: "مؤكد", shipped: "قيد التوصيل", delivered: "تم التسليم", cancelled: "ملغي" };

  /* ---------- data ---------- */
  async function q(promise) { const { data, error } = await promise; if (error) throw error; return data; }
  async function loadSettings() { const d = await q(db.from("settings").select("data").eq("id", 1).maybeSingle()); state.raw = (d && d.data) || {}; state.s = window.rqMerge(DEF, state.raw); }
  async function loadCats() { state.cats = await q(db.from("categories").select("*").order("sort").order("created_at")); }
  async function loadProds() { state.prods = await q(db.from("products").select("*").order("sort").order("created_at", { ascending: false })); }
  async function loadOrders() { state.orders = await q(db.from("orders").select("*").order("created_at", { ascending: false }).limit(500)); }
  async function loadInq() { state.inq = await q(db.from("inquiries").select("*").order("created_at", { ascending: false }).limit(500)); }
  async function loadAll() { await Promise.all([loadSettings(), loadCats(), loadProds(), loadOrders(), loadInq()]); updatePills(); }
  const catName = (id) => (state.cats.find((c) => c.id === id) || {}).name || "بدون قسم";
  const iconOf = (p) => (state.cats.find((c) => c.id === p.category_id) || {}).icon || "star";

  /* ---------- uploads ---------- */
  async function compress(file, max = 1800, quality = 0.86) {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); } catch (e) { bmp = await createImageBitmap(file); }
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const blob = (t, qy) => new Promise((r) => c.toBlob(r, t, qy));
    let b = await blob("image/webp", quality);
    if (!b || b.type !== "image/webp") b = await blob("image/jpeg", quality);
    return b && b.size < file.size ? b : file;
  }
  async function upload(file, folder) {
    const isImg = /^image\//.test(file.type), isVid = /^video\//.test(file.type);
    if (!isImg && !isVid) throw new Error("نوع الملف غير مدعوم — اختر صورة أو فيديو");
    if (file.size > 50 * 1024 * 1024) throw new Error("الملف أكبر من ٥٠ ميغابايت — صغّر حجمه ثم أعد المحاولة");
    let body = file;
    const keepAlpha = folder === "brand" && /png|svg|gif/.test(file.type);
    if (isImg && !/svg|gif/.test(file.type) && !keepAlpha) body = await compress(file);
    const type = body.type || file.type;
    const ext = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/svg+xml": "svg", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" }[type] || (file.name.split(".").pop() || "bin").toLowerCase();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await db.storage.from(cfg.bucket).upload(path, body, { contentType: type, cacheControl: "31536000", upsert: false });
    if (error) throw error;
    return db.storage.from(cfg.bucket).getPublicUrl(path).data.publicUrl;
  }

  /* ---------- modal helpers ---------- */
  function modal(html, cls = "") {
    const bg = document.createElement("div");
    bg.className = "modal-bg";
    bg.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(bg); document.body.classList.add("locked");
    const close = () => { bg.remove(); if (!$(".modal-bg")) document.body.classList.remove("locked"); };
    bg.addEventListener("click", (e) => { if (e.target === bg) close(); });
    $$("[data-x]", bg).forEach((b) => b.addEventListener("click", close));
    const first = $("input, select, textarea", bg); if (first && innerWidth > 640) setTimeout(() => first.focus(), 60);
    return { el: bg, close };
  }
  function confirmBox(msg, ok = "حذف", danger = true) {
    return new Promise((res) => {
      const m = modal(`<div class="modal-h"><h2>تأكيد</h2></div><div class="modal-b"><p style="margin:0">${msg}</p></div>
        <div class="modal-f"><button class="btn ${danger ? "danger" : ""}" id="cOk" type="button">${ok}</button><button class="btn light" type="button" id="cNo">إلغاء</button></div>`, "sm");
      $("#cOk", m.el).onclick = () => { m.close(); res(true); };
      $("#cNo", m.el).onclick = () => { m.close(); res(false); };
    });
  }
  const toggleHTML = (attrs, on, label = "") => `<label class="toggle"><input type="checkbox" ${attrs} ${on ? "checked" : ""}><span class="tr"></span>${label ? `<span>${label}</span>` : ""}</label>`;

  /* =======================================================================
     LOGIN
     ======================================================================= */
  function renderLogin(msg) {
    root.innerHTML = `<div class="login"><form class="login-card" id="loginForm" novalidate>
      <div class="mark">${I.sparkle}</div><h1>معرض رقية</h1><p class="sub">لوحة التحكم</p>
      ${msg ? `<div class="notice" style="font-size:14px">${esc(msg)}</div>` : ""}
      <div class="field"><label for="lEmail">البريد الإلكتروني</label><input id="lEmail" type="email" dir="ltr" autocomplete="username" required></div>
      <div class="field"><label for="lPass">كلمة المرور</label><input id="lPass" type="password" dir="ltr" autocomplete="current-password" required></div>
      <button class="btn block" type="submit">تسجيل الدخول</button>
      <p style="text-align:center;margin:16px 0 0"><a href="${SITE}" style="color:var(--soft);font-size:14px">← العودة إلى الموقع</a></p>
    </form></div>`;
    $("#loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("button[type=submit]", e.target); btn.disabled = true; btn.textContent = "جارٍ الدخول…";
      const { error } = await db.auth.signInWithPassword({ email: $("#lEmail").value.trim(), password: $("#lPass").value });
      if (error) { btn.disabled = false; btn.textContent = "تسجيل الدخول"; toast(errMsg(error), true); return; }
      start();
    });
  }

  /* =======================================================================
     SHELL + ROUTER
     ======================================================================= */
  const NAV = [
    ["dashboard", "الرئيسية", I.dash], ["orders", "الطلبات", I.receipt, "orders"], ["products", "المنتجات", I.box], ["categories", "الأقسام", I.folder], ["inquiries", "الرسائل", I.mail, "inq"],
    ["sep", "تخصيص الموقع"], ["home", "محتوى الصفحة الرئيسية", I.home], ["identity", "الهوية والألوان والافتتاحية", I.palette], ["contact", "التواصل والمتجر", I.phone],
    ["sep", "الحساب"], ["account", "حسابي", I.user]
  ];
  function renderShell() {
    root.innerHTML = `<div class="shell">
      <aside class="side" id="side" aria-label="القائمة">
        <div class="brand"><b>${esc(state.s.brand.name)}</b><small>لوحة التحكم</small></div>
        <nav>${NAV.map(([k, l, ic, pill]) => k === "sep" ? `<div class="sep">${l}</div>` : `<a href="#/${k}" data-nav="${k}">${ic}<span>${l}</span>${pill ? `<span class="pill" data-pill="${pill}" hidden></span>` : ""}</a>`).join("")}</nav>
        <div class="foot"><a href="${SITE}" target="_blank" rel="noopener">${I.eye} عرض الموقع</a><button type="button" id="logout">${I.logout} تسجيل الخروج</button></div>
      </aside>
      <div class="side-bg" id="sideBg"></div>
      <div class="main">
        <div class="topbar"><button class="icon" type="button" id="menuBtn" aria-label="القائمة">${I.menu}</button><b>${esc(state.s.brand.name)}</b><a class="icon" href="${SITE}" target="_blank" rel="noopener" aria-label="عرض الموقع">${I.eye}</a></div>
        <main class="content" id="page"></main>
      </div>
    </div>
    <div class="savebar" id="savebar"><span>لديك تغييرات غير محفوظة</span><div style="display:flex;gap:8px"><button class="btn light" type="button" id="discard">تراجع</button><button class="btn" type="button" id="saveBtn">${I.check} حفظ ونشر</button></div></div>`;
    const side = $("#side"), sbg = $("#sideBg");
    $("#menuBtn").onclick = () => { side.classList.add("open"); sbg.classList.add("open"); };
    sbg.onclick = () => { side.classList.remove("open"); sbg.classList.remove("open"); };
    $$("[data-nav]").forEach((a) => a.addEventListener("click", () => { side.classList.remove("open"); sbg.classList.remove("open"); }));
    $("#logout").onclick = async () => { if (state.dirty && !(await confirmBox("لديك تغييرات غير محفوظة. هل تريد الخروج بدون حفظ؟", "خروج"))) return; state.dirty = false; await db.auth.signOut(); renderLogin(); };
    $("#saveBtn").onclick = saveSettings;
    $("#discard").onclick = () => { state.dirty = false; showSave(false); route(true); };
    updatePills();
  }
  function updatePills() {
    state.counts.orders = state.orders.filter((o) => o.status === "new").length;
    state.counts.inq = state.inq.filter((m) => !m.is_read).length;
    $$("[data-pill]").forEach((p) => { const n = state.counts[p.dataset.pill]; p.textContent = num(n); p.hidden = !n; });
  }
  let lastHash = "";
  async function route(force) {
    if (!$("#page")) return; // not signed in / still loading
    const page = (location.hash.replace(/^#\/?/, "").split("?")[0]) || "dashboard";
    if (!force && state.dirty && page !== state.page) {
      const go = await confirmBox("لديك تغييرات غير محفوظة في هذه الصفحة. هل تريد المغادرة بدون حفظ؟", "مغادرة");
      if (!go) { history.replaceState(null, "", lastHash || "#/" + state.page); return; }
      state.dirty = false; showSave(false);
    }
    lastHash = location.hash;
    state.page = page;
    $$("[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === page));
    const old = $("#page"); if (old) { const fresh = old.cloneNode(false); old.replaceWith(fresh); } // drop listeners of the previous page
    const P = { dashboard: pageDashboard, orders: pageOrders, products: pageProducts, categories: pageCategories, inquiries: pageInquiries, home: () => pageSettings("home"), identity: () => pageSettings("identity"), contact: () => pageSettings("contact"), account: pageAccount };
    (P[page] || pageDashboard)();
    scrollTo(0, 0);
  }
  addEventListener("hashchange", () => route());
  addEventListener("beforeunload", (e) => { if (state.dirty) { e.preventDefault(); e.returnValue = ""; } });
  const page = () => $("#page");

  /* =======================================================================
     DASHBOARD
     ======================================================================= */
  function pageDashboard() {
    const s = state.s;
    const now = new Date(), month = state.orders.filter((o) => o.status !== "cancelled" && new Date(o.created_at).getMonth() === now.getMonth() && new Date(o.created_at).getFullYear() === now.getFullYear());
    const sales = month.reduce((a, o) => a + (o.total || 0), 0);
    const samples = state.prods.filter((p) => /منتج تجريبي/.test(p.description || ""));
    const todo = [
      !s.contact.whatsapp && ["أضف رقم واتساب ليصلك تفاصيل كل طلب ويستطيع الزبائن مراسلتك", "#/contact"],
      !s.brand.logo && ["ارفع شعار المعرض", "#/identity"],
      !s.intro.video && ["ارفع فيديو الافتتاحية (ظهور الشعار)", "#/identity"],
      samples.length && [`استبدل المنتجات التجريبية (${num(samples.length)}) بمنتجاتك الحقيقية وصورها`, "#/products"],
      !s.contact.phone && ["أضف رقم الهاتف وأوقات الدوام", "#/contact"]
    ].filter(Boolean);
    page().innerHTML = `<div class="page-title"><div><h1>أهلاً بك</h1><p>نظرة سريعة على المعرض</p></div><a class="btn" href="#/products?new=1">${I.plus} إضافة منتج</a></div>
      <div class="stats">
        <a class="stat" href="#/orders"><div class="ic">${I.receipt}</div><div><b>${num(state.counts.orders)}</b><span>طلبات جديدة</span></div></a>
        <div class="stat"><div class="ic">${I.sparkle}</div><div><b>${num(sales)}</b><span>مبيعات هذا الشهر (${esc(s.shop.currency)})</span></div></div>
        <a class="stat" href="#/products"><div class="ic">${I.box}</div><div><b>${num(state.prods.filter((p) => p.active).length)}</b><span>منتج معروض من ${num(state.prods.length)}</span></div></a>
        <a class="stat" href="#/inquiries"><div class="ic">${I.mail}</div><div><b>${num(state.counts.inq)}</b><span>رسائل غير مقروءة</span></div></a>
      </div>
      ${todo.length ? `<div class="card"><h2>خطوات لإكمال الموقع</h2><div class="rows">${todo.map(([t, h]) => `<a class="row click" href="${h}" style="grid-template-columns:auto 1fr auto;text-decoration:none"><span class="status s-new">مطلوب</span><span>${t}</span><span>${I.left}</span></a>`).join("")}</div></div>` : ""}
      <div class="card"><div class="card-h"><h2>آخر الطلبات</h2><a class="btn ghost sm" href="#/orders">كل الطلبات</a></div>
        ${state.orders.length ? `<div class="rows">${state.orders.slice(0, 6).map(orderRow).join("")}</div>` : `<div class="empty">لا توجد طلبات بعد — ستظهر هنا فور وصولها.</div>`}</div>
      <div class="card"><h2>روابط سريعة</h2><div style="display:flex;gap:8px;flex-wrap:wrap">
        <a class="btn light" href="#/home">${I.home} تعديل الصفحة الرئيسية</a><a class="btn light" href="#/identity">${I.palette} الشعار والألوان</a>
        <a class="btn light" href="#/categories">${I.folder} الأقسام</a><a class="btn light" href="${SITE}" target="_blank" rel="noopener">${I.eye} عرض الموقع</a></div></div>`;
    bindOrderRows();
  }

  /* =======================================================================
     PRODUCTS
     ======================================================================= */
  function thumb(p) {
    const img = (p.images || [])[0];
    return img ? `<img src="${esc(img)}" alt="" loading="lazy">` : A.productArt(p, iconOf(p));
  }
  function pageProducts() {
    const f = state.pf;
    page().innerHTML = `<div class="page-title"><div><h1>المنتجات</h1><p>${num(state.prods.length)} منتج — اضغط على أي منتج لتعديله</p></div><button class="btn" type="button" id="addProd">${I.plus} إضافة منتج</button></div>
      <div class="toolbar">
        <input class="input" type="search" id="pSearch" placeholder="ابحث بالاسم أو الحجر…" value="${esc(f.q)}" aria-label="بحث">
        <select class="input" id="pCat" aria-label="القسم"><option value="">كل الأقسام</option>${state.cats.map((c) => `<option value="${c.id}" ${f.cat === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}<option value="none" ${f.cat === "none" ? "selected" : ""}>بدون قسم</option></select>
        <select class="input" id="pSt" aria-label="الحالة"><option value="">كل الحالات</option><option value="on" ${f.st === "on" ? "selected" : ""}>معروض</option><option value="off" ${f.st === "off" ? "selected" : ""}>مخفي</option><option value="feat" ${f.st === "feat" ? "selected" : ""}>مميز</option><option value="out" ${f.st === "out" ? "selected" : ""}>نفدت الكمية</option></select>
      </div>
      <div class="rows" id="pList"></div>`;
    const draw = () => {
      const qy = f.q.trim();
      let list = state.prods.filter((p) => (!qy || [p.name, p.stone, p.metal, p.badge].join(" ").includes(qy)) &&
        (!f.cat || (f.cat === "none" ? !p.category_id : p.category_id === f.cat)) &&
        (!f.st || (f.st === "on" && p.active) || (f.st === "off" && !p.active) || (f.st === "feat" && p.featured) || (f.st === "out" && p.stock === 0)));
      $("#pList").innerHTML = list.length ? list.map((p) => `<div class="row click ${p.active ? "" : "off"}" data-pid="${p.id}">
        <div class="th">${thumb(p)}</div>
        <div><h3>${esc(p.name)} ${p.featured ? `<span title="مميز" style="display:inline-block;width:16px;vertical-align:-2px">${I.starOn}</span>` : ""}</h3>
          <div class="meta"><span>${esc(catName(p.category_id))}</span><span class="price">${money(p.price)}</span>${p.stock === 0 ? `<span class="status s-cancelled">نفدت</span>` : p.stock ? `<span>المخزون: ${num(p.stock)}</span>` : ""}${!p.active ? `<span class="status s-cancelled">مخفي</span>` : ""}${(p.images || []).length ? `<span>${num(p.images.length)} صورة</span>` : `<span style="color:var(--warn)">بدون صور</span>`}</div></div>
        <div class="acts">
          ${toggleHTML(`data-act="active" aria-label="إظهار على الموقع"`, p.active, "معروض")}
          <button class="icon" type="button" data-act="feat" aria-label="${p.featured ? "إلغاء التمييز" : "تمييز"}" title="مميز">${p.featured ? I.starOn : I.star}</button>
          <button class="icon" type="button" data-act="edit" aria-label="تعديل">${I.edit}</button>
          <button class="icon" type="button" data-act="dup" aria-label="نسخ" title="نسخ">${I.copy}</button>
          <button class="icon danger" type="button" data-act="del" aria-label="حذف">${I.trash}</button>
        </div></div>`).join("") : `<div class="empty">لا توجد منتجات مطابقة.</div>`;
    };
    draw();
    $("#pSearch").addEventListener("input", (e) => { f.q = e.target.value; draw(); });
    $("#pCat").addEventListener("change", (e) => { f.cat = e.target.value; draw(); });
    $("#pSt").addEventListener("change", (e) => { f.st = e.target.value; draw(); });
    $("#addProd").onclick = () => editProduct(null);
    $("#pList").addEventListener("click", async (e) => {
      const row = e.target.closest("[data-pid]"); if (!row) return;
      const p = state.prods.find((x) => x.id === row.dataset.pid);
      const act = (e.target.closest("[data-act]") || {}).dataset?.act;
      if (act === "active") return; // handled on change
      if (e.target.closest(".toggle")) return;
      try {
        if (act === "feat") { await q(db.from("products").update({ featured: !p.featured }).eq("id", p.id)); p.featured = !p.featured; draw(); toast(p.featured ? "أصبح المنتج مميزاً" : "أُلغي التمييز"); }
        else if (act === "dup") { const c = clone(p); delete c.id; delete c.created_at; delete c.updated_at; c.name += " (نسخة)"; c.active = false; const n = await q(db.from("products").insert(c).select().single()); state.prods.unshift(n); draw(); toast("تم نسخ المنتج (مخفي حتى تعدّله)"); editProduct(n); }
        else if (act === "del") { if (!(await confirmBox(`حذف «${esc(p.name)}» نهائياً؟`))) return; await q(db.from("products").delete().eq("id", p.id)); state.prods = state.prods.filter((x) => x.id !== p.id); draw(); toast("تم الحذف"); }
        else editProduct(p);
      } catch (err) { toast(errMsg(err), true); }
    });
    $("#pList").addEventListener("change", async (e) => {
      const cb = e.target.closest('[data-act="active"]'); if (!cb) return;
      const p = state.prods.find((x) => x.id === e.target.closest("[data-pid]").dataset.pid);
      try { await q(db.from("products").update({ active: cb.checked }).eq("id", p.id)); p.active = cb.checked; draw(); toast(cb.checked ? "المنتج ظاهر على الموقع" : "المنتج مخفي عن الموقع"); }
      catch (err) { cb.checked = !cb.checked; toast(errMsg(err), true); }
    });
    if (/new=1/.test(location.hash)) { history.replaceState(null, "", "#/products"); editProduct(null); }
  }

  function editProduct(p) {
    const isNew = !p;
    const d = p ? clone(p) : { name: "", category_id: state.pf.cat && state.pf.cat !== "none" ? state.pf.cat : (state.cats[0] || {}).id || null, price: null, old_price: null, images: [], badge: "", description: "", metal: "", stone: "", weight: "", size: "", stock: null, featured: false, active: true, sort: Math.max(0, ...state.prods.map((x) => x.sort || 0)) + 1 };
    const m = modal(`<div class="modal-h"><h2>${isNew ? "منتج جديد" : "تعديل المنتج"}</h2><button class="icon" type="button" data-x aria-label="إغلاق">${I.close}</button></div>
      <form class="modal-b" id="pForm" novalidate>
        <div class="field"><span class="lbl">الصور</span><span class="hint">الصورة الأولى هي الرئيسية. تُضغط الصور تلقائياً لتفتح بسرعة. يمكنك اختيار عدة صور مرة واحدة.</span><div class="imgs" id="pImgs"></div></div>
        <div class="field"><label for="fName">اسم المنتج *</label><input type="text" id="fName" value="${esc(d.name)}" maxlength="200" required></div>
        <div class="grid2">
          <div class="field"><label for="fCat">القسم</label><select id="fCat"><option value="">بدون قسم</option>${state.cats.map((c) => `<option value="${c.id}" ${d.category_id === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
          <div class="field"><label for="fBadge">شارة (اختياري)</label><input type="text" id="fBadge" value="${esc(d.badge)}" maxlength="30" placeholder="جديد، الأكثر طلباً…"></div>
        </div>
        <div class="grid2">
          <div class="field"><label for="fPrice">السعر (${esc(state.s.shop.currency)}) *</label><input type="text" inputmode="numeric" id="fPrice" value="${d.price ?? ""}" dir="ltr" placeholder="150000"></div>
          <div class="field"><label for="fOld">السعر قبل الخصم (اختياري)</label><input type="text" inputmode="numeric" id="fOld" value="${d.old_price ?? ""}" dir="ltr"></div>
        </div>
        <div class="field"><label for="fDesc">الوصف</label><textarea id="fDesc" maxlength="4000">${esc(d.description)}</textarea></div>
        <div class="grid2">
          <div class="field"><label for="fMetal">المعدن</label><input type="text" id="fMetal" value="${esc(d.metal)}" placeholder="فضة ٩٢٥"></div>
          <div class="field"><label for="fStone">الحجر</label><input type="text" id="fStone" value="${esc(d.stone)}" placeholder="عقيق يماني"></div>
          <div class="field"><label for="fWeight">الوزن</label><input type="text" id="fWeight" value="${esc(d.weight)}" placeholder="١٢ غرام"></div>
          <div class="field"><label for="fSize">المقاس / الحجم</label><input type="text" id="fSize" value="${esc(d.size)}" placeholder="٢٠ أو ١٠٠ مل"></div>
        </div>
        <div class="grid2">
          <div class="field"><label for="fStock">الكمية المتوفرة</label><input type="text" inputmode="numeric" id="fStock" value="${d.stock ?? ""}" dir="ltr" placeholder="اتركه فارغاً = غير محدود"><span class="hint">ضع ٠ ليظهر «نفدت الكمية»</span></div>
          <div class="field"><label for="fSort">ترتيب الظهور</label><input type="text" inputmode="numeric" id="fSort" value="${d.sort ?? 0}" dir="ltr"><span class="hint">الرقم الأصغر يظهر أولاً</span></div>
        </div>
        <div style="display:flex;gap:24px;flex-wrap:wrap">${toggleHTML('id="fActive"', d.active, "ظاهر على الموقع")}${toggleHTML('id="fFeat"', d.featured, "منتج مميز (يظهر في الواجهة)")}</div>
      </form>
      <div class="modal-f"><button class="btn" type="button" id="pSave">${I.check} حفظ المنتج</button><button class="btn light" type="button" data-x>إلغاء</button>
        ${isNew ? "" : `<a class="btn ghost" href="${SITE}#/p/${d.id}" target="_blank" rel="noopener" style="margin-inline-start:auto">${I.eye} عرض</a>`}</div>`);
    let busy = 0;
    const drawImgs = () => {
      $("#pImgs", m.el).innerHTML = d.images.map((u, i) => `<div class="img-item"><img src="${esc(u)}" alt="">${i === 0 ? `<span class="main-tag">الرئيسية</span>` : ""}
        <div class="ctrl"><button type="button" data-mv="${i}" data-d="-1" aria-label="تقديم">${I.right}</button><button type="button" data-rmimg="${i}" aria-label="حذف الصورة">${I.trash}</button><button type="button" data-mv="${i}" data-d="1" aria-label="تأخير">${I.left}</button></div></div>`).join("") +
        Array.from({ length: busy }, () => `<div class="img-item"><div class="uploading"><div class="spin"></div></div></div>`).join("") +
        `<label class="img-add">${I.img}<span>إضافة صور</span><input type="file" accept="image/*" multiple id="imgIn"></label>`;
      $("#imgIn", m.el).addEventListener("change", async (e) => {
        const files = Array.from(e.target.files || []); if (!files.length) return;
        busy += files.length; drawImgs();
        for (const file of files) {
          try { d.images.push(await upload(file, "products")); } catch (err) { toast(errMsg(err), true); }
          busy--; drawImgs();
        }
      });
    };
    drawImgs();
    $("#pImgs", m.el).addEventListener("click", (e) => {
      const mv = e.target.closest("[data-mv]"), rm = e.target.closest("[data-rmimg]");
      if (mv) { const i = +mv.dataset.mv, j = i + +mv.dataset.d; if (j < 0 || j >= d.images.length) return; [d.images[i], d.images[j]] = [d.images[j], d.images[i]]; drawImgs(); }
      if (rm) { d.images.splice(+rm.dataset.rmimg, 1); drawImgs(); }
    });
    $("#pSave", m.el).onclick = async () => {
      if (busy) { toast("انتظر حتى ينتهي رفع الصور"); return; }
      const name = $("#fName", m.el).value.trim(), price = intOrNull($("#fPrice", m.el).value);
      if (!name) { toast("اكتب اسم المنتج", true); $("#fName", m.el).focus(); return; }
      if (price === null) { toast("اكتب السعر بالأرقام", true); $("#fPrice", m.el).focus(); return; }
      const row = {
        name, price, category_id: $("#fCat", m.el).value || null, badge: $("#fBadge", m.el).value.trim(), old_price: intOrNull($("#fOld", m.el).value),
        description: $("#fDesc", m.el).value.trim(), metal: $("#fMetal", m.el).value.trim(), stone: $("#fStone", m.el).value.trim(), weight: $("#fWeight", m.el).value.trim(), size: $("#fSize", m.el).value.trim(),
        stock: intOrNull($("#fStock", m.el).value), sort: intOrNull($("#fSort", m.el).value) || 0, active: $("#fActive", m.el).checked, featured: $("#fFeat", m.el).checked, images: d.images
      };
      const btn = $("#pSave", m.el); btn.disabled = true;
      try {
        if (isNew) { const n = await q(db.from("products").insert(row).select().single()); state.prods.unshift(n); }
        else { const n = await q(db.from("products").update(row).eq("id", d.id).select().single()); state.prods = state.prods.map((x) => (x.id === n.id ? n : x)); }
        state.prods.sort((a, b) => (a.sort - b.sort) || (b.created_at || "").localeCompare(a.created_at || ""));
        m.close(); toast(isNew ? "تمت إضافة المنتج — ظاهر على الموقع الآن" : "تم حفظ التعديلات");
        if (state.page === "products") pageProducts(); else if (state.page === "dashboard") pageDashboard();
      } catch (err) { btn.disabled = false; toast(errMsg(err), true); }
    };
  }

  /* =======================================================================
     CATEGORIES
     ======================================================================= */
  function pageCategories() {
    page().innerHTML = `<div class="page-title"><div><h1>الأقسام</h1><p>رتّب الأقسام وغيّر أسماءها وأيقوناتها أو صورها</p></div><button class="btn" type="button" id="addCat">${I.plus} إضافة قسم</button></div><div class="rows" id="cList"></div>`;
    const draw = () => {
      $("#cList").innerHTML = state.cats.length ? state.cats.map((c, i) => `<div class="row ${c.active ? "" : "off"}" data-cid="${c.id}">
        <div class="th">${c.image_url ? `<img src="${esc(c.image_url)}" alt="">` : A.depIcon(c.icon)}</div>
        <div><h3>${esc(c.name)}</h3><div class="meta"><span>${esc(c.subtitle)}</span><span>${num(state.prods.filter((p) => p.category_id === c.id).length)} منتج</span>${c.active ? "" : `<span class="status s-cancelled">مخفي</span>`}</div></div>
        <div class="acts">
          <button class="icon" type="button" data-act="up" aria-label="تحريك للأعلى" ${i === 0 ? "disabled" : ""}>${I.up}</button>
          <button class="icon" type="button" data-act="down" aria-label="تحريك للأسفل" ${i === state.cats.length - 1 ? "disabled" : ""}>${I.down}</button>
          ${toggleHTML('data-act="active" aria-label="إظهار"', c.active, "ظاهر")}
          <button class="icon" type="button" data-act="edit" aria-label="تعديل">${I.edit}</button>
          <button class="icon danger" type="button" data-act="del" aria-label="حذف">${I.trash}</button>
        </div></div>`).join("") : `<div class="empty">لا توجد أقسام.</div>`;
    };
    draw();
    $("#addCat").onclick = () => editCategory(null);
    $("#cList").addEventListener("click", async (e) => {
      const row = e.target.closest("[data-cid]"); if (!row || e.target.closest(".toggle")) return;
      const i = state.cats.findIndex((x) => x.id === row.dataset.cid), c = state.cats[i];
      const act = (e.target.closest("[data-act]") || {}).dataset?.act; if (!act) return;
      try {
        if (act === "up" || act === "down") {
          const j = act === "up" ? i - 1 : i + 1; if (j < 0 || j >= state.cats.length) return;
          [state.cats[i], state.cats[j]] = [state.cats[j], state.cats[i]];
          state.cats.forEach((x, k) => (x.sort = k + 1));
          draw();
          await Promise.all([state.cats[i], state.cats[j]].map((x) => q(db.from("categories").update({ sort: x.sort }).eq("id", x.id))));
        } else if (act === "edit") editCategory(c);
        else if (act === "del") {
          const n = state.prods.filter((p) => p.category_id === c.id).length;
          if (!(await confirmBox(`حذف قسم «${esc(c.name)}»؟${n ? `<br><small>منتجاته (${num(n)}) لن تُحذف، لكنها ستصبح «بدون قسم».</small>` : ""}`))) return;
          await q(db.from("categories").delete().eq("id", c.id));
          state.cats.splice(i, 1); state.prods.forEach((p) => { if (p.category_id === c.id) p.category_id = null; }); draw(); toast("تم حذف القسم");
        }
      } catch (err) { toast(errMsg(err), true); }
    });
    $("#cList").addEventListener("change", async (e) => {
      const cb = e.target.closest('[data-act="active"]'); if (!cb) return;
      const c = state.cats.find((x) => x.id === e.target.closest("[data-cid]").dataset.cid);
      try { await q(db.from("categories").update({ active: cb.checked }).eq("id", c.id)); c.active = cb.checked; draw(); }
      catch (err) { cb.checked = !cb.checked; toast(errMsg(err), true); }
    });
  }
  function editCategory(c) {
    const isNew = !c;
    const d = c ? clone(c) : { name: "", subtitle: "", slug: "", icon: "gift", image_url: "", active: true, sort: state.cats.length + 1 };
    const m = modal(`<div class="modal-h"><h2>${isNew ? "قسم جديد" : "تعديل القسم"}</h2><button class="icon" type="button" data-x aria-label="إغلاق">${I.close}</button></div>
      <div class="modal-b">
        <div class="field"><label for="cName">اسم القسم *</label><input type="text" id="cName" value="${esc(d.name)}" maxlength="120"></div>
        <div class="field"><label for="cSub">وصف قصير</label><input type="text" id="cSub" value="${esc(d.subtitle)}" maxlength="120" placeholder="عقيق · فيروز"></div>
        <div class="field"><label for="cSlug">الرابط المختصر (بالإنجليزي)</label><input type="text" id="cSlug" value="${esc(d.slug)}" dir="ltr" placeholder="mens-rings" maxlength="60"><span class="hint">يظهر في رابط القسم. حروف إنجليزية صغيرة وأرقام وشرطة فقط — اتركه فارغاً ليُنشأ تلقائياً.</span></div>
        <div class="field"><span class="lbl">الأيقونة</span><div class="icons" id="cIcons">${Object.keys(A.dep).map((k) => `<button type="button" data-ic="${k}" class="${d.icon === k ? "on" : ""}" aria-label="${A.depNames[k] || k}" title="${A.depNames[k] || k}">${A.depIcon(k)}</button>`).join("")}</div></div>
        <div class="field"><span class="lbl">صورة القسم (اختياري — تظهر بدل الأيقونة)</span><div class="media-field" id="cImg"></div></div>
        ${toggleHTML('id="cActive"', d.active, "ظاهر على الموقع")}
      </div>
      <div class="modal-f"><button class="btn" type="button" id="cSave">${I.check} حفظ القسم</button><button class="btn light" type="button" data-x>إلغاء</button></div>`);
    const drawImg = (loading) => {
      $("#cImg", m.el).innerHTML = `<div class="media-prev">${loading ? `<div class="spin"></div>` : d.image_url ? `<img src="${esc(d.image_url)}" alt="">` : "لا توجد صورة"}</div>
        <label class="btn light up-btn">${I.img} رفع صورة<input type="file" accept="image/*"></label>${d.image_url ? `<button class="btn danger" type="button" id="cImgRm">إزالة</button>` : ""}`;
      $("input[type=file]", m.el.querySelector("#cImg")).addEventListener("change", async (e) => {
        const f = e.target.files[0]; if (!f) return; drawImg(true);
        try { d.image_url = await upload(f, "categories"); } catch (err) { toast(errMsg(err), true); }
        drawImg();
      });
      const rm = $("#cImgRm", m.el); if (rm) rm.onclick = () => { d.image_url = ""; drawImg(); };
    };
    drawImg();
    $("#cIcons", m.el).addEventListener("click", (e) => { const b = e.target.closest("[data-ic]"); if (!b) return; d.icon = b.dataset.ic; $$("[data-ic]", m.el).forEach((x) => x.classList.toggle("on", x === b)); });
    $("#cSave", m.el).onclick = async () => {
      const name = $("#cName", m.el).value.trim(); if (!name) { toast("اكتب اسم القسم", true); return; }
      let slug = $("#cSlug", m.el).value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      if (!slug) slug = "cat-" + Date.now().toString(36);
      const row = { name, subtitle: $("#cSub", m.el).value.trim(), slug, icon: d.icon, image_url: d.image_url, active: $("#cActive", m.el).checked };
      try {
        if (isNew) { row.sort = d.sort; const n = await q(db.from("categories").insert(row).select().single()); state.cats.push(n); }
        else { const n = await q(db.from("categories").update(row).eq("id", d.id).select().single()); state.cats = state.cats.map((x) => (x.id === n.id ? n : x)); }
        m.close(); toast("تم حفظ القسم"); pageCategories();
      } catch (err) { toast(errMsg(err), true); }
    };
  }

  /* =======================================================================
     ORDERS
     ======================================================================= */
  function orderRow(o) {
    const n = (o.items || []).reduce((a, i) => a + (i.qty || 0), 0);
    return `<div class="row click" data-oid="${o.id}" style="grid-template-columns:auto 1fr auto">
      <div style="font-family:Georgia,serif;font-size:18px;color:var(--em);direction:ltr">#${o.order_no}</div>
      <div><h3>${esc(o.customer_name)} <span class="status s-${o.status}">${STATUS[o.status]}</span></h3>
        <div class="meta"><span dir="ltr">${esc(o.phone)}</span><span>${esc(o.city)}</span><span>${num(n)} قطعة</span><span>${when(o.created_at)}</span></div></div>
      <div class="price">${money(o.total)}</div></div>`;
  }
  function bindOrderRows() { $$("[data-oid]").forEach((r) => r.addEventListener("click", () => openOrder(state.orders.find((o) => o.id === r.dataset.oid)))); }
  function pageOrders() {
    const f = state.of;
    const counts = Object.fromEntries(Object.keys(STATUS).map((k) => [k, state.orders.filter((o) => o.status === k).length]));
    page().innerHTML = `<div class="page-title"><div><h1>الطلبات</h1><p>${num(state.orders.length)} طلب</p></div><button class="btn light" type="button" id="oRef">${I.refresh} تحديث</button></div>
      <div class="tabs" role="tablist"><button class="tab ${!f.st ? "on" : ""}" data-st="">الكل<span class="n">${num(state.orders.length)}</span></button>${Object.entries(STATUS).map(([k, l]) => `<button class="tab ${f.st === k ? "on" : ""}" data-st="${k}">${l}<span class="n">${num(counts[k])}</span></button>`).join("")}</div>
      <div class="toolbar"><input class="input" type="search" id="oSearch" placeholder="ابحث بالاسم أو الهاتف أو رقم الطلب…" value="${esc(f.q)}" aria-label="بحث"></div>
      <div class="rows" id="oList"></div>`;
    const draw = () => {
      const qy = toLatin(f.q.trim());
      const list = state.orders.filter((o) => (!f.st || o.status === f.st) && (!qy || [o.customer_name, toLatin(o.phone), String(o.order_no), o.city].join(" ").includes(qy)));
      $("#oList").innerHTML = list.length ? list.map(orderRow).join("") : `<div class="empty">لا توجد طلبات هنا.</div>`;
      bindOrderRows();
    };
    draw();
    $$("[data-st]").forEach((b) => b.addEventListener("click", () => { f.st = b.dataset.st; pageOrders(); }));
    $("#oSearch").addEventListener("input", (e) => { f.q = e.target.value; draw(); });
    $("#oRef").onclick = async () => { try { await loadOrders(); updatePills(); pageOrders(); toast("تم التحديث"); } catch (err) { toast(errMsg(err), true); } };
  }
  function openOrder(o) {
    if (!o) return;
    const s = state.s;
    const wa = waNumber(o.phone);
    const waText = `مرحباً ${o.customer_name}، معكم ${s.brand.full}.\nبخصوص طلبكم رقم #${o.order_no} بقيمة ${num(o.total)} ${s.shop.currency}.`;
    const m = modal(`<div class="modal-h"><h2>طلب <span dir="ltr">#${o.order_no}</span></h2><button class="icon" type="button" data-x aria-label="إغلاق">${I.close}</button></div>
      <div class="modal-b">
        <div class="field no-print"><span class="lbl">حالة الطلب</span><div class="status-btns" id="oStatus">${Object.entries(STATUS).map(([k, l]) => `<button type="button" data-set="${k}" class="s-${k} ${o.status === k ? "on" : ""}">${l}</button>`).join("")}</div></div>
        <dl class="kv"><dt>الزبون</dt><dd>${esc(o.customer_name)}</dd><dt>الهاتف</dt><dd dir="ltr" style="text-align:right">${esc(o.phone)}</dd><dt>المحافظة</dt><dd>${esc(o.city)}</dd><dt>العنوان</dt><dd>${esc(o.address) || "—"}</dd>${o.notes ? `<dt>ملاحظات</dt><dd>${esc(o.notes)}</dd>` : ""}<dt>التاريخ</dt><dd>${when(o.created_at)}</dd></dl>
        <div class="o-items">${(o.items || []).map((i) => `<div class="o-item"><div class="th">${i.image ? `<img src="${esc(i.image)}" alt="">` : ""}</div><div><b>${esc(i.name)}</b><div style="color:var(--soft);font-size:13px">${money(i.price)} × ${num(i.qty)}</div></div><div class="price">${money(i.price * i.qty)}</div></div>`).join("")}</div>
        <dl class="kv"><dt>المجموع</dt><dd>${money(o.subtotal)}</dd><dt>التوصيل</dt><dd>${o.delivery ? money(o.delivery) : "مجاني"}</dd><dt><b>الإجمالي</b></dt><dd class="price">${money(o.total)}</dd></dl>
        <div class="field no-print"><label for="oNote">ملاحظة داخلية (لا يراها الزبون)</label><textarea id="oNote" style="min-height:70px">${esc(o.admin_note)}</textarea></div>
      </div>
      <div class="modal-f">
        ${wa ? `<a class="btn wa" href="https://wa.me/${wa}?text=${encodeURIComponent(waText)}" target="_blank" rel="noopener">${I.whatsapp} واتساب الزبون</a>` : ""}
        <a class="btn light" href="tel:${esc(toLatin(o.phone).replace(/[^\d+]/g, ""))}">${I.phone} اتصال</a>
        <button class="btn light" type="button" id="oPrint">${I.print} طباعة</button>
        <button class="btn light" type="button" id="oNoteSave">حفظ الملاحظة</button>
        <button class="btn danger" type="button" id="oDel" style="margin-inline-start:auto">${I.trash}</button>
      </div>`);
    $("#oStatus", m.el).addEventListener("click", async (e) => {
      const b = e.target.closest("[data-set]"); if (!b || b.dataset.set === o.status) return;
      try { await q(db.from("orders").update({ status: b.dataset.set }).eq("id", o.id)); o.status = b.dataset.set; $$("[data-set]", m.el).forEach((x) => x.classList.toggle("on", x === b)); updatePills(); toast(`حالة الطلب: ${STATUS[o.status]}`); refreshOrderViews(); }
      catch (err) { toast(errMsg(err), true); }
    });
    $("#oNoteSave", m.el).onclick = async () => { try { const v = $("#oNote", m.el).value; await q(db.from("orders").update({ admin_note: v }).eq("id", o.id)); o.admin_note = v; toast("حُفظت الملاحظة"); } catch (err) { toast(errMsg(err), true); } };
    $("#oPrint", m.el).onclick = () => print();
    $("#oDel", m.el).onclick = async () => {
      if (!(await confirmBox(`حذف الطلب #${o.order_no} نهائياً؟`))) return;
      try { await q(db.from("orders").delete().eq("id", o.id)); state.orders = state.orders.filter((x) => x.id !== o.id); m.close(); updatePills(); refreshOrderViews(); toast("حُذف الطلب"); }
      catch (err) { toast(errMsg(err), true); }
    };
  }
  function refreshOrderViews() { if (state.page === "orders") pageOrders(); if (state.page === "dashboard") pageDashboard(); }

  /* =======================================================================
     INQUIRIES
     ======================================================================= */
  function pageInquiries() {
    page().innerHTML = `<div class="page-title"><div><h1>الرسائل</h1><p>رسائل نموذج «راسلنا» في الموقع</p></div></div><div class="rows" id="mList"></div>`;
    const draw = () => {
      $("#mList").innerHTML = state.inq.length ? state.inq.map((x) => {
        const wa = waNumber(x.phone);
        return `<div class="row" data-mid="${x.id}" style="grid-template-columns:1fr;${x.is_read ? "" : "border-color:var(--gold)"}">
          <div><h3>${x.is_read ? "" : `<span class="status s-new">جديدة</span> `}${esc(x.name)}</h3><div class="meta"><span dir="ltr">${esc(x.phone) || "بدون هاتف"}</span><span>${when(x.created_at)}</span></div>
          <p style="margin:8px 0 0;white-space:pre-line">${esc(x.body)}</p></div>
          <div class="acts" style="justify-content:flex-start">
            ${wa ? `<a class="btn wa sm" href="https://wa.me/${wa}?text=${encodeURIComponent(`مرحباً ${x.name}، معكم ${state.s.brand.full}.`)}" target="_blank" rel="noopener">${I.whatsapp} رد على واتساب</a>` : ""}
            ${x.is_read ? "" : `<button class="btn light sm" type="button" data-act="read">${I.check} تم الاطلاع</button>`}
            <button class="btn danger sm" type="button" data-act="del">${I.trash} حذف</button>
          </div></div>`;
      }).join("") : `<div class="empty">لا توجد رسائل بعد.</div>`;
    };
    draw();
    $("#mList").addEventListener("click", async (e) => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const x = state.inq.find((i) => i.id === b.closest("[data-mid]").dataset.mid);
      try {
        if (b.dataset.act === "read") { await q(db.from("inquiries").update({ is_read: true }).eq("id", x.id)); x.is_read = true; }
        if (b.dataset.act === "del") { if (!(await confirmBox("حذف هذه الرسالة؟"))) return; await q(db.from("inquiries").delete().eq("id", x.id)); state.inq = state.inq.filter((i) => i.id !== x.id); }
        updatePills(); draw();
      } catch (err) { toast(errMsg(err), true); }
    });
  }

  /* =======================================================================
     SETTINGS (generic form builder — every text, image and color)
     ======================================================================= */
  const SH = (p, l, extra = {}) => ({ p, l, ...extra });
  const showT = (p) => SH(p, "إظهار هذا القسم في الموقع", { t: "toggle" });
  const SCHEMA = {
    home: {
      title: "محتوى الصفحة الرئيسية", sub: "كل النصوص والصور في الصفحة الرئيسية، بالترتيب الذي تظهر به",
      groups: [
        { title: "الواجهة الرئيسية (أعلى الصفحة)", fields: [
          SH("hero.eyebrow", "السطر الصغير فوق العنوان"), SH("hero.title1", "العنوان — السطر الأول"), SH("hero.title2", "العنوان — السطر الثاني (بلون فضّي لامع)"),
          SH("hero.text", "النص التعريفي", { t: "textarea" }), SH("hero.cta1", "نص الزر الأول (يفتح المتجر)"), SH("hero.cta2", "نص الزر الثاني (ينزل إلى الأقسام)"),
          SH("hero.slides", "صور العرض المتحرك داخل القوس", { t: "list", add: "إضافة صورة", hint: "تتبدّل الصور بحركة انتقال ناعمة. إن تركتها فارغة ستُعرض صور المنتجات المميزة تلقائياً.", fields: [{ k: "image", l: "الصورة", t: "image", folder: "slides" }, { k: "title", l: "عنوان على الصورة" }, { k: "caption", l: "سطر صغير تحته" }, { k: "link", l: "رابط عند الضغط (اختياري)", dir: "ltr" }] }),
          SH("hero.slide_seconds", "مدة كل صورة بالثواني", { t: "number" }),
          SH("hero.stats", "الأرقام تحت النص", { t: "list", add: "إضافة رقم", hint: "عدد الأقسام يُضاف تلقائياً.", fields: [{ k: "value", l: "الرقم" }, { k: "label", l: "الوصف" }] })
        ] },
        { title: "شريط الإعلانات أعلى الموقع", fields: [SH("announcement.enabled", "إظهار الشريط", { t: "toggle" }), SH("announcement.items", "الجمل المتحركة", { t: "strings", add: "إضافة جملة" })] },
        { title: "قسم «أقسام المعرض»", fields: [showT("sections.departments.show"), SH("sections.departments.eyebrow", "السطر الصغير"), SH("sections.departments.title", "العنوان"), SH("sections.departments.text", "الوصف")] },
        { title: "قسم «قطعة الموسم»", fields: [showT("sections.featured.show"), SH("sections.featured.product_id", "المنتج المعروض", { t: "product", hint: "إن لم تختر، يُعرض أول منتج مميز." }), SH("sections.featured.eyebrow", "السطر الصغير"), SH("sections.featured.button", "نص الزر")] },
        { title: "قسم «المجموعة المختارة»", fields: [showT("sections.collection.show"), SH("sections.collection.eyebrow", "السطر الصغير"), SH("sections.collection.title", "العنوان"), SH("sections.collection.text", "الوصف"), SH("sections.collection.count", "عدد المنتجات المعروضة", { t: "number" })] },
        { title: "الشريط الأخضر المتحرك", fields: [showT("sections.band.show"), SH("sections.band.items", "الكلمات", { t: "strings", add: "إضافة كلمة" })] },
        { title: "قسم «عن المعرض»", fields: [showT("sections.about.show"), SH("sections.about.image", "الصورة (داخل القوس)", { t: "image", folder: "about" }), SH("sections.about.eyebrow", "السطر الصغير"), SH("sections.about.title", "العنوان"), SH("sections.about.text", "النص", { t: "textarea" })] },
        { title: "آراء الزبائن", fields: [showT("sections.testimonials.show"), SH("sections.testimonials.title", "العنوان"), SH("sections.testimonials.items", "الآراء", { t: "list", add: "إضافة رأي", hint: "لا يظهر القسم إلا بعد إضافة رأي واحد على الأقل.", fields: [{ k: "name", l: "الاسم" }, { k: "city", l: "المدينة" }, { k: "text", l: "الرأي", t: "textarea" }] })] },
        { title: "قسم «زورونا» ونموذج المراسلة", fields: [showT("sections.visit.show"), SH("sections.visit.title", "العنوان"), SH("sections.visit.form_title", "عنوان النموذج"), SH("sections.visit.form_text", "وصف النموذج")] }
      ]
    },
    identity: {
      title: "الهوية والألوان والافتتاحية", sub: "الاسم، الشعار، فيديو الافتتاحية، ألوان الموقع بالكامل",
      groups: [
        { title: "الاسم والشعار", fields: [SH("brand.name", "الاسم المختصر (في الشريط العلوي)"), SH("brand.full", "الاسم الكامل"), SH("brand.tagline", "الشعار النصي"), SH("brand.logo", "الشعار (يفضّل PNG بخلفية شفافة)", { t: "image", folder: "brand", logo: true }), SH("brand.favicon", "أيقونة المتصفح (اختياري — مربعة)", { t: "image", folder: "brand", logo: true })] },
        { title: "الافتتاحية (عند فتح الموقع)", fields: [
          SH("intro.enabled", "تشغيل الافتتاحية", { t: "toggle" }),
          SH("intro.video", "فيديو ظهور الشعار", { t: "video", folder: "intro", hint: "MP4 بحجم أقل من ٥٠ ميغابايت. يُشغَّل صامتاً ثم ينتقل للموقع. بدون فيديو تظهر حركة رسم القوس والاسم." }),
          SH("intro.subtitle", "السطر تحت الاسم (في الحركة بدون فيديو)"), SH("intro.max_seconds", "أقصى مدة بالثواني", { t: "number" }), SH("intro.every_visit", "إظهارها في كل زيارة (وليس مرة واحدة لكل جلسة)", { t: "toggle" })
        ] },
        { title: "ألوان الموقع", fields: [{ p: "theme", t: "colors" }, SH("theme.floral", "أضواء الأورورا واللمعات المتحركة في الخلفية", { t: "toggle" })] },
        { title: "التذييل أسفل الموقع", fields: [SH("footer.text", "النص التعريفي", { t: "textarea" }), SH("footer.copyright", "سطر الحقوق")] },
        { title: "الظهور في Google وعند مشاركة الرابط", fields: [SH("seo.title", "عنوان الموقع"), SH("seo.description", "الوصف", { t: "textarea" })] }
      ]
    },
    contact: {
      title: "التواصل والمتجر", sub: "أرقام التواصل، الحسابات، التوصيل والدفع",
      groups: [
        { title: "معلومات التواصل", fields: [SH("contact.whatsapp", "رقم واتساب", { dir: "ltr", hint: "مثال: 07701234567 — تصلك عليه تفاصيل الطلبات ويظهر زر واتساب في الموقع." }), SH("contact.phone", "رقم الهاتف", { dir: "ltr" }), SH("contact.address", "العنوان"), SH("contact.hours", "أوقات الدوام", { hint: "مثال: يومياً من ١٠ صباحاً إلى ١١ ليلاً" }), SH("contact.map_url", "رابط الموقع على خرائط Google", { dir: "ltr" }), SH("contact.email", "البريد الإلكتروني", { dir: "ltr" })] },
        { title: "حسابات التواصل الاجتماعي", fields: [SH("contact.instagram", "انستغرام (الرابط كاملاً)", { dir: "ltr" }), SH("contact.facebook", "فيسبوك", { dir: "ltr" }), SH("contact.tiktok", "تيك توك", { dir: "ltr" }), SH("contact.telegram", "تيليغرام", { dir: "ltr" }), SH("contact.snapchat", "سناب شات", { dir: "ltr" })] },
        { title: "المتجر والتوصيل والدفع", fields: [SH("shop.currency", "العملة"), SH("shop.delivery_fee", "أجرة التوصيل", { t: "number" }), SH("shop.free_delivery_over", "توصيل مجاني للطلبات فوق (٠ = لا يوجد)", { t: "number" }), SH("shop.payment_note", "ملاحظة الدفع"), SH("shop.whatsapp_orders", "بعد الطلب، اعرض زر «أرسل الطلب على واتساب» للزبون", { t: "toggle" }), SH("shop.cities", "المحافظات في نموذج الطلب", { t: "strings", add: "إضافة محافظة" })] }
      ]
    }
  };
  const COLOR_LABELS = { deep: ["لون الخلفية", ""], emerald: ["لون التوهّج (الزمرّدي)", ""], accent: ["اللون الذهبي", ""], paper: ["لون البطاقات الزجاجية", ""], pearl: ["الخلفية الثانية", ""], silver: ["الفضّي", ""], ink: ["لون النص", ""] };

  function fieldHTML(f, d) {
    const v = getPath(d, f.p);
    const id = "f_" + f.p.replace(/\./g, "_");
    const hint = f.hint ? `<span class="hint">${f.hint}</span>` : "";
    switch (f.t) {
      case "toggle": return `<div class="field">${toggleHTML(`data-p="${f.p}" data-type="bool"`, v !== false, f.l)}${hint}</div>`;
      case "textarea": return `<div class="field"><label for="${id}">${f.l}</label><textarea id="${id}" data-p="${f.p}">${esc(v)}</textarea>${hint}</div>`;
      case "number": return `<div class="field"><label for="${id}">${f.l}</label><input type="text" inputmode="decimal" id="${id}" data-p="${f.p}" data-type="num" value="${esc(v)}" dir="ltr">${hint}</div>`;
      case "image": case "video": {
        const vid = f.t === "video";
        return `<div class="field" data-fp="${f.p}"><span class="lbl">${f.l}</span><div class="media-field">
          <div class="media-prev ${f.logo ? "logo" : ""}">${v ? (vid ? `<video src="${esc(v)}" muted playsinline loop autoplay></video>` : `<img src="${esc(v)}" alt="">`) : vid ? "لا يوجد فيديو" : "لا توجد صورة"}</div>
          <label class="btn light up-btn">${vid ? I.video : I.img} ${v ? "تغيير" : "رفع"}<input type="file" accept="${vid ? "video/*" : "image/*"}" data-up="${f.p}" data-folder="${f.folder || "media"}"></label>
          ${v ? `<button class="btn danger" type="button" data-clear="${f.p}">إزالة</button>` : ""}</div>${hint}</div>`;
      }
      case "product": return `<div class="field"><label for="${id}">${f.l}</label><select id="${id}" data-p="${f.p}"><option value="">تلقائي</option>${state.prods.map((p) => `<option value="${p.id}" ${v === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>${hint}</div>`;
      case "strings": {
        const arr = Array.isArray(v) ? v : [];
        return `<div class="field" data-fp="${f.p}"><span class="lbl">${f.l}</span>${hint}<div>${arr.map((x, i) => `<div class="str-row"><input class="input" type="text" data-p="${f.p}.${i}" value="${esc(x)}" aria-label="${f.l} ${i + 1}">
          <button class="icon" type="button" data-move="${f.p}" data-i="${i}" data-d="-1" aria-label="تحريك للأعلى">${I.up}</button><button class="icon danger" type="button" data-del="${f.p}" data-i="${i}" aria-label="حذف">${I.trash}</button></div>`).join("")}</div>
          <button class="btn ghost sm" type="button" data-addstr="${f.p}">${I.plus} ${f.add || "إضافة"}</button></div>`;
      }
      case "list": {
        const arr = Array.isArray(v) ? v : [];
        return `<div class="field" data-fp="${f.p}"><span class="lbl">${f.l}</span>${hint}<div class="rep">${arr.map((item, i) => `<div class="rep-item"><div class="rep-ctl">
            <button class="icon" type="button" data-move="${f.p}" data-i="${i}" data-d="-1" aria-label="تحريك للأعلى">${I.up}</button><button class="icon" type="button" data-move="${f.p}" data-i="${i}" data-d="1" aria-label="تحريك للأسفل">${I.down}</button><button class="icon danger" type="button" data-del="${f.p}" data-i="${i}" aria-label="حذف">${I.trash}</button></div>
            ${f.fields.map((sf) => fieldHTML({ ...sf, p: `${f.p}.${i}.${sf.k}` }, d)).join("")}</div>`).join("")}</div>
          <button class="btn ghost sm" type="button" data-additem="${f.p}" style="margin-top:8px">${I.plus} ${f.add || "إضافة"}</button></div>`;
      }
      case "colors": {
        const t = getPath(d, "theme") || {};
        return `<div data-fp="theme-colors"><div class="colors">${Object.keys(COLOR_LABELS).map((k) => `<label class="color"><input type="color" data-p="theme.${k}" value="${esc(t[k] || DEF.theme[k])}" aria-label="${COLOR_LABELS[k][0]}"><div><b>${COLOR_LABELS[k][0]}</b><input type="text" data-p="theme.${k}" value="${esc(t[k] || DEF.theme[k])}" aria-label="رمز ${COLOR_LABELS[k][0]}"></div></label>`).join("")}</div>
          <div class="preview-strip" aria-hidden="true">${["deep", "pearl", "paper", "emerald", "accent", "silver"].map((k) => `<div style="background:${esc(t[k] || DEF.theme[k])}"></div>`).join("")}</div>
          <button class="btn ghost sm" type="button" id="resetColors" style="margin-top:12px">${I.refresh} استعادة الألوان الأصلية</button></div>`;
      }
      default: return `<div class="field"><label for="${id}">${f.l}</label><input type="text" id="${id}" data-p="${f.p}" value="${esc(v)}" ${f.dir ? `dir="${f.dir}"` : ""}>${hint}</div>`;
    }
  }
  function findField(groups, p) {
    for (const g of groups) for (const f of g.fields) if (f.p === p) return f;
    return null;
  }
  function pageSettings(key) {
    const sc = SCHEMA[key];
    state.draft = clone(state.s);
    const d = state.draft;
    page().innerHTML = `<div class="page-title"><div><h1>${sc.title}</h1><p>${sc.sub}</p></div><a class="btn light" href="${SITE}" target="_blank" rel="noopener">${I.eye} معاينة الموقع</a></div>
      <div class="notice info">بعد أي تعديل اضغط «حفظ ونشر» في الأسفل — يظهر التغيير في الموقع فوراً.</div>
      ${sc.groups.map((g, gi) => `<section class="card collapsible ${gi < 2 ? "open" : ""}"><h2 tabindex="0" role="button">${g.title}</h2><div class="body">${g.fields.map((f) => fieldHTML(f, d)).join("")}</div></section>`).join("")}`;
    const pg = page();
    const redraw = (p) => {
      const f = findField(sc.groups, p) || findSub(sc.groups, p);
      const box = pg.querySelector(`[data-fp="${CSS.escape(p)}"]`);
      if (f && box) box.outerHTML = fieldHTML(f, d);
    };
    const dirty = () => { state.dirty = true; showSave(true); };
    pg.addEventListener("click", (e) => {
      const h = e.target.closest(".collapsible > h2"); if (h) { h.parentElement.classList.toggle("open"); return; }
      const t = e.target.closest("[data-addstr],[data-additem],[data-del],[data-move],[data-clear],#resetColors");
      if (!t) return;
      if (t.id === "resetColors") { d.theme = { ...clone(DEF.theme), floral: d.theme.floral }; pg.querySelector('[data-fp="theme-colors"]').outerHTML = fieldHTML({ p: "theme", t: "colors" }, d); dirty(); return; }
      if (t.dataset.clear) { setPath(d, t.dataset.clear, ""); redraw(t.dataset.clear); dirty(); return; }
      const p = t.dataset.addstr || t.dataset.additem || t.dataset.del || t.dataset.move;
      const arr = Array.isArray(getPath(d, p)) ? getPath(d, p) : [];
      if (t.dataset.addstr) arr.push("");
      if (t.dataset.additem) { const f = findField(sc.groups, p); arr.push(Object.fromEntries(f.fields.map((sf) => [sf.k, ""]))); }
      if (t.dataset.del) arr.splice(+t.dataset.i, 1);
      if (t.dataset.move) { const i = +t.dataset.i, j = i + +t.dataset.d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; }
      setPath(d, p, arr); redraw(p); dirty();
      if (t.dataset.addstr || t.dataset.additem) {
        const box = pg.querySelector(`[data-fp="${CSS.escape(p)}"]`);
        const last = box && (t.dataset.additem ? $$(".rep-item", box).pop() : $$(".str-row", box).pop());
        const inp = last && $("input[type=text], textarea", last); if (inp) inp.focus();
      }
    });
    pg.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches(".collapsible > h2")) e.target.parentElement.classList.toggle("open"); });
    const onInput = (e) => {
      const el = e.target; const p = el.dataset.p; if (!p) return;
      let v = el.type === "checkbox" ? el.checked : el.value;
      if (el.dataset.type === "num") { const n = parseFloat(toLatin(v).replace(/[^\d.]/g, "")); v = isNaN(n) ? 0 : n; }
      setPath(d, p, v); dirty();
      if (/^theme\./.test(p) && el.type !== "checkbox") {
        $$(`[data-p="${p}"]`, pg).forEach((x) => { if (x !== el && (/^#[0-9a-f]{6}$/i.test(v) || x.type !== "color")) x.value = v; });
        const strip = pg.querySelector(".preview-strip"); if (strip) strip.innerHTML = ["deep", "pearl", "paper", "emerald", "accent", "silver"].map((k) => `<div style="background:${esc(d.theme[k])}"></div>`).join("");
      }
    };
    pg.addEventListener("input", onInput);
    pg.addEventListener("change", async (e) => {
      const el = e.target;
      if (el.type === "checkbox" || el.tagName === "SELECT") onInput(e);
      if (!el.dataset.up) return;
      const file = el.files[0]; if (!file) return;
      const p = el.dataset.up, box = el.closest("[data-fp]"), prev = $(".media-prev", box);
      prev.innerHTML = `<div class="spin"></div>`;
      try { const url = await upload(file, el.dataset.folder); setPath(d, p, url); dirty(); toast("تم الرفع — اضغط «حفظ ونشر» لتطبيقه"); }
      catch (err) { toast(errMsg(err), true); }
      redraw(p);
    });
  }
  function findSub(groups, p) {
    // nested list item fields, e.g. hero.slides.0.image
    const m = p.match(/^(.*)\.(\d+)\.([^.]+)$/); if (!m) return null;
    const parent = findField(groups, m[1]); if (!parent || !parent.fields) return null;
    const sf = parent.fields.find((x) => x.k === m[3]); return sf ? { ...sf, p } : null;
  }
  function showSave(on) { const b = $("#savebar"); if (b) b.classList.toggle("show", on); }
  async function saveSettings() {
    const btn = $("#saveBtn"); btn.disabled = true;
    const data = state.draft || state.s;
    try {
      await q(db.from("settings").upsert({ id: 1, data }));
      state.s = window.rqMerge(DEF, data); state.raw = data; state.dirty = false; showSave(false);
      toast("تم الحفظ ✓ التغييرات ظاهرة في الموقع الآن");
      const b = $(".side .brand b"); if (b) b.textContent = state.s.brand.name;
    } catch (err) { toast(errMsg(err), true); }
    btn.disabled = false;
  }

  /* =======================================================================
     ACCOUNT
     ======================================================================= */
  function pageAccount() {
    page().innerHTML = `<div class="page-title"><div><h1>حسابي</h1><p>${esc(state.user.email)}</p></div></div>
      <form class="card" id="pwForm" novalidate style="max-width:520px"><h2>تغيير كلمة المرور</h2>
        <div class="field"><label for="pw1">كلمة المرور الجديدة</label><input type="password" id="pw1" dir="ltr" autocomplete="new-password" minlength="8"><span class="hint">٨ أحرف على الأقل — اجمع بين حروف وأرقام.</span></div>
        <div class="field"><label for="pw2">أعد كتابتها</label><input type="password" id="pw2" dir="ltr" autocomplete="new-password"></div>
        <button class="btn" type="submit">حفظ كلمة المرور</button></form>
      <div class="card" style="max-width:520px"><h2>الجلسة</h2><button class="btn danger" type="button" id="out2">${I.logout} تسجيل الخروج</button></div>`;
    $("#pwForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const a = $("#pw1").value, b = $("#pw2").value;
      if (a.length < 8) { toast("كلمة المرور قصيرة — ٨ أحرف على الأقل", true); return; }
      if (a !== b) { toast("كلمتا المرور غير متطابقتين", true); return; }
      const { error } = await db.auth.updateUser({ password: a });
      if (error) { toast(errMsg(error), true); return; }
      e.target.reset(); toast("تم تغيير كلمة المرور");
    });
    $("#out2").onclick = () => $("#logout").click();
  }

  /* =======================================================================
     BOOT
     ======================================================================= */
  let poll;
  async function checkNew() {
    try {
      const [o, m] = await Promise.all([
        db.from("orders").select("*").order("created_at", { ascending: false }).limit(500),
        db.from("inquiries").select("*").order("created_at", { ascending: false }).limit(500)
      ]);
      if (o.error || m.error) return;
      const before = state.counts.orders, beforeM = state.counts.inq;
      state.orders = o.data; state.inq = m.data; updatePills();
      if (state.counts.orders > before) { toast("وصل طلب جديد!"); refreshOrderViews(); }
      else if (state.counts.inq > beforeM) { toast("وصلت رسالة جديدة"); if (state.page === "inquiries") pageInquiries(); }
    } catch (e) { /* offline: try again next time */ }
  }
  async function start() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) { renderLogin(); return; }
    state.user = session.user;
    const { data: ok, error } = await db.rpc("am_i_admin");
    if (error || !ok) { await db.auth.signOut(); renderLogin("هذا الحساب لا يملك صلاحية إدارة الموقع."); return; }
    root.innerHTML = `<div class="loading"><div class="spin"></div></div>`;
    try { await loadAll(); } catch (e) { root.innerHTML = `<div class="loading"><div class="empty">تعذّر تحميل البيانات: ${esc(errMsg(e))}<br><br><button class="btn" onclick="location.reload()">إعادة المحاولة</button></div></div>`; return; }
    renderShell();
    route(true);
    clearInterval(poll); poll = setInterval(checkNew, 45000);
  }
  db.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") { clearInterval(poll); } });
  start();
})();
