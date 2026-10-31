/* Shared drawings: UI icons, department icons, product placeholder art, floral background. */
(function () {
  const S = (d, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

  const ui = {
    cart: S('<path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>'),
    search: S('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
    menu: S('<path d="M4 7h16M4 12h16M4 17h10"/>'),
    close: S('<path d="M6 6l12 12M18 6 6 18"/>'),
    plus: S('<path d="M12 5v14M5 12h14"/>'),
    minus: S('<path d="M5 12h14"/>'),
    check: S('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
    arrowL: S('<path d="M15 6l-6 6 6 6"/>'),
    arrowR: S('<path d="M9 6l6 6-6 6"/>'),
    arrow: S('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    phone: S('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
    pin: S('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
    clock: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    mail: S('<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>'),
    truck: S('<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'),
    shield: S('<path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/>'),
    gift: S('<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M3 9h18M12 9v11M12 9C10 5 7 6 8 8.5 9 9 12 9 12 9zm0 0c2-4 5-3 4-.5C15 9 12 9 12 9z"/>'),
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>',
    instagram: S('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".8" fill="currentColor"/>'),
    facebook: S('<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v7h4v-7h3l1-4h-4V8.5c0-.3.2-.5.5-.5z"/>'),
    tiktok: S('<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.8 2.3 4.5 5 4.8"/>'),
    telegram: S('<path d="m21 4-18 7 6 2 2 6 3-4 5 4z"/><path d="m9 13 9-7"/>'),
    snapchat: S('<path d="M12 3c3 0 5 2.2 5 5v2.5l2 .8-1.8 1.4c.6 1.6 1.8 2.6 3.3 3-1 .9-2.4.8-3 1.3-.3.6-.2 1.5-1 1.5-.9 0-1.7-.6-3.2-.1-.8.3-1.3 1.1-1.3 1.1s-.5-.8-1.3-1.1c-1.5-.5-2.3.1-3.2.1-.8 0-.7-.9-1-1.5-.6-.5-2-.4-3-1.3 1.5-.4 2.7-1.4 3.3-3L4 11.3l2-.8V8c0-2.8 2-5 6-5z"/>'),
    map: S('<path d="m9 4-6 2.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>'),
    sun: S('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>'),
    moon: S('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>')
  };

  const L = (d) => `<g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${d}</g>`;
  const dep = {
    men: L('<ellipse cx="100" cy="128" rx="50" ry="44"/><rect x="72" y="46" width="56" height="38" rx="10"/><path d="M84 58h32"/>'),
    women: L('<ellipse cx="100" cy="128" rx="46" ry="40"/><path d="M100 40l18 26-18 22-18-22z"/><path d="M82 66h36"/>'),
    jewel: L('<path d="M40 50Q100 140 160 50"/><path d="M100 95v30"/><path d="M100 125l14 20-14 20-14-20z"/>'),
    stone: L('<path d="M60 70h80l22 26-62 70-62-70z"/><path d="M38 96h124M80 70l20 96 20-96"/>'),
    misbaha: `<g fill="currentColor">${Array.from({ length: 21 }, (_, k) => { const a = k / 21 * Math.PI * 2 - Math.PI / 2; return `<circle cx="${(100 + 52 * Math.cos(a)).toFixed(1)}" cy="${(86 + 46 * Math.sin(a)).toFixed(1)}" r="6"/>`; }).join("")}<rect x="95" y="132" width="10" height="22" rx="4"/><path d="M100 154v30" stroke="currentColor" stroke-width="4"/></g>`,
    watch: L('<rect x="80" y="20" width="40" height="160" rx="10"/><circle cx="100" cy="100" r="46" fill="var(--paper,#fff)"/><path d="M100 100V74M100 100l18 8"/>'),
    perfume: L('<rect x="86" y="30" width="28" height="22" rx="4"/><path d="M68 66Q100 50 132 66l8 100q-40 18-80 0z"/><path d="M78 110h44"/>'),
    rug: L('<rect x="52" y="24" width="96" height="152" rx="4"/><path d="M68 164V84q32-46 64 0v80"/><path d="M52 24v-6M70 24v-6M88 24v-6M106 24v-6M124 24v-6M148 24v-6M52 176v6M70 176v6M88 176v6M106 176v6M124 176v6M148 176v6"/>'),
    gift: L('<rect x="50" y="86" width="100" height="80"/><rect x="42" y="66" width="116" height="22"/><path d="M100 66v100M100 66C72 34 62 62 100 66c38-4 28-32 0 0"/>'),
    lantern: L('<path d="M100 20v14"/><path d="M84 34h32l-4 14H88z"/><path d="M80 48h40q14 30 0 92H80q-14-62 0-92z"/><path d="M100 48v92M86 140l-6 16h40l-6-16"/><path d="M92 156v14h16v-14"/><circle cx="100" cy="94" r="10"/>'),
    star: L('<path d="M100 30l18 44 44 18-44 18-18 44-18-44-44-18 44-18z"/><rect x="62" y="62" width="76" height="76" transform="rotate(45 100 100)"/>'),
    bag: L('<path d="M50 70h100l-8 100H58z"/><path d="M78 70V58a22 22 0 0 1 44 0v12"/>')
  };
  const depNames = { men: "خاتم رجالي", women: "خاتم نسائي", jewel: "قلادة", stone: "حجر", misbaha: "مسبحة", watch: "ساعة", perfume: "عطر", rug: "سجادة", gift: "هدية", lantern: "فانوس", star: "نجمة", bag: "حقيبة" };

  let uid = 0;
  const metal = '<stop offset="0" stop-color="#6b7577"/><stop offset=".25" stop-color="#f4f7f6"/><stop offset=".45" stop-color="#909b9c"/><stop offset=".6" stop-color="#ffffff"/><stop offset=".8" stop-color="#7b8687"/><stop offset="1" stop-color="#dfe6e4"/>';
  const stones = {
    aqeeq: ["#ff7f8e", "#9b2335", "#3a0910"], feroza: ["#c4fff4", "#29b2a5", "#0a4a45"], najaf: ["#ffffff", "#d4dde4", "#808b94"],
    sharaf: ["#fff4b8", "#dfa63a", "#563806"], yasr: ["#6d6d6d", "#202020", "#000000"], emerald: ["#a8f0c6", "#1f8a55", "#0b3d24"]
  };
  function ring(s) {
    const i = ++uid, c = stones[s] || stones.feroza;
    return `<svg viewBox="0 0 200 200" aria-hidden="true"><defs><linearGradient id="m${i}" x1="0" x2="1" y1="0" y2="1">${metal}</linearGradient><radialGradient id="s${i}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${c[0]}"/><stop offset=".5" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></radialGradient></defs><ellipse cx="100" cy="125" rx="58" ry="50" fill="none" stroke="url(#m${i})" stroke-width="13"/><path d="M62 82Q100 58 138 82l-10 16q-28-12-56 0z" fill="url(#m${i})"/><ellipse cx="100" cy="66" rx="34" ry="27" fill="url(#m${i})"/><ellipse cx="100" cy="64" rx="27" ry="21" fill="url(#s${i})"/><ellipse cx="90" cy="56" rx="9" ry="5" fill="#fff" opacity=".55"/></svg>`;
  }
  function misbaha(col) {
    const i = ++uid; let b = "";
    for (let k = 0; k < 33; k++) { const a = k / 33 * Math.PI * 2 - Math.PI / 2; b += `<circle cx="${(100 + 60 * Math.cos(a)).toFixed(1)}" cy="${(90 + 50 * Math.sin(a)).toFixed(1)}" r="7" fill="url(#b${i})"/>`; }
    return `<svg viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="b${i}" cx=".35" cy=".3"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset=".3" stop-color="${col}"/><stop offset="1" stop-color="#111"/></radialGradient><linearGradient id="m${i}">${metal}</linearGradient></defs>${b}<rect x="94" y="136" width="12" height="26" rx="5" fill="url(#m${i})"/><path d="M100 162l-10 26M100 162l10 26M100 162v28" stroke="url(#m${i})" stroke-width="2.5"/></svg>`;
  }
  function stoneKey(t) {
    t = t || "";
    if (/فيروز/.test(t)) return "feroza";
    if (/عقيق/.test(t)) return "aqeeq";
    if (/دُ?ّ?ر|نجف|لؤلؤ/.test(t)) return "najaf";
    if (/شذر|ذهب|أصفر/.test(t)) return "sharaf";
    if (/يُ?سر|أسود|اسود/.test(t)) return "yasr";
    if (/زمرد|زبرجد|أخضر/.test(t)) return "emerald";
    return "";
  }
  /* art for a product without photos */
  function productArt(p, icon) {
    const text = `${p.name || ""} ${p.stone || ""}`;
    const sk = stoneKey(text);
    if (icon === "misbaha" || /مسبح/.test(p.name || "")) {
      const c = { aqeeq: "#9b2335", feroza: "#29b2a5", yasr: "#2a2a2a", sharaf: "#c98a1e", najaf: "#c9d2d8", emerald: "#1f8a55" }[sk] || "#7a4a2a";
      return misbaha(c);
    }
    if (icon === "men" || icon === "women" || /خاتم/.test(p.name || "")) return ring(sk || (icon === "women" ? "najaf" : "feroza"));
    return `<svg viewBox="0 0 200 200" aria-hidden="true" style="color:var(--emerald)">${dep[icon] || dep.star}</svg>`;
  }
  function depIcon(key) { return `<svg viewBox="0 0 200 200" aria-hidden="true">${dep[key] || dep.star}</svg>`; }

  /* soft white + green floral tile for the page background */
  function floral(green) {
    const g = green || "#0d4a3a";
    const petal = (cx, cy, r, n, rot = 0) => Array.from({ length: n }, (_, k) => `<ellipse cx="${cx}" cy="${cy - r}" rx="${(r * 0.42).toFixed(1)}" ry="${r}" transform="rotate(${rot + k * 360 / n} ${cx} ${cy})"/>`).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
<g fill="#ffffff" fill-opacity=".5" stroke="${g}" stroke-opacity=".075" stroke-width="1">${petal(90, 90, 15, 8)}<circle cx="90" cy="90" r="5"/>${petal(0, 0, 9, 6, 30)}${petal(180, 0, 9, 6, 30)}${petal(0, 180, 9, 6, 30)}${petal(180, 180, 9, 6, 30)}</g>
<g fill="none" stroke="${g}" stroke-opacity=".07" stroke-width="1"><path d="M90 60C80 40 60 34 40 38M90 120c10 20 30 26 50 22M60 90C40 100 34 120 38 140M120 90c20-10 26-30 22-50"/></g>
<g fill="${g}" fill-opacity=".05"><path d="M40 38c6-8 16-8 20 0-6 6-14 6-20 0zM140 142c-6 8-16 8-20 0 6-6 14-6 20 0zM38 140c-8-6-8-16 0-20 6 6 6 14 0 20zM142 40c8 6 8 16 0 20-6-6-6-14 0-20z"/></g>
<g fill="${g}" fill-opacity=".08"><circle cx="0" cy="0" r="2.5"/><circle cx="180" cy="0" r="2.5"/><circle cx="0" cy="180" r="2.5"/><circle cx="180" cy="180" r="2.5"/></g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  /* large corner ornament (arabesque flower) used in the hero */
  const ornament = `<svg viewBox="0 0 200 200" aria-hidden="true" fill="none" stroke="currentColor" stroke-opacity=".14" stroke-width=".8">${Array.from({ length: 12 }, (_, k) => `<ellipse cx="100" cy="58" rx="16" ry="42" transform="rotate(${k * 30} 100 100)"/>`).join("")}${Array.from({ length: 8 }, (_, k) => `<ellipse cx="100" cy="76" rx="8" ry="24" transform="rotate(${k * 45 + 22.5} 100 100)"/>`).join("")}<circle cx="100" cy="100" r="96"/><circle cx="100" cy="100" r="12"/></svg>`;

  /* white jasmine (ياسمين): drawn, never animated — veined petals, gold stamens,
     blush buds on slender calyces, glossy pinnate leaves on a curved stem */
  let jid = 0;
  const f1 = (n) => +n.toFixed(1);
  function jasmine(kind = "sprig") {
    const i = ++jid, P = `j${i}`;
    const defs = `<defs>
      <radialGradient id="${P}p" cx=".5" cy="1" r="1.05"><stop offset="0" stop-color="#f1e7c6"/><stop offset=".28" stop-color="#fbf8ee"/><stop offset=".7" stop-color="#ffffff"/><stop offset="1" stop-color="#f6f6f1"/></radialGradient>
      <linearGradient id="${P}s" x1="0" x2="1"><stop offset="0" stop-color="#b9ae8a" stop-opacity=".22"/><stop offset=".55" stop-color="#b9ae8a" stop-opacity="0"/></linearGradient>
      <radialGradient id="${P}c" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#f3df8a"/><stop offset=".6" stop-color="#d8b94e"/><stop offset="1" stop-color="#a98a2c"/></radialGradient>
      <linearGradient id="${P}b" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fffdf7"/><stop offset=".55" stop-color="#fbf1f0"/><stop offset="1" stop-color="#e9b9c2"/></linearGradient>
      <linearGradient id="${P}l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1c5638"/><stop offset=".55" stop-color="#2f7a51"/><stop offset="1" stop-color="#4f9a6c"/></linearGradient>
      <linearGradient id="${P}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".35"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
      <linearGradient id="${P}t" x1="0" x2="1"><stop offset="0" stop-color="#2c6a47"/><stop offset=".5" stop-color="#4b8a5f"/><stop offset="1" stop-color="#2c6a47"/></linearGradient>
    </defs>`;
    // one petal: pointed, slightly twisted oval with a soft fold shadow and a fine vein
    const petal = (r, k) => {
      const w = r * 0.42;
      const d = `M0 0C${f1(w * .95)} ${f1(-r * .16)} ${f1(w * 1.08)} ${f1(-r * .74)} 0 ${f1(-r)}C${f1(-w * .78)} ${f1(-r * .8)} ${f1(-w * .9)} ${f1(-r * .2)} 0 0Z`;
      return `<g transform="rotate(${k * 72})"><path d="${d}" fill="url(#${P}p)" stroke="#e3dccb" stroke-width=".55"/><path d="${d}" fill="url(#${P}s)"/>
        <path d="M0 ${f1(-r * .1)}Q${f1(w * .1)} ${f1(-r * .52)} ${f1(-w * .04)} ${f1(-r * .9)}" fill="none" stroke="#e2dcc6" stroke-width=".55" stroke-linecap="round"/></g>`;
    };
    // open flower; tilt < 1 squashes it into a three-quarter view
    const flower = (x, y, r, rot = 0, tilt = 1) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(1 ${tilt})">
        ${Array.from({ length: 5 }, (_, k) => `<path transform="rotate(${k * 72 + 36})" d="M0 0L${f1(r * .05)} ${f1(-r * .5)}L0 ${f1(-r * .62)}L${f1(-r * .05)} ${f1(-r * .5)}Z" fill="#3d7f57" opacity=".85"/>`).join("")}
        ${Array.from({ length: 5 }, (_, k) => petal(r, k)).join("")}
        <circle r="${f1(r * .16)}" fill="#efe3b4"/><circle r="${f1(r * .1)}" fill="url(#${P}c)"/>
        <ellipse cx="${f1(r * .05)}" cy="${f1(-r * .06)}" rx="${f1(r * .035)}" ry="${f1(r * .07)}" fill="#b8902e"/><ellipse cx="${f1(-r * .055)}" cy="${f1(r * .02)}" rx="${f1(r * .035)}" ry="${f1(r * .07)}" fill="#b8902e" transform="rotate(30)"/></g>`;
    // closed bud on a thin calyx
    const bud = (x, y, rot, sc = 1) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sc})">
        <path d="M0 6C-.6 2 -.6 -2 0 -5" stroke="#3d7f57" stroke-width="1.4" fill="none"/>
        <path d="M0 -4C5.4 -10 5.6 -24 0 -33C-5.6 -24 -5.4 -10 0 -4Z" fill="url(#${P}b)" stroke="#e6cdd1" stroke-width=".6"/>
        <path d="M0 -6C1.6 -14 1.6 -24 0 -31" stroke="#f3dfe2" stroke-width=".8" fill="none"/>
        <path d="M0 -3L-4 -9M0 -3L4 -9M0 -3L-2 -10M0 -3L2 -10" stroke="#3d7f57" stroke-width=".7" stroke-linecap="round"/></g>`;
    // flower seen from the side: long blush tube, petals foreshortened on top
    const profile = (x, y, rot, sc = 1) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sc})">
        <path d="M-1.5 0C-1.2 -7 -1.3 -14 -.9 -20H.9C1.3 -14 1.2 -7 1.5 0Z" fill="url(#${P}b)" stroke="#e6cdd1" stroke-width=".5"/>
        <path d="M0 2L-3 -4M0 2L3 -4" stroke="#3d7f57" stroke-width=".7" stroke-linecap="round"/>
        ${flower(0, -21, 13, 0, .34)}</g>`;
    // glossy lance leaflet with veins
    const leaflet = (x, y, rot, len = 30) => {
      const w = len * .26;
      return `<g transform="translate(${x} ${y}) rotate(${rot})">
        <path d="M0 0C${f1(len * .25)} ${f1(-w)} ${f1(len * .7)} ${f1(-w * .9)} ${len} 0C${f1(len * .7)} ${f1(w * .9)} ${f1(len * .25)} ${f1(w)} 0 0Z" fill="url(#${P}l)"/>
        <path d="M${f1(len * .08)} ${f1(-w * .2)}C${f1(len * .35)} ${f1(-w * .8)} ${f1(len * .7)} ${f1(-w * .7)} ${f1(len * .92)} ${f1(-w * .1)}" fill="none" stroke="url(#${P}h)" stroke-width="${f1(w * .5)}" stroke-linecap="round" opacity=".6"/>
        <path d="M1 0L${len - 1} 0" stroke="#a8d7b6" stroke-width=".6" opacity=".75"/>
        ${[.25, .45, .65].map((t) => `<path d="M${f1(len * t)} 0L${f1(len * (t + .12))} ${f1(-w * .62)}M${f1(len * t)} 0L${f1(len * (t + .12))} ${f1(w * .62)}" stroke="#8fc6a2" stroke-width=".4" opacity=".55"/>`).join("")}</g>`;
    };
    // compound leaf: pairs of leaflets along a rachis plus a terminal one
    const leaf = (x, y, rot, sc = 1) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sc})">
        <path d="M0 0C14 -1 30 -3 46 -2" stroke="#3d7f57" stroke-width="1" fill="none"/>
        ${leaflet(12, -.6, -58, 20)}${leaflet(12, -.6, 58, 20)}${leaflet(27, -1.8, -50, 23)}${leaflet(27, -1.8, 50, 23)}${leaflet(46, -2, -4, 30)}</g>`;

    if (kind === "flower") {
      return `<svg viewBox="-34 -34 68 68" aria-hidden="true">${defs}${leaflet(-4, 8, 150, 26)}${leaflet(4, 8, 30, 26)}${flower(0, 0, 25, 14)}</svg>`;
    }
    return `<svg viewBox="-20 -20 290 270" aria-hidden="true">${defs}
      <path d="M8 226C46 196 78 168 104 140S150 84 184 58 226 24 246 10" fill="none" stroke="url(#${P}t)" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M8 226C46 196 78 168 104 140S150 84 184 58 226 24 246 10" fill="none" stroke="#e3bd72" stroke-width=".55" stroke-linecap="round" opacity=".7"/>
      <path d="M104 140C94 122 82 110 68 102M184 58C176 44 166 36 154 32M150 94C164 86 180 84 196 86M50 190C40 178 34 168 32 156" fill="none" stroke="url(#${P}t)" stroke-width="1.5" stroke-linecap="round"/>
      ${leaf(20, 214, 200, .85)}${leaf(42, 196, -34, 1.1)}${leaf(80, 166, 206, 1)}${leaf(128, 118, -72, .9)}${leaf(150, 94, 12, .85)}${leaf(196, 48, 168, .78)}${leaf(222, 28, -40, .6)}
      ${bud(32, 156, -20, .7)}${bud(68, 102, -46, .85)}${bud(154, 32, -70, .75)}${bud(196, 86, 100, .7)}${bud(246, 10, 64, .72)}${bud(232, 34, 96, .62)}
      ${profile(128, 112, 22, .85)}
      ${flower(58, 182, 16, 30, .95)}${flower(86, 120, 16, 10, .72)}${flower(110, 136, 23, -18, .86)}
      ${flower(160, 42, 17, -20, .72)}${flower(214, 38, 20, 30, .8)}${flower(182, 62, 28, 8, .94)}</svg>`;
  }

  window.RQ_ART = { ui, dep, depNames, depIcon, productArt, floral, ornament, jasmine };
})();
