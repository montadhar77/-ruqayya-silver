/* Backend connection, chosen per environment.
   Publishable keys are public by design (safe in the browser); every write is
   protected by row level security and server-side functions on the database.

   Which backend is used:
     ?backend=local | staging | production   (remembered for this browser tab)
     otherwise preview builds (*.pages.dev that are not the production branch) -> staging
     otherwise production.
   An environment that is not configured yet (empty url) falls back to production. */
(function () {
  var ENVS = {
    production: {
      url: "https://hnkjmthvgfknwdnehegr.supabase.co",
      key: "sb_publishable_YgvUQg0IkR5E-CMltuep4w_UWnqeBYZ",
      bucket: "media",
      // "rpc": orders go straight to the place_order() database function (current live setup)
      // "edge": orders go through the submit-order Edge Function (anti-spam + Turnstile)
      gateway: "rpc",
      turnstile: ""            // Cloudflare Turnstile site key, once created
    },
    staging: {
      url: "https://rlivlqddrzdrmfqeqnox.supabase.co",   // project ruqayya-silver-staging (test data only)
      key: "sb_publishable_CWQvpPIHvPCWA84zMU_42Q_jn6grQZS",
      bucket: "media",
      gateway: "edge",
      turnstile: "1x00000000000000000000AA"   // Cloudflare's public always-pass test key
    },
    local: {
      url: "http://127.0.0.1:54331",          // tests/e2e/stack.py
      key: "local-publishable-key",
      bucket: "media",
      gateway: "edge",
      turnstile: ""
    }
  };
  var PRODUCTION_HOSTS = [];   // e.g. "ruqayya-silver.pages.dev", custom domain — see docs/DEPLOY.md

  var name = "production";
  try {
    var m = /[?&]backend=(local|staging|production)\b/.exec(location.search);
    if (m) sessionStorage.setItem("rq_backend", m[1]);
    name = (m && m[1]) || sessionStorage.getItem("rq_backend") || "";
  } catch (e) { name = ""; }
  if (!name) {
    var h = location.hostname;
    name = /\.pages\.dev$/.test(h) && PRODUCTION_HOSTS.indexOf(h) < 0 ? "staging" : "production";
  }
  if (!ENVS[name] || !ENVS[name].url) name = "production";
  var c = ENVS[name], out = { env: name };
  for (var k in c) out[k] = c[k];
  window.RQ_CONFIG = out;
})();
