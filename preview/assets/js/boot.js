/* Runs first, before the page paints (kept out of the HTML so the Content Security
   Policy can forbid inline scripts):
   - marks the page as script-enabled (animations start hidden, then reveal)
   - applies the saved light/dark choice so the page never flashes the wrong theme
   - picks the language (?lang=…, then the visitor's earlier choice, then the device
     language: English, Urdu or German, otherwise Arabic) and sets the page direction
   - switches the web fonts on once their stylesheet has loaded (non-blocking) */
(function () {
  var d = document.documentElement;
  d.classList.add("js");
  var t = null;
  try { t = localStorage.getItem("rq_theme"); } catch (e) { /* storage blocked */ }
  if (!t) { try { var c = JSON.parse(localStorage.getItem("rq_cache") || "null"); t = c && c.settings && c.settings.theme && c.settings.theme.mode; } catch (e) { /* none */ } }
  if (t === "system") t = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  d.setAttribute("data-theme", t === "light" ? "light" : "dark");

  var LANGS = { ar: "rtl", en: "ltr", ur: "rtl", de: "ltr" };
  var lang = "", m = /[?&]lang=(ar|en|ur|de)\b/.exec(location.search);
  if (m) { lang = m[1]; try { localStorage.setItem("rq_lang", lang); } catch (e) { /* storage blocked */ } }
  if (!lang) { try { lang = localStorage.getItem("rq_lang") || ""; } catch (e) { lang = ""; } }
  if (!LANGS[lang]) {
    var first = String((navigator.languages && navigator.languages[0]) || navigator.language || "").toLowerCase().split("-")[0];
    lang = first === "en" || first === "ur" || first === "de" ? first : "ar";
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

  var fonts = document.querySelectorAll("link[data-fonts]");
  for (var i = 0; i < fonts.length; i++) {
    (function (l) {
      var on = function () { l.media = "all"; };
      if (l.sheet) on(); else l.addEventListener("load", on);
    })(fonts[i]);
  }
})();
