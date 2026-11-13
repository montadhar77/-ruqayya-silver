/* Runs first, before the page paints (kept out of the HTML so the Content Security
   Policy can forbid inline scripts):
   - marks the page as script-enabled (animations start hidden, then reveal)
   - applies the saved light/dark choice so the page never flashes the wrong theme
   - picks the language (?lang=…, then the visitor's earlier choice, then the device
     language: English, Persian, Urdu or German, otherwise Arabic) and sets the page direction
   - switches the web fonts on once their stylesheet has loaded (non-blocking)
   - starts the opening screen's logo (see below) */
(function () {
  var d = document.documentElement;
  d.classList.add("js");
  var t = null;
  try { t = localStorage.getItem("rq_theme"); } catch (e) { /* storage blocked */ }
  if (!t) { try { var c = JSON.parse(localStorage.getItem("rq_cache") || "null"); t = c && c.settings && c.settings.theme && c.settings.theme.mode; } catch (e) { /* none */ } }
  if (t === "system") t = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  d.setAttribute("data-theme", t === "light" ? "light" : "dark");

  var LANGS = { ar: "rtl", en: "ltr", fa: "rtl", ur: "rtl", de: "ltr" };
  var lang = "", m = /[?&]lang=(ar|en|fa|ur|de)\b/.exec(location.search);
  if (m) { lang = m[1]; try { localStorage.setItem("rq_lang", lang); } catch (e) { /* storage blocked */ } }
  if (!lang) { try { lang = localStorage.getItem("rq_lang") || ""; } catch (e) { lang = ""; } }
  if (!LANGS[lang]) {
    var first = String((navigator.languages && navigator.languages[0]) || navigator.language || "").toLowerCase().split("-")[0];
    lang = first === "en" || first === "fa" || first === "ur" || first === "de" ? first : "ar";
  }
  window.RQ_LANG = lang;
  d.setAttribute("lang", lang);
  d.setAttribute("dir", LANGS[lang]);
  var extra = lang === "en" || lang === "de"
    ? "family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=IBM+Plex+Sans:wght@400;500;600"
    : lang === "ur" ? "family=Noto+Nastaliq+Urdu:wght@400;600;700" : "";
  if (extra) {
    var l = document.createElement("link");
    l.rel = "stylesheet"; l.media = "print"; l.setAttribute("data-fonts", "");
    l.href = "https://fonts.googleapis.com/css2?" + extra + "&display=swap";
    document.head.appendChild(l);
  }

  /* the opening screen (the Ruqayya logo):
     - already seen in this visit (and not set to show every time) → hidden before it paints,
       so later pages never flash it;
     - its logo starts rising the moment the picture has loaded, without waiting for the
       site's scripts; if the picture cannot load, the shop's name takes its place;
     - «تخطّي» works even while the site's scripts are still arriving. */
  var seen = null, ic = null;
  try { seen = sessionStorage.getItem("rq_intro"); } catch (e) { /* storage blocked */ }
  try { var cc = JSON.parse(localStorage.getItem("rq_cache") || "null"); ic = cc && cc.settings && cc.settings.intro; } catch (e) { /* none */ }
  if ((ic && ic.enabled === false) || (seen && !(ic && ic.every_visit))) d.classList.add("no-intro");
  var onLogo = function (e) {
    var t = e.target;
    if (!t || t.id !== "introLogo") return;
    document.removeEventListener("load", onLogo, true);
    document.removeEventListener("error", onLogo, true);
    if (e.type === "error") {
      t.parentNode.style.display = "none";
      var n = document.getElementById("introName");
      if (n) n.hidden = false;
      return;
    }
    t.setAttribute("data-at", String(Math.round(performance.now())));
    t.classList.add("in");
  };
  document.addEventListener("load", onLogo, true);
  document.addEventListener("error", onLogo, true);
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("#introSkip") : null, i = document.getElementById("intro");
    if (!b || !i || i.hasAttribute("data-live")) return;      // once the site is running, its own button handles it
    try { sessionStorage.setItem("rq_intro", "1"); } catch (er) { /* storage blocked */ }
    d.classList.add("no-intro");
  });

  var fonts = document.querySelectorAll("link[data-fonts]");
  for (var i = 0; i < fonts.length; i++) {
    (function (l) {
      var on = function () { l.media = "all"; };
      if (l.sheet) on(); else l.addEventListener("load", on);
    })(fonts[i]);
  }
})();
