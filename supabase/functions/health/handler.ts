// GET /functions/v1/health — for uptime monitors. Checks that the database answers
// through the public API (no secrets used, no customer data returned).
import { type Env, env, json } from "../_shared/http.ts";

export async function handler(req: Request, e: Env = env, f: typeof fetch = fetch): Promise<Response> {
  const url = e.get("SUPABASE_URL"), pub = e.get("SB_PUBLISHABLE_KEY") ?? e.get("SUPABASE_ANON_KEY");
  const t0 = Date.now();
  let db = false, status = 0;
  if (url && pub) {
    try {
      const r = await f(`${url}/rest/v1/settings?select=id&limit=1`, { headers: { apikey: pub }, signal: AbortSignal.timeout(5_000) });
      status = r.status;
      db = r.ok && Array.isArray(await r.json());
    } catch { db = false; }
  }
  const body = { ok: db, db, db_status: status, db_ms: Date.now() - t0, time: new Date().toISOString() };
  return json(req, db ? 200 : 503, body, e, { "Access-Control-Allow-Origin": "*" });
}
