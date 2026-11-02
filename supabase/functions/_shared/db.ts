// Calls the shop's database functions through the Supabase REST API with the
// server-side key. The key never leaves the Edge Function.
import { type Env, env } from "./http.ts";

export type RpcResult = { ok: true; data: unknown } | { ok: false; status: number; code: string; message: string };

export async function rpc(fn: string, args: Record<string, unknown>, e: Env = env, f: typeof fetch = fetch): Promise<RpcResult> {
  const url = e.get("SUPABASE_URL");
  const key = e.get("SB_SECRET_KEY") ?? e.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return { ok: false, status: 500, code: "config", message: "server_not_configured" };
  const headers: Record<string, string> = { "Content-Type": "application/json", apikey: key };
  if (key.split(".").length === 3) headers.Authorization = `Bearer ${key}`;   // legacy JWT service key
  let r: Response;
  try {
    r = await f(`${url}/rest/v1/rpc/${fn}`, { method: "POST", headers, body: JSON.stringify(args), signal: AbortSignal.timeout(10_000) });
  } catch (err) {
    return { ok: false, status: 503, code: "network", message: String(err) };
  }
  const text = await r.text();
  let body: Record<string, unknown> | null = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  if (r.ok) return { ok: true, data: body };
  return { ok: false, status: r.status, code: String(body?.code ?? r.status), message: String(body?.message ?? r.statusText) };
}
