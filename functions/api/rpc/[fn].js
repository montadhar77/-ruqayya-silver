/* Cloudflare Pages Function: GET /api/rpc/<fn>?...
   A cached, read-only window onto the storefront catalogue functions of the database.

   * Only the four public read functions are reachable, only with their known parameters.
   * Responses are kept in Cloudflare's edge cache: fresh for TTL seconds, then served
     "stale while revalidate" (the visitor gets the cached copy at once while one background
     request refreshes it). If the database is slow, paused or down, visitors keep seeing
     the last good catalogue for up to STALE_MAX seconds. Orders never go through here.
   * Environment (Pages project > Settings > Variables, per Production / Preview):
       SUPABASE_URL   https://<project-ref>.supabase.co
       SUPABASE_KEY   the publishable key (sb_publishable_…), public by design
   * Every response carries "x-rq-proxy: 1" so the site knows it reached this proxy, and
     "x-rq-cache: HIT | STALE | MISS" for monitoring.
   Note: Cloudflare's Cache API takes effect on a custom domain; on *.pages.dev it is a no-op
   (requests still work, uncached). */

const PARAMS = {
  catalog_home: ["p_limit"],
  list_products: ["p_category", "p_sort", "p_limit", "p_offset"],
  search_products: ["p_q", "p_limit", "p_offset"],
  product_page: ["p_id"],
};
const TTL = { catalog_home: 60, list_products: 60, search_products: 30, product_page: 60 };
const STALE_MAX = 24 * 3600;

const json = (status, body, extra = {}) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "x-rq-proxy": "1", "cache-control": "no-store", ...extra },
  });

export async function onRequestGet(ctx) {
  const { request, params, env } = ctx;
  const fn = String(params.fn || "");
  const allowed = PARAMS[fn];
  if (!allowed) return json(404, { message: "not_found" });
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return json(503, { message: "proxy_not_configured" });

  // canonical query: known parameters only, fixed order, bounded length (one cache entry per real request)
  const url = new URL(request.url);
  const qs = new URLSearchParams();
  for (const k of allowed) {
    const v = url.searchParams.get(k);
    if (v !== null && v !== "") {
      if (v.length > 120) return json(400, { message: "parameter_too_long" });
      qs.set(k, v);
    }
  }
  const query = qs.toString();
  const cacheKey = new Request(`${url.origin}/api/rpc/${fn}${query ? "?" + query : ""}`);
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const ttl = Number(env.RQ_TTL_SECONDS) || TTL[fn];   // override only for tests

  const fetchUpstream = async () => {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}${query ? "?" + query : ""}`, {
      headers: { apikey: env.SUPABASE_KEY, accept: "application/json" },
    });
    const body = await r.text();
    return { status: r.status, body };
  };
  const store = (body) => {
    if (!cache) return Promise.resolve();
    return cache.put(cacheKey, new Response(body, {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": `public, max-age=${STALE_MAX}`, "x-rq-stored": String(Date.now()) },
    }));
  };
  const visitorHeaders = (state) => ({ "cache-control": `public, max-age=${ttl}`, "x-rq-cache": state });

  const hit = cache ? await cache.match(cacheKey) : null;
  if (hit) {
    const age = (Date.now() - Number(hit.headers.get("x-rq-stored") || 0)) / 1000;
    const body = await hit.text();
    if (age < ttl) return json(200, body, visitorHeaders("HIT"));
    // stale: answer now, refresh in the background
    ctx.waitUntil(fetchUpstream().then((u) => (u.status === 200 ? store(u.body) : null)).catch(() => null));
    return json(200, body, visitorHeaders("STALE"));
  }

  let u;
  try { u = await fetchUpstream(); } catch (e) { return json(502, { message: "upstream_unreachable" }); }
  if (u.status !== 200) return json(u.status >= 500 ? 502 : u.status, u.body);
  ctx.waitUntil(store(u.body));
  return json(200, u.body, visitorHeaders("MISS"));
}

export function onRequest(ctx) {
  if (ctx.request.method === "GET" || ctx.request.method === "HEAD") return onRequestGet(ctx);
  return json(405, { message: "method_not_allowed" }, { allow: "GET" });
}
