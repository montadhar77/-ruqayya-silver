// POST /functions/v1/submit-inquiry   { name, phone, body, turnstile, website } -> { ok: true }
import { background, clientIp, type Env, env, json, originAllowed, readJson } from "../_shared/http.ts";
import { rpc } from "../_shared/db.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";
import { notifyInquiry } from "../_shared/notify.ts";

export async function handler(req: Request, e: Env = env, f: typeof fetch = fetch): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: json(req, 204, null, e).headers });
  if (req.method !== "POST") return json(req, 405, { error: "method_not_allowed" }, e);
  if (!originAllowed(req, e)) return json(req, 403, { error: "origin_not_allowed" }, e);
  const b = await readJson(req, 16_384);
  if (!b) return json(req, 400, { error: "invalid_request" }, e);
  if (typeof b.website === "string" && b.website.trim() !== "") return json(req, 400, { error: "rejected" }, e);
  const name = typeof b.name === "string" ? b.name.trim().slice(0, 120) : "";
  const phone = typeof b.phone === "string" ? b.phone.trim().slice(0, 40) : "";
  const text = typeof b.body === "string" ? b.body.trim().slice(0, 3000) : "";
  if (name.length < 2 || text.length < 2) return json(req, 400, { error: "invalid_inquiry" }, e);
  const ip = clientIp(req);
  const human = await verifyTurnstile(b.turnstile, ip, e, f);
  if (!human.ok) return json(req, 403, { error: "captcha_failed", codes: human.codes }, e);
  const r = await rpc("submit_inquiry", { p_name: name, p_phone: phone, p_body: text, p_ip: ip }, e, f);
  if (!r.ok) {
    if (r.message.includes("rate_limited")) return json(req, 429, { error: "rate_limited" }, e, { "Retry-After": "600" });
    if (r.message.includes("invalid_inquiry")) return json(req, 400, { error: "invalid_inquiry" }, e);
    console.error("submit-inquiry failed", r.status, r.code, r.message.slice(0, 200));
    return json(req, 502, { error: "failed" }, e);
  }
  const id = (r.data as { id?: string } | null)?.id;
  if (id) background(notifyInquiry({ name, phone, body: text }, e, f, id));
  return json(req, 200, { ok: true }, e);
}
