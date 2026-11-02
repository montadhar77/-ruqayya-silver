// POST /functions/v1/submit-order
// { customer, items, key, turnstile, website }  ->  the order (same shape as place_order)
// Order of checks: size/shape -> honeypot -> replay of a saved checkout -> Turnstile
// -> database (validation, rate limits, atomic stock) -> notification in the background.
import { background, clientIp, type Env, env, json, originAllowed, readJson, UUID_RE } from "../_shared/http.ts";
import { rpc } from "../_shared/db.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";
import { notifyOrder } from "../_shared/notify.ts";

const STATUS: Record<string, number> = {
  rate_limited: 429, out_of_stock: 409, product_unavailable: 409,
  invalid_name: 400, invalid_phone: 400, invalid_items: 400,
};

export async function handler(req: Request, e: Env = env, f: typeof fetch = fetch): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: json(req, 204, null, e).headers });
  if (req.method !== "POST") return json(req, 405, { error: "method_not_allowed" }, e);
  if (!originAllowed(req, e)) return json(req, 403, { error: "origin_not_allowed" }, e);
  const body = await readJson(req);
  if (!body) return json(req, 400, { error: "invalid_request" }, e);
  const { customer, items, key, turnstile, website } = body as Record<string, unknown>;
  if (typeof website === "string" && website.trim() !== "") return json(req, 400, { error: "rejected" }, e);   // honeypot
  if (!customer || typeof customer !== "object" || Array.isArray(customer)) return json(req, 400, { error: "invalid_name" }, e);
  if (!Array.isArray(items) || items.length === 0 || items.length > 40) return json(req, 400, { error: "invalid_items" }, e);
  const k = typeof key === "string" && UUID_RE.test(key) ? key : null;
  const ip = clientIp(req);

  // the same checkout sent again (lost reply, double tap): answer with the saved order, no new check needed
  if (k) {
    const prev = await rpc("order_by_key", { p_idempotency_key: k }, e, f);
    if (prev.ok && prev.data) return json(req, 200, prev.data, e);
  }

  const human = await verifyTurnstile(turnstile, ip, e, f);
  if (!human.ok) return json(req, 403, { error: "captcha_failed", codes: human.codes }, e);

  const c = customer as Record<string, unknown>;
  const clean = Object.fromEntries(["name", "phone", "country", "city", "address", "notes"]
    .map((n) => [n, typeof c[n] === "string" ? (c[n] as string).slice(0, 1000) : ""]));
  const lines = items.map((it) => {
    const o = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
    return { id: String(o.id ?? ""), qty: Number.isFinite(Number(o.qty)) ? Math.trunc(Number(o.qty)) : 1 };
  });
  const r = await rpc("submit_order", { p_customer: clean, p_items: lines, p_idempotency_key: k, p_ip: ip }, e, f);
  if (!r.ok) {
    const code = Object.keys(STATUS).find((c) => r.message.includes(c));
    if (code) return json(req, STATUS[code], { error: code }, e, code === "rate_limited" ? { "Retry-After": "600" } : {});
    console.error("submit-order failed", r.status, r.code, r.message.slice(0, 200));
    return json(req, 502, { error: "failed" }, e);
  }
  const order = r.data as Record<string, unknown>;
  if (!order.duplicate) background(notifyOrder(order, clean, e, f));
  return json(req, 200, order, e);
}
