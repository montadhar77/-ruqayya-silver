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

  /* soft white roses with a touch of sage green, drawn here (no images): a gold mihrab with
     roses round the hero card, a small sprig and a loose petal. Home page only. Colours come from --bl-* (site.css). */
  const blooms = (() => {
  let uid = 0;   // gradient ids are unique per drawing
  const f = (n) => (Math.round(n * 10) / 10).toString();
  const rad = (d) => (d * Math.PI) / 180;

  // smooth closed/open curve through points (Catmull-Rom → cubic Bézier)
  function smooth(pts, closed) {
    const P = (k) => pts[closed ? (k + pts.length) % pts.length : Math.max(0, Math.min(pts.length - 1, k))];
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    const n = closed ? pts.length : pts.length - 1;
    for (let k = 0; k < n; k++) {
      const p0 = P(k - 1), p1 = P(k), p2 = P(k + 1), p3 = P(k + 2);
      d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d + (closed ? "Z" : "");
  }

  // a rounded rose petal pointing up from (0,0): length l, half-width w, a soft dip at the rim
  const petalPath = (l, w, dip = 0.05) =>
    `M0 0C${f(-w * 0.95)} ${f(-l * 0.22)} ${f(-w * 1.08)} ${f(-l * 0.78)} ${f(-w * 0.52)} ${f(-l * 0.97)}` +
    `C${f(-w * 0.26)} ${f(-l * 1.06)} ${f(-w * 0.08)} ${f(-l * (1 - dip))} 0 ${f(-l * (1 - dip))}` +
    `C${f(w * 0.08)} ${f(-l * (1 - dip))} ${f(w * 0.26)} ${f(-l * 1.06)} ${f(w * 0.52)} ${f(-l * 0.97)}` +
    `C${f(w * 1.08)} ${f(-l * 0.78)} ${f(w * 0.95)} ${f(-l * 0.22)} 0 0Z`;

  // a cupped petal wrapped round the heart: a crescent on radius R from angle a over span degrees
  function cup(R, a, span, thick) {
    const out = [], inn = [], N = 9;
    for (let k = 0; k <= N; k++) {
      const t = k / N, th = rad(a + span * t);
      const bulge = Math.sin(Math.PI * t);
      out.push([(R + bulge * R * 0.06) * Math.cos(th), (R + bulge * R * 0.06) * Math.sin(th)]);
      inn.push([(R - thick * Math.pow(bulge, 0.8)) * Math.cos(th), (R - thick * Math.pow(bulge, 0.8)) * Math.sin(th)]);
    }
    return smooth(out.concat(inn.slice(1, -1).reverse()), true);
  }

  const leafPath = (l, w) =>
    `M0 0C${f(w)} ${f(-l * 0.18)} ${f(w * 0.95)} ${f(-l * 0.72)} 0 ${f(-l)}C${f(-w * 0.95)} ${f(-l * 0.72)} ${f(-w)} ${f(-l * 0.18)} 0 0Z`;

  /* gradients shared by one drawing (ids are unique per drawing) */
  function defs(i) {
    return `<defs>
      <radialGradient id="rqO${i}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="52">
        <stop offset=".12" stop-color="var(--bl-shade-2,#aebda4)"/><stop offset=".45" stop-color="var(--bl-shade,#e3e9db)"/>
        <stop offset=".82" stop-color="#fafbf7"/><stop offset="1" stop-color="#fff"/></radialGradient>
      <radialGradient id="rqI${i}" gradientUnits="userSpaceOnUse" cx="0" cy="2" r="30">
        <stop offset="0" stop-color="var(--bl-core,#9db293)"/><stop offset=".4" stop-color="var(--bl-shade-2,#c8d4bf)"/>
        <stop offset=".72" stop-color="var(--bl-shade,#eaefe4)"/><stop offset="1" stop-color="#fff"/></radialGradient>
      <linearGradient id="rqB${i}" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="var(--bl-shade-2,#b7c4ad)"/><stop offset=".5" stop-color="var(--bl-shade,#e6ece0)"/><stop offset="1" stop-color="#fff"/></linearGradient>
      <linearGradient id="rqL${i}" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="var(--bl-leaf-2,#4d6c53)"/><stop offset=".55" stop-color="var(--bl-leaf,#7f9e7c)"/><stop offset="1" stop-color="var(--bl-leaf-3,#a9c2a2)"/></linearGradient>
    </defs>`;
  }
  const EDGE = `stroke="var(--bl-edge,rgba(92,112,92,.3))" stroke-width=".55"`;

  /* an open rose seen slightly from above */
  function rose(i, x, y, s, rot = 0, tilt = 0.84) {
    let out = "";
    // outer open petals, two rings
    [{ n: 6, l: 50, w: 27, off: 6 }, { n: 5, l: 40, w: 24, off: 40 }].forEach((L, k) => {
      for (let j = 0; j < L.n; j++) {
        const a = L.off + (j * 360) / L.n + (j % 2 ? 4 : -4);
        const d = petalPath(L.l * (1 + ((j * 7) % 5) * 0.03), L.w, 0.04 + (j % 3) * 0.025);
        if (k) out += `<path d="${d}" transform="rotate(${f(a + 5)}) scale(1.05)" fill="var(--bl-shadow,rgba(55,78,58,.15))"/>`;
        out += `<path d="${d}" transform="rotate(${f(a)})" fill="url(#rqO${i})" ${EDGE}/>`;
      }
    });
    // the cup: crescents wrapping round the heart, in a spiral
    out += `<circle r="25" fill="var(--bl-shadow,rgba(55,78,58,.15))"/>`;
    [[26, 200, 170, 10], [25, 20, 165, 10], [21, 120, 175, 9], [19.5, 290, 160, 8.5], [16, 40, 190, 7.5], [13, 200, 200, 6.5], [10, 330, 210, 5.5], [7, 110, 230, 4.5], [4.2, 250, 260, 3.2]].forEach(([R, a, sp, th]) => {
      out += `<path d="${cup(R, a, sp, th)}" fill="url(#rqI${i})" ${EDGE}/>`;
    });
    out += `<circle r="1.8" fill="var(--bl-core,#8ea283)" fill-opacity=".8"/>`;
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)} ${f(s * tilt)})">${out}</g>`;
  }

  /* a bud, closed, with green sepals */
  function bud(i, x, y, s, rot = 0) {
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})">
      <path d="M0 0C-12-4-15-20-8-32C-5-37 0-40 0-40C0-40 5-37 8-32C15-20 12-4 0 0Z" fill="url(#rqB${i})" ${EDGE}/>
      <path d="M0-40C-3-30 1-17 7-8" fill="none" stroke="var(--bl-edge,rgba(92,112,92,.34))" stroke-width=".7"/>
      <path d="M0 0C-9-2-14-10-13-21C-9-12-5-8 0-6C5-8 9-12 13-21C14-10 9-2 0 0Z" fill="url(#rqL${i})"/>
      <path d="M0 0C-3-7-10-13-16-15C-9-8-5-3 0 0ZM0 0C3-7 10-13 16-15C9-8 5-3 0 0Z" fill="var(--bl-leaf-2,#4d6c53)"/>
      <ellipse cy="3" rx="3" ry="4" fill="var(--bl-leaf-2,#4d6c53)"/>
    </g>`;
  }

  /* a leaf with a soft midrib and veins kept inside the blade */
  function leaf(i, x, y, s, rot = 0, l = 44, w = 14) {
    let v = "";
    [0.28, 0.46, 0.64].forEach((t) => {
      const hw = w * 0.52 * Math.sin(Math.PI * (t + 0.1)), dy = l * 0.13;
      v += `M0 ${f(-l * t)}Q${f(hw * 0.5)} ${f(-l * t - dy * 0.4)} ${f(hw)} ${f(-l * t - dy)}M0 ${f(-l * t)}Q${f(-hw * 0.5)} ${f(-l * t - dy * 0.4)} ${f(-hw)} ${f(-l * t - dy)}`;
    });
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})">
      <path d="${leafPath(l, w)}" fill="url(#rqL${i})"/>
      <path d="M0 0Q${f(w * 0.08)} ${f(-l * 0.5)} 0 ${f(-l * 0.9)}${v}" fill="none" stroke="var(--bl-vein,rgba(225,238,220,.4))" stroke-width=".7" stroke-linecap="round"/>
    </g>`;
  }

  /* a tiny five-petal blossom (filler) */
  function blossom(x, y, s, rot = 0) {
    let p = "";
    for (let k = 0; k < 5; k++) p += `<ellipse cy="-5.2" rx="3.5" ry="5.1" transform="rotate(${k * 72})"/>`;
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})"><g fill="#fff" ${EDGE}>${p}</g><circle r="2.2" fill="var(--bl-core-2,#b9c79a)"/></g>`;
  }

  // a cubic stem, with leaves set along it at fractions t (side ±1)
  function branch(i, p, leaves, w = 1.5) {
    const at = (t) => {
      const u = 1 - t;
      const x = u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0];
      const y = u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1];
      const dx = 3 * u * u * (p[1][0] - p[0][0]) + 6 * u * t * (p[2][0] - p[1][0]) + 3 * t * t * (p[3][0] - p[2][0]);
      const dy = 3 * u * u * (p[1][1] - p[0][1]) + 6 * u * t * (p[2][1] - p[1][1]) + 3 * t * t * (p[3][1] - p[2][1]);
      return [x, y, (Math.atan2(dy, dx) * 180) / Math.PI + 90];
    };
    let out = `<path d="M${p[0][0]} ${p[0][1]}C${p[1][0]} ${p[1][1]} ${p[2][0]} ${p[2][1]} ${p[3][0]} ${p[3][1]}" fill="none" stroke="var(--bl-stem,#6c8a69)" stroke-width="${w}" stroke-linecap="round"/>`;
    leaves.forEach(([t, side, sc]) => { const [x, y, a] = at(t); out += leaf(i, x, y, sc, a + side * 52); });
    return out;
  }

  /* ---- the mihrab: a modern Islamic frame round the hero card ----------------------------
     One square drawing (0..1000) laid exactly over the hero showcase; the card sits at
     x 150..850, y 62..938. A pointed arch in fine gold lines (outer, inner, a row of beads),
     an eight-pointed star at its crown, arabesque (islimi) vines climbing its sides with
     leaves and small white blossoms. The roses at its feet are separate drawings (feet()). */
  const ARCH = { r: 560, cx: 130, spring: 515, base: 975 };   // arcs centred 130 inside each side
  function archPath(inset) {
    const r = ARCH.r - inset, x0 = 70 + inset, x1 = 930 - inset, s = ARCH.spring;
    const apex = s - Math.sqrt(r * r - 130 * 130);
    return `M${x0} ${ARCH.base}L${x0} ${s}A${r} ${r} 0 0 1 500 ${f(apex)}A${r} ${r} 0 0 1 ${x1} ${s}L${x1} ${ARCH.base}`;
  }
  // an eight-pointed star (two squares) of radius R at (x, y)
  const star8 = (x, y, R) => {
    const sq = (rot) => Array.from({ length: 4 }, (_, k) => { const t = rad(rot + k * 90); return `${f(x + R * Math.cos(t))} ${f(y + R * Math.sin(t))}`; });
    return `M${sq(0).join("L")}ZM${sq(45).join("L")}Z`;
  };
  // a vine through a list of points, throwing arabesque scrolls: [point index, side, size]
  function vine(pts, curls) {
    const d = smooth(pts, false);
    let tend = "";
    const leaves = [], flowers = [];
    curls.forEach(([k, side, size]) => {
      const [x, y] = pts[k], [nx, ny] = pts[k + 1] || pts[k - 1];
      const dir = Math.atan2(ny - y, nx - x) + side * Math.PI / 2;     // away from the stem
      const cx = x + Math.cos(dir) * size, cy = y + Math.sin(dir) * size, a0 = dir + Math.PI, sp = [];
      for (let j = 0; j <= 22; j++) {
        const t = j / 22, a = a0 - side * t * Math.PI * 2.4, r = size * (1 - 0.72 * t);
        sp.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      tend += smooth(sp, false);
      // a leaf where the scroll leaves the stem, a blossom in its eye
      leaves.push([x, y, (dir * 180) / Math.PI + 90 + side * 38, 0.62]);
      leaves.push([sp[7][0], sp[7][1], (dir * 180) / Math.PI + 90 - side * 70, 0.42]);
      flowers.push([cx + (sp[22][0] - cx) * 0.4, cy + (sp[22][1] - cy) * 0.4]);
    });
    return { d, tend, leaves, flowers };
  }
  // a row of small cusps (scallops) along the inner curve of the arch, as in a carved mihrab
  function cusps(inset) {
    const r = ARCH.r - inset, n = 13;
    const side = (cx, from, to) => {
      const pts = [];
      for (let k = 0; k <= n; k++) { const t = rad(from + (to - from) * (k / n)); pts.push([cx + r * Math.cos(t), ARCH.spring + r * Math.sin(t)]); }
      return pts;
    };
    const apexAng = (Math.atan2(-Math.sqrt(r * r - 130 * 130), -130) * 180) / Math.PI;     // left arc: from 180° up to the apex
    const L = side(630, -180, apexAng), Rt = side(370, -(180 + apexAng), 0).map(([x, y]) => [x, y]);
    let d = `M${f(L[0][0])} ${f(L[0][1])}`;
    for (let k = 1; k < L.length; k++) { const c = Math.hypot(L[k][0] - L[k - 1][0], L[k][1] - L[k - 1][1]) * 0.56; d += `A${f(c)} ${f(c)} 0 0 0 ${f(L[k][0])} ${f(L[k][1])}`; }
    d += `M${f(Rt[0][0])} ${f(Rt[0][1])}`;
    for (let k = 1; k < Rt.length; k++) { const c = Math.hypot(Rt[k][0] - Rt[k - 1][0], Rt[k][1] - Rt[k - 1][1]) * 0.56; d += `A${f(c)} ${f(c)} 0 0 0 ${f(Rt[k][0])} ${f(Rt[k][1])}`; }
    return d;
  }
  // an eight-petal rosette
  const rosette = (x, y, R) => Array.from({ length: 8 }, (_, k) => `<ellipse cx="${x}" cy="${f(y - R * 0.55)}" rx="${f(R * 0.2)}" ry="${f(R * 0.45)}" transform="rotate(${k * 45} ${x} ${y})"/>`).join("");
  function mihrab() {
    const i = ++uid;
    // left side: up the outside of the arch, then along its curve
    const left = [];
    for (let y = 955; y >= 545; y -= 82) left.push([38 + (left.length % 2 ? 9 : -9), y]);
    for (let t = 181; t <= 209; t += 7) left.push([630 + 592 * Math.cos(rad(t)), 515 + 592 * Math.sin(rad(t))]);
    const L = vine(left, [[1, -1, 30], [2, 1, 22], [3, -1, 34], [5, -1, 28], [7, -1, 22]]);
    const right = left.slice(0, 6).map(([x, y]) => [1000 - x, y]);
    const R = vine(right, [[1, 1, 28], [3, 1, 30], [4, -1, 20]]);
    const leafs = [...L.leaves, ...R.leaves].map(([x, y, a, sc], k) => leaf(i, x, y, sc + (k % 3) * 0.04, a, 40, 14)).join("");
    const blooms = [...L.flowers, ...R.flowers].map(([x, y], k) => blossom(x, y, 0.95 + (k % 2) * 0.3, k * 23)).join("");
    const end = left[left.length - 1], endR = right[right.length - 1];
    return `<svg class="orn-lines" viewBox="0 0 1000 1000" aria-hidden="true" focusable="false">${defs(i)}
      <defs><linearGradient id="rqG${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--orn-gold-1,#f6e3ae)"/><stop offset=".5" stop-color="var(--orn-gold-2,#d6b26e)"/><stop offset="1" stop-color="var(--orn-gold-3,#9c7a3a)"/></linearGradient></defs>
      <g fill="none" stroke="url(#rqG${i})" stroke-linecap="round" stroke-linejoin="round">
        <path class="orn-draw" pathLength="1" d="${archPath(0)}" stroke-width="2.6"/>
        <path class="orn-draw" pathLength="1" d="${archPath(15)}" stroke-width="1.1" opacity=".8"/>
        <path class="orn-draw" pathLength="1" d="${cusps(40)}" stroke-width="1.3" opacity=".85"/>
        <path class="orn-beads" d="${archPath(27)}" stroke-width="3.6" stroke-dasharray="0 15" opacity=".6"/>
        <path class="orn-draw" pathLength="1" d="${L.d}" stroke-width="1.9"/>
        <path class="orn-draw" pathLength="1" d="${R.d}" stroke-width="1.9"/>
        <path class="orn-draw" pathLength="1" d="${L.tend}${R.tend}" stroke-width="1.3"/>
        <path class="orn-draw" pathLength="1" d="${star8(500, -96, 36)}" stroke-width="1.7"/>
        <path class="orn-draw" pathLength="1" d="${star8(500, -96, 22)}" stroke-width="1" opacity=".7"/>
        <path d="M500 -146V-164M58 515H96M904 515H942" stroke-width="1.6"/>
      </g>
      <g class="orn-fade">
        <g fill="url(#rqG${i})" opacity=".85">${rosette(500, -96, 16)}</g>
        <circle cx="500" cy="-96" r="4" fill="var(--orn-gold-1,#f6e3ae)"/><circle cx="500" cy="-170" r="3.6" fill="url(#rqG${i})"/>
        <path d="${star8(77, 515, 9)}${star8(923, 515, 9)}" fill="url(#rqG${i})"/>
        ${leafs}${blooms}
        ${bud(i, end[0], end[1], 0.52, 44)}${bud(i, endR[0], endR[1], 0.48, -14)}
        ${leaf(i, 486, -30, 0.62, -72, 40, 14)}${leaf(i, 514, -30, 0.62, 72, 40, 14)}${leaf(i, 474, -14, 0.5, -112, 40, 14)}${leaf(i, 526, -14, 0.5, 112, 40, 14)}
        ${blossom(438, -22, 0.9, 0)}${blossom(562, -22, 0.9, 30)}
        ${rose(i, 500, -26, 0.52, 10)}
      </g>
    </svg>`;
  }
  // the light that runs along the arch now and then (its own small drawing, so it is cheap to animate)
  const glint = () => `<svg class="orn-glint" viewBox="0 0 1000 1000" aria-hidden="true" focusable="false"><path pathLength="1" d="${archPath(0)}" fill="none" stroke="var(--orn-glint,#fff6dc)" stroke-width="3.4" stroke-linecap="round" stroke-dasharray=".05 .95"/></svg>`;

  /* roses at the feet of the arch: the larger bunch (left) and a smaller one (right) */
  function feet(big) {
    const i = ++uid;
    return big
      ? `<svg viewBox="0 0 300 260" aria-hidden="true" focusable="false">${defs(i)}
          ${leaf(i, 150, 150, 1, -58)}${leaf(i, 168, 130, 0.9, 12)}${leaf(i, 102, 170, 0.95, -112)}${leaf(i, 196, 178, 0.85, 102)}${leaf(i, 128, 196, 0.8, -160)}
          ${branch(i, [[120, 140], [100, 110], [86, 80], [80, 44]], [[0.45, -1, 0.72], [0.78, 1, 0.58]], 1.3)}
          ${bud(i, 80, 44, 0.66, -14)}${blossom(60, 120, 0.85, 10)}${blossom(226, 200, 0.8, 30)}${blossom(44, 156, 0.6, 50)}${blossom(240, 176, 0.6, 0)}
          ${rose(i, 112, 150, 0.82, 12)}${rose(i, 184, 172, 1.05, -10)}
        </svg>`
      : `<svg viewBox="0 0 240 220" aria-hidden="true" focusable="false">${defs(i)}
          ${leaf(i, 122, 130, 0.9, 58)}${leaf(i, 98, 146, 0.85, -84)}${leaf(i, 136, 160, 0.8, 150)}
          ${branch(i, [[128, 120], [146, 96], [160, 70], [168, 40]], [[0.5, 1, 0.66]], 1.2)}
          ${bud(i, 168, 40, 0.6, 18)}${blossom(70, 172, 0.8, 20)}${blossom(184, 168, 0.7, 40)}
          ${rose(i, 118, 146, 0.86, 8)}
        </svg>`;
  }

  /* a faint eight-pointed star lattice (girih) for the background of the hero, as a CSS image */
  function girih(color) {
    const c = color || "#d6b26e", st = (x, y) => star8(x, y, 17);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><g fill="none" stroke="${c}" stroke-width=".7">
      <path d="${st(60, 60)}${st(0, 0)}${st(120, 0)}${st(0, 120)}${st(120, 120)}"/>
      <path d="M77 60H103M17 60H43M60 17V43M60 77V103M72 72L108 108M48 48L12 12M72 48L108 12M48 72L12 108" stroke-opacity=".7"/>
      <circle cx="60" cy="60" r="4"/></g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  /* a small sprig: one rose, a bud and leaves (viewBox 220 x 200) */
  function sprig() {
    const i = ++uid;
    return `<svg viewBox="0 0 220 200" aria-hidden="true" focusable="false">${defs(i)}
      ${leaf(i, 118, 150, 0.9, 150)}${leaf(i, 84, 134, 0.85, -70)}
      ${branch(i, [[112, 120], [134, 104], [156, 80], [180, 50]], [[0.45, 1, 0.8], [0.75, -1, 0.62]], 1.4)}
      ${branch(i, [[100, 134], [80, 150], [58, 160], [32, 160]], [[0.5, -1, 0.72]], 1.2)}
      ${bud(i, 180, 50, 0.68, 36)}${blossom(32, 160, 1, 0)}${blossom(48, 180, 0.72, 30)}
      ${rose(i, 104, 128, 0.82, -8)}
    </svg>`;
  }

  /* one loose petal for the slow fall in the hero */
  function petal() {
    const i = ++uid;
    return `<svg viewBox="-14 -27 28 30" aria-hidden="true" focusable="false"><defs><linearGradient id="rqF${i}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="var(--bl-shade,#e3e9db)"/><stop offset="1" stop-color="#fff"/></linearGradient></defs><path d="${petalPath(24, 11, 0.06)}" fill="url(#rqF${i})" ${EDGE}/></svg>`;
  }

    return { sprig, petal, mihrab, glint, feet, girih };
  })();

  /* ---- embroidery: roses, leaves and gold thread that look stitched (satin, woven-wheel, chain,
     lazy-daisy, french knots). Used across the site; colours of the threads in T. ---- */
  const emb = (() => {
  let uid = 0;
  const f = (n) => (Math.round(n * 10) / 10).toString();
  const rad = (d) => (d * Math.PI) / 180;
  const P = (o) => Object.entries(o).map(([k, v]) => `${k}="${v}"`).join(" ");

  // thread palettes: [shadow, base, light, sheen]
  const T = {
    white: ["#c9cfc4", "#eef0ea", "#fbfbf8", "#ffffff"],
    blush: ["#d9a6a2", "#efc9c3", "#f8e3de", "#fff4f1"],
    cream: ["#d8c9a4", "#efe4c8", "#f8f1df", "#fffaf0"],
    green: ["#2f6b4f", "#4a9c78", "#79bf9a", "#a9dcbf"],
    sage: ["#4d6b52", "#7b9a7c", "#a6c2a4", "#cfe2cc"],
    gold: ["#8f6f2c", "#c9a356", "#e6c983", "#fbe9b8"],
  };

  /* the stitches of one drawing share these definitions; ids are unique per drawing */
  function kit() {
    const i = ++uid, defs = [];
    const hatch = {};
    // fine parallel threads at a given angle (satin stitch); gaps show the thread colour below
    function satin(angle, col) {
      const a = Math.round(angle / 10) * 10, key = a + col;
      if (!hatch[key]) {
        const id = `st${i}_${Object.keys(hatch).length}`;
        hatch[key] = id;
        defs.push(`<pattern id="${id}" width="2.4" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(${a})">
          <rect width="2.4" height="6" fill="${T[col][1]}"/><rect x="0" width="1.25" height="6" fill="${T[col][3]}" opacity=".85"/><rect x="1.9" width=".5" height="6" fill="${T[col][0]}" opacity=".55"/></pattern>`);
      }
      return `url(#${hatch[key]})`;
    }
    const grad = (col) => {
      const id = `g${i}_${col}`;
      if (!defs.some((d) => d.includes(`id="${id}"`))) defs.push(`<radialGradient id="${id}" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="${T[col][0]}"/><stop offset="1" stop-color="${T[col][1]}" stop-opacity="0"/></radialGradient>`);
      return `url(#${id})`;
    };
    return { i, defs, satin, grad };
  }

  // a rounded petal pointing up from (0,0)
  const petal = (l, w) => `M0 0C${f(-w)} ${f(-l * 0.25)} ${f(-w * 1.05)} ${f(-l * 0.8)} ${f(-w * 0.45)} ${f(-l)}Q0 ${f(-l * 1.12)} ${f(w * 0.45)} ${f(-l)}C${f(w * 1.05)} ${f(-l * 0.8)} ${f(w)} ${f(-l * 0.25)} 0 0Z`;
  const leafD = (l, w) => `M0 0C${f(w)} ${f(-l * 0.2)} ${f(w * 0.9)} ${f(-l * 0.75)} 0 ${f(-l)}C${f(-w * 0.9)} ${f(-l * 0.75)} ${f(-w)} ${f(-l * 0.2)} 0 0Z`;

  /* an embroidered rose: satin-stitched petals in rings, threads running out from the heart */
  function rose(K, x, y, s, col = "white", rot = 0) {
    let o = "";
    const rings = [{ n: 6, l: 30, w: 16, off: 0 }, { n: 5, l: 23, w: 13, off: 36 }, { n: 5, l: 15, w: 9, off: 12 }];
    rings.forEach((R, k) => {
      for (let j = 0; j < R.n; j++) {
        const a = R.off + (j * 360) / R.n;
        const d = petal(R.l, R.w);
        o += `<g transform="rotate(${f(a)})"><path d="${d}" fill="${T[col][0]}" transform="scale(1.04)"/><path d="${d}" fill="${K.satin(a + rot, col)}"/>
          <path d="${d}" fill="none" stroke="${T[col][0]}" stroke-width=".7" stroke-dasharray="2.2 1.1" opacity=".9"/></g>`;
      }
      o += `<circle r="${f(R.l * 0.5)}" fill="${K.grad(col)}" opacity=".55"/>`;
    });
    // the heart: a tight spiral of thread
    let sp = "";
    for (let t = 0; t <= 1; t += 0.04) { const a = t * Math.PI * 5, r = 1 + t * 8; sp += `${t ? "L" : "M"}${f(Math.cos(a) * r)} ${f(Math.sin(a) * r)}`; }
    o += `<path d="${sp}" fill="none" stroke="${T[col][0]}" stroke-width="2.6" stroke-linecap="round"/><path d="${sp}" fill="none" stroke="${T[col][2]}" stroke-width="1.5" stroke-linecap="round"/>`;
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})">${o}</g>`;
  }

  /* a small woven-wheel rose (ribbon embroidery): rings of short thread wraps, each one shaded */
  function woven(x, y, s, col = "white") {
    const c = T[col];
    let o = `<circle r="13" fill="${c[0]}"/>`;
    const rings = [[11, 9, 0], [8.2, 8, 20], [5.6, 7, 8], [3.4, 5, 40]];
    rings.forEach(([r, n, off], k) => {
      for (let j = 0; j < n; j++) {
        const a1 = rad(off + (j * 360) / n), a2 = rad(off + ((j + 0.92) * 360) / n);
        const p1 = [Math.cos(a1) * r, Math.sin(a1) * r], p2 = [Math.cos(a2) * r, Math.sin(a2) * r];
        const arc = `M${f(p1[0])} ${f(p1[1])}A${r} ${r} 0 0 1 ${f(p2[0])} ${f(p2[1])}`;
        const ro = r + 0.9, q1 = [Math.cos(a1 + 0.15) * ro, Math.sin(a1 + 0.15) * ro], q2 = [Math.cos(a2 - 0.25) * ro, Math.sin(a2 - 0.25) * ro];
        o += `<path d="${arc}" fill="none" stroke="${k > 2 ? c[0] : c[1]}" stroke-width="${f(3.4 - k * 0.45)}" stroke-linecap="round"/>
          <path d="M${f(q1[0])} ${f(q1[1])}A${ro} ${ro} 0 0 1 ${f(q2[0])} ${f(q2[1])}" fill="none" stroke="${c[3]}" stroke-width=".9" stroke-linecap="round" opacity=".95"/>`;
      }
    });
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})">${o}<circle r="1.6" fill="${c[0]}"/></g>`;
  }

  /* a satin leaf: threads slanting from the midrib (fishbone stitch) */
  function leaf(K, x, y, s, rot, col = "green", l = 34, w = 11) {
    const d = leafD(l, w);
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})">
      <path d="${d}" fill="${T[col][0]}" transform="scale(1.05)"/>
      <clipPath id="lc${K.i}_${++uid}"><path d="M0 0H${-w * 2}V${-l * 1.2}H0Z"/></clipPath>
      <path d="${d}" fill="${K.satin(rot + 40, col)}" clip-path="url(#lc${K.i}_${uid})"/>
      <clipPath id="lc${K.i}_${++uid}"><path d="M0 0H${w * 2}V${-l * 1.2}H0Z"/></clipPath>
      <path d="${d}" fill="${K.satin(rot - 40, col)}" clip-path="url(#lc${K.i}_${uid})"/>
      <path d="M0 0V${f(-l * 0.95)}" stroke="${T[col][0]}" stroke-width=".9"/></g>`;
  }

  /* a lazy-daisy leaf: one chain-stitch loop */
  const daisy = (x, y, s, rot, col = "green") => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})"><path d="${leafD(16, 5)}" fill="none" stroke="${T[col][1]}" stroke-width="2"/><path d="M0 ${f(-17)}l0 -3" stroke="${T[col][1]}" stroke-width="1.6" stroke-linecap="round"/></g>`;

  /* a lazy-daisy flower: five chain-stitch petals round a gold knot */
  const flower = (x, y, s, col = "white", rot = 0) => {
    const c = T[col];
    let p = "";
    for (let k = 0; k < 5; k++) p += `<g transform="rotate(${rot + k * 72})"><path d="M0 -2.4C3.6 -4.5 3.4 -10.5 0 -12.2C-3.4 -10.5 -3.6 -4.5 0 -2.4Z" fill="${c[1]}" stroke="${c[0]}" stroke-width="1.1"/><path d="M0 -3.6C1.6 -5.6 1.5 -9.4 0 -10.6" fill="none" stroke="${c[3]}" stroke-width=".9" stroke-linecap="round"/></g>`;
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})">${p}<circle r="2.6" fill="${T.gold[0]}"/><circle r="1.9" fill="${T.gold[1]}"/><circle cx="-.6" cy="-.6" r=".7" fill="${T.gold[3]}"/></g>`;
  };

  /* a french knot */
  const knot = (x, y, s = 1, col = "gold") => `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})"><circle r="2.3" fill="${T[col][0]}"/><circle r="1.7" fill="${T[col][1]}"/><circle cx="-.6" cy="-.6" r=".7" fill="${T[col][3]}"/></g>`;

  /* a stem in stem stitch */
  const stem = (d, col = "green", w = 2) => `<path d="${d}" fill="none" stroke="${T[col][0]}" stroke-width="${w + 0.8}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${T[col][1]}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="4 1.2"/><path d="${d}" fill="none" stroke="${T[col][3]}" stroke-width="${w * 0.35}" stroke-linecap="round" stroke-dasharray="2.4 2.8" opacity=".8"/>`;

  /* a gold chain-stitch line along a path */
  const chain = (d, col = "gold", w = 2.4) => `<path d="${d}" fill="none" stroke="${T[col][0]}" stroke-width="${w + 1}" stroke-linecap="round" stroke-dasharray="0.1 4.2"/><path d="${d}" fill="none" stroke="${T[col][1]}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="2.6 1.7"/><path d="${d}" fill="none" stroke="${T[col][3]}" stroke-width="${w * 0.35}" stroke-linecap="round" stroke-dasharray="1.2 3.1" opacity=".9"/>`;


  /* ---- compositions ---- */
  const svg = (vb, K, inner, attrs = "") => `<svg viewBox="${vb}" ${attrs} aria-hidden="true" focusable="false"><defs>${K.defs.join("")}</defs>${inner}</svg>`;
  const tile = (w, h, K, inner, op = 1) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${K.defs.join("")}</defs><g opacity="${op}">${inner}</g></svg>`;
  const url = (s) => `url("data:image/svg+xml,${encodeURIComponent(s.replace(/\s+/g, " "))}")`;

  /* a bouquet: one big rose, small woven roses, leaves and gold knots (viewBox 200 x 170) */
  function bouquet(v = 0) {
    const K = kit();
    return svg("0 0 200 170", K, `${stem("M100 120C96 140 90 152 80 166")}${stem("M100 120C120 132 140 138 160 136", "green", 1.6)}${stem("M96 112C76 104 58 90 46 70", "green", 1.6)}
      ${leaf(K, 70, 98, 1, -70)}${leaf(K, 128, 128, 0.95, 68)}${leaf(K, 112, 92, 0.8, 30, "sage")}${leaf(K, 80, 126, 0.85, -130, "sage")}${leaf(K, 150, 136, 0.7, 100)}
      ${daisy(54, 84, 1, -40)}${daisy(146, 124, 1, 70)}${daisy(40, 72, 0.9, -10)}
      ${woven(46, 66, 0.9, v ? "blush" : "cream")}${woven(160, 134, 0.8, "white")}${woven(136, 80, 0.62, "blush")}
      ${knot(30, 84)}${knot(36, 92, 0.8)}${knot(172, 120)}${knot(168, 148, 0.8)}${knot(124, 64, 0.8)}${knot(66, 50, 0.7)}
      ${rose(K, 100, 108, 1, "white", 8)}`);
  }

  /* the frame round the hero card: a cusped arch like the outline of the logo, stitched in gold
     chain stitch with a running stitch inside, small woven roses climbing it and a rose at its
     crown (one 1000-unit square laid over the showcase; the card is at x 150..850, y 62..938) */
  function arch(inset) {
    const r = 560 - inset, x0 = 70 + inset, x1 = 930 - inset, s = 515, apex = s - Math.sqrt(r * r - 130 * 130);
    return `M${x0} 975L${x0} ${s}A${r} ${r} 0 0 1 500 ${f(apex)}A${r} ${r} 0 0 1 ${x1} ${s}L${x1} 975`;
  }
  function frame() {
    const K = kit();
    let climb = "";
    // flowers and leaves climbing both sides of the arch
    [[70, 880, "w", 2.6], [70, 700, "f", 2.2], [74, 520, "w", 2.2], [104, 360, "f", 1.9]].forEach(([x, y, kind, sc], k) => {
      [x, 1000 - x].forEach((xx, side) => {
        const dir = side ? 1 : -1;
        climb += `${daisy(xx + dir * 18, y - 16, 2.2, dir * (48 + k * 6))}${daisy(xx - dir * 16, y + 22, 2, dir * -132, "sage")}`;
        climb += kind === "w" ? woven(xx, y, sc, (k + side) % 2 ? "blush" : "white") : flower(xx, y, sc, "white", k * 20);
        climb += knot(xx + dir * 34, y + 30, 1.8);
      });
    });
    const crown = `${leaf(K, 470, -26, 1.1, -64)}${leaf(K, 530, -26, 1.1, 64)}${leaf(K, 452, -6, 0.9, -110, "sage")}${leaf(K, 548, -6, 0.9, 110, "sage")}
      ${daisy(430, -40, 1.1, -70)}${daisy(570, -40, 1.1, 70)}${woven(416, -12, 1.5, "blush")}${woven(584, -12, 1.5, "blush")}${flower(384, -54, 1.8)}${flower(616, -54, 1.8, "white", 30)}${knot(500, -88, 1.2)}${knot(470, -78, 0.8)}${knot(530, -78, 0.8)}
      ${rose(K, 500, -30, 1.25, "white", 6)}`;
    return svg("0 0 1000 1000", K, `${chain(arch(0), "gold", 4.2)}<path d="${arch(18)}" fill="none" stroke="${T.gold[1]}" stroke-width="1.4" stroke-dasharray="5 4" opacity=".75"/>${climb}${crown}`, 'class="emb-frame"');
  }

  /* repeating images (CSS backgrounds): roses scattered over the page, a divider, a garland */
  function scatterTile(op = 0.5) {
    const K = kit();
    return url(tile(280, 280, K, `${stem("M58 92C62 76 72 64 88 58", "sage", 1.2)}${daisy(70, 74, 0.9, 40, "sage")}${daisy(78, 84, 0.8, 130, "sage")}${flower(56, 96, 0.95)}${knot(92, 52, 0.7)}
      ${stem("M212 222C200 212 188 208 174 210", "sage", 1.2)}${daisy(194, 212, 0.9, -50, "sage")}${daisy(184, 222, 0.75, -140, "sage")}${flower(214, 224, 0.8, "blush", 15)}${knot(168, 202, 0.7)}
      ${flower(210, 70, 0.62, "cream", 20)}${knot(222, 84, 0.55)}${flower(70, 212, 0.55, "white", 40)}${knot(80, 200, 0.5)}`, op));
  }
  function dividerImg() {
    const K = kit();
    let s = "";
    [[-1], [1]].forEach(([d]) => {
      s += `${stem(`M110 24C${110 + d * 26} 14 ${110 + d * 52} 30 ${110 + d * 84} 22`, "green", 1.5)}${daisy(110 + d * 34, 16, 0.9, d * 60)}${daisy(110 + d * 58, 30, 0.85, d * 140)}${woven(110 + d * 84, 22, 0.5, "blush")}${knot(110 + d * 70, 14, 0.7)}${knot(110 + d * 98, 28, 0.6)}`;
    });
    return url(tile(220, 48, K, `${s}${woven(110, 24, 0.95, "white")}`));
  }
  function garlandImg() {
    const K = kit();
    return url(tile(260, 56, K, `${stem("M0 30C40 12 90 12 130 30S220 48 260 30", "green", 1.6)}${daisy(34, 20, 0.9, 30)}${daisy(98, 18, 0.9, -40)}${daisy(160, 40, 0.9, 150)}${daisy(222, 42, 0.9, -150)}
      ${woven(64, 18, 0.72, "white")}${woven(130, 30, 0.9, "white")}${woven(196, 42, 0.72, "blush")}${knot(84, 30, 0.7)}${knot(116, 14, 0.6)}${knot(176, 28, 0.7)}${knot(240, 36, 0.6)}${knot(16, 34, 0.6)}`));
  }
  const roseImg = (c = "white") => url(tile(30, 30, kit(), woven(15, 15, 1.02, c)));
  /* a small falling blossom */
  let falls = 0;
  const fall = () => `<svg viewBox="-15 -15 30 30" aria-hidden="true" focusable="false">${flower(0, 0, 1.15, ++falls % 3 ? "white" : "blush", falls * 17)}</svg>`;

  return { flower, frame, bouquet, scatterTile, dividerImg, garlandImg, roseImg, fall, rose, woven, leaf, daisy, knot, stem, chain, kit };
  })();

  window.RQ_ART = { ui, dep, depNames, depIcon, productArt, floral, ornament, blooms, emb };
})();
