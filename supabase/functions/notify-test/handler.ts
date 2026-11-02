// POST /functions/v1/notify-test   (dashboard button; the caller must be a signed-in admin)
import { type Env, env, json } from "../_shared/http.ts";
import { sendTelegram, telegramConfigured } from "../_shared/notify.ts";

export async function handler(req: Request, e: Env = env, f: typeof fetch = fetch): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: json(req, 204, null, e).headers });
  if (req.method !== "POST") return json(req, 405, { error: "method_not_allowed" }, e);
  const auth = req.headers.get("authorization") ?? "";
  const url = e.get("SUPABASE_URL"), pub = e.get("SB_PUBLISHABLE_KEY") ?? e.get("SUPABASE_ANON_KEY");
  if (!auth.startsWith("Bearer ") || !url || !pub) return json(req, 401, { error: "unauthorized" }, e);
  // ask the database whether this signed-in user is an admin (RLS-protected, uses the caller's own token)
  let isAdmin = false;
  try {
    const r = await f(`${url}/rest/v1/rpc/am_i_admin`, { method: "POST", headers: { apikey: pub, Authorization: auth, "Content-Type": "application/json" }, body: "{}", signal: AbortSignal.timeout(8_000) });
    isAdmin = r.ok && (await r.json()) === true;
  } catch { isAdmin = false; }
  if (!isAdmin) return json(req, 403, { error: "forbidden" }, e);
  if (!telegramConfigured(e)) return json(req, 200, { ok: false, error: "not_configured" }, e);
  const res = await sendTelegram("✅ رسالة تجريبية من لوحة تحكم معرض رقية — إشعارات الطلبات والرسائل تعمل.", e, f);
  return json(req, 200, res, e);
}
