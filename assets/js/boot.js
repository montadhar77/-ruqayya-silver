/* Runs first, before the page paints (kept out of the HTML so the Content Security
   Policy can forbid inline scripts):
   - marks the page as script-enabled (animations start hidden, then reveal)
   - applies the saved light/dark choice so the page never flashes the wrong theme
   - switches the web fonts on once their stylesheet has loaded (non-blocking) */
(function () {
  var d = document.documentElement;
  d.classList.add("js");
  var t = null;
  try { t = localStorage.getItem("rq_theme"); } catch (e) { /* storage blocked */ }
  if (!t) { try { var c = JSON.parse(localStorage.getItem("rq_cache") || "null"); t = c && c.settings && c.settings.theme && c.settings.theme.mode; } catch (e) { /* none */ } }
  if (t === "system") t = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  d.setAttribute("data-theme", t === "light" ? "light" : "dark");
  var fonts = document.querySelectorAll("link[data-fonts]");
  for (var i = 0; i < fonts.length; i++) {
    (function (l) {
      var on = function () { l.media = "all"; };
      if (l.sheet) on(); else l.addEventListener("load", on);
    })(fonts[i]);
  }
})();
