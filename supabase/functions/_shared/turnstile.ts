// Cloudflare Turnstile server-side check. Without TURNSTILE_SECRET the check is
// skipped (honeypot + database rate limits still apply) — set it in production.
import { type Env, env } from "./http.ts";

export type Verdict = { ok: boolean; skipped?: boolean; degraded?: boolean; codes?: string[] };

export async function verifyTurnstile(token: unknown, ip: string, e: Env = env, f: typeof fetch = fetch): Promise<Verdict> {
  const secret = e.get("TURNSTILE_SECRET");
  if (!secret) return { ok: true, skipped: true };
  if (typeof token !== "string" || token.length < 10 || token.length > 2048) return { ok: false, codes: ["missing-input-response"] };
  const url = e.get("TURNSTILE_VERIFY_URL") ?? "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set("remoteip", ip);
  try {
    const r = await f(url, { method: "POST", body: form, signal: AbortSignal.timeout(6_000) });
    const v = await r.json();
    return { ok: v.success === true, codes: v["error-codes"] ?? [] };
  } catch {
    // Cloudflare unreachable from the function: by default let the order through
    // (rate limits still apply) rather than lose real customers. TURNSTILE_FAIL_OPEN=0 to refuse.
    const open = (e.get("TURNSTILE_FAIL_OPEN") ?? "1") !== "0";
    console.warn("turnstile: verify endpoint unreachable", open ? "(allowed)" : "(refused)");
    return { ok: open, degraded: open, codes: ["verify-unreachable"] };
  }
}
