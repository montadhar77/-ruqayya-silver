// POST /functions/v1/notify-retry   (called every minute by pg_cron, header x-cron-secret)
// Sends every alert that is still unconfirmed. See supabase/scheduled/notify_cron.sql.
import { type Env, env, json } from "../_shared/http.ts";
import { flushPending } from "../_shared/notify.ts";

function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function handler(req: Request, e: Env = env, f: typeof fetch = fetch): Promise<Response> {
  const secret = e.get("CRON_SECRET") ?? "";
  if (secret.length < 16 || !same(req.headers.get("x-cron-secret") ?? "", secret)) return json(req, 401, { error: "unauthorized" }, e);
  let sent = 0, failed = 0;
  for (let round = 0; round < 5; round++) {          // up to 100 alerts per run
    const r = await flushPending(e, f, 20);
    sent += r.sent; failed += r.failed;
    if (r.sent + r.failed < 20) break;
  }
  return json(req, 200, { sent, failed }, e);
}
