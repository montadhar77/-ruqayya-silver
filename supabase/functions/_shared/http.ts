// Small HTTP helpers shared by the Edge Functions (no third-party imports).

export type Env = { get(name: string): string | undefined };
export const env: Env = { get: (n) => Deno.env.get(n) };

/** CORS: only the shop's own sites may call these functions from a browser. */
export function corsHeaders(req: Request, e: Env = env): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = (e.get("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ok = allowed.length === 0 || allowed.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? (origin || "*") : "null",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin",
  };
}

export function originAllowed(req: Request, e: Env = env): boolean {
  const allowed = (e.get("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.get("origin");
  return allowed.length === 0 || origin === null || allowed.includes(origin);
}

export function json(req: Request, status: number, body: unknown, e: Env = env, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...corsHeaders(req, e), ...extra },
  });
}

/** The visitor's address as reported by the platform's edge proxy. */
export function clientIp(req: Request): string {
  const h = req.headers;
  const ip = h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? (h.get("x-forwarded-for") ?? "").split(",")[0];
  return (ip ?? "").trim().slice(0, 64);
}

/** Read a JSON body of at most `limit` bytes. */
export async function readJson(req: Request, limit = 32_768): Promise<Record<string, unknown> | null> {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > limit) return null;
  const text = await req.text();
  if (text.length > limit) return null;
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Background work that must not delay the visitor's answer. */
export function background(p: Promise<unknown>): void {
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt && typeof rt.waitUntil === "function") rt.waitUntil(p.catch(() => {}));
  else p.catch(() => {});
}
