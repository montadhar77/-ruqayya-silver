// Unit tests for the Edge Functions with a fake network (no Supabase, no Cloudflare, no Telegram).
//   deno test --allow-env supabase/functions/
import { handler as submitOrder } from "../submit-order/handler.ts";
import { handler as submitInquiry } from "../submit-inquiry/handler.ts";
import { handler as notifyRetry } from "../notify-retry/handler.ts";
import { handler as notifyTest } from "../notify-test/handler.ts";
import { handler as health } from "../health/handler.ts";
import { formatInquiry, formatOrder } from "./notify.ts";
import type { Env } from "./http.ts";

function assert(cond: unknown, msg = "assertion failed"): asserts cond {
  if (!cond) throw new Error(msg);
}
function eq(a: unknown, b: unknown) {
  const x = JSON.stringify(a), y = JSON.stringify(b);
  if (x !== y) throw new Error(`expected ${y}\n     got ${x}`);
}

const BASE: Record<string, string> = {
  SUPABASE_URL: "https://db.test", SB_SECRET_KEY: "sb_secret_test", SB_PUBLISHABLE_KEY: "sb_publishable_test",
  TURNSTILE_SECRET: "ts-secret", TELEGRAM_BOT_TOKEN: "123:abc", TELEGRAM_CHAT_ID: "42", CRON_SECRET: "cron-secret-0123456789",
};
const mkEnv = (over: Record<string, string | undefined> = {}): Env => ({ get: (n) => (n in over ? over[n] : BASE[n]) });

type Call = { url: string; body: any; headers: Headers };
const ORDER = { order_no: 1001, subtotal: 240000, delivery: 5000, total: 245000, items: [{ id: "x", name: "خاتم", price: 240000, qty: 1 }], duplicate: false };

/** Fake network: answers by URL; records every call. */
function net(answers: Record<string, (body: any) => [number, unknown]>) {
  const calls: Call[] = [];
  const f = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const raw = init?.body;
    const body = raw instanceof URLSearchParams ? Object.fromEntries(raw) : raw ? JSON.parse(String(raw)) : null;
    calls.push({ url, body, headers: new Headers(init?.headers) });
    const key = Object.keys(answers).find((k) => url.includes(k));
    if (!key) return new Response("{}", { status: 404 });
    const [status, out] = answers[key](body);
    return new Response(JSON.stringify(out), { status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  return { f, calls, hit: (part: string) => calls.filter((c) => c.url.includes(part)) };
}
const happy = () => ({
  "/rpc/order_by_key": () => [200, null] as [number, unknown],
  "siteverify": (b: any) => [200, { success: b.response === "good-token-123" }] as [number, unknown],
  "/rpc/submit_order": () => [200, ORDER] as [number, unknown],
  "/rpc/claim_notification": () => [200, { send: true, payload: { order_no: 1001, customer_name: "زبون", phone: "0770", city: "كربلاء", items: ORDER.items, delivery: 5000, total: 245000 } }] as [number, unknown],
  "/rpc/finish_notification": () => [200, null] as [number, unknown],
  "api.telegram.org": () => [200, { ok: true }] as [number, unknown],
});
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://fn.test/${path}`, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.9, 10.0.0.1", ...headers } });
const tick = () => new Promise((r) => setTimeout(r, 20));
const goodOrder = { customer: { name: "زبون", phone: "07700000001", city: "كربلاء" }, items: [{ id: "6c96ae41-cd0b-40d5-bb79-79e309025b72", qty: 1 }], key: "1b4e28ba-2fa1-41d2-883f-0016d3cca427", turnstile: "good-token-123" };

Deno.test("submit-order: happy path sends to the database with the visitor IP, then alerts", async () => {
  const n = net(happy());
  const r = await submitOrder(post("submit-order", goodOrder), mkEnv(), n.f);
  eq(r.status, 200);
  eq((await r.json()).order_no, 1001);
  const call = n.hit("/rpc/submit_order")[0];
  eq(call.body.p_ip, "203.0.113.9");
  eq(call.body.p_idempotency_key, goodOrder.key);
  eq(call.headers.get("apikey"), "sb_secret_test");
  assert(!call.headers.get("authorization"), "non-JWT secret key must not be sent as Bearer");
  eq(n.hit("siteverify")[0].body.remoteip, "203.0.113.9");
  await tick();
  eq(n.hit("api.telegram.org").length, 1);
  eq(n.hit("/rpc/finish_notification")[0].body.p_ok, true);
});

Deno.test("submit-order: honeypot filled -> rejected before anything else", async () => {
  const n = net(happy());
  const r = await submitOrder(post("submit-order", { ...goodOrder, website: "http://spam" }), mkEnv(), n.f);
  eq(r.status, 400);
  eq(n.calls.length, 0);
});

Deno.test("submit-order: bad Turnstile token -> 403, no order", async () => {
  const n = net(happy());
  const r = await submitOrder(post("submit-order", { ...goodOrder, turnstile: "forged-token-xyz" }), mkEnv(), n.f);
  eq(r.status, 403);
  eq(n.hit("/rpc/submit_order").length, 0);
});

Deno.test("submit-order: missing Turnstile token -> 403", async () => {
  const n = net(happy());
  const { turnstile: _t, ...noToken } = goodOrder;
  eq((await submitOrder(post("submit-order", noToken), mkEnv(), n.f)).status, 403);
});

Deno.test("submit-order: replay of a saved checkout skips Turnstile and does not alert twice", async () => {
  const n = net({ ...happy(), "/rpc/order_by_key": () => [200, { ...ORDER, duplicate: true }] });
  const r = await submitOrder(post("submit-order", { ...goodOrder, turnstile: "already-used" }), mkEnv(), n.f);
  eq(r.status, 200);
  eq((await r.json()).duplicate, true);
  eq(n.hit("siteverify").length + n.hit("/rpc/submit_order").length, 0);
  await tick();
  eq(n.hit("api.telegram.org").length, 0);
});

Deno.test("submit-order: database errors map to clear statuses", async () => {
  for (const [msg, status] of [["rate_limited", 429], ["out_of_stock", 409], ["invalid_phone", 400], ["boom", 502]] as const) {
    const n = net({ ...happy(), "/rpc/submit_order": () => [400, { code: "P0001", message: msg }] });
    const r = await submitOrder(post("submit-order", goodOrder), mkEnv(), n.f);
    eq(r.status, status);
    if (status === 429) eq(r.headers.get("retry-after"), "600");
  }
});

Deno.test("submit-order: Telegram down does not fail the order", async () => {
  const n = net({ ...happy(), "api.telegram.org": () => [502, { ok: false }] });
  const r = await submitOrder(post("submit-order", goodOrder), mkEnv(), n.f);
  eq(r.status, 200);
  await tick();
  const fin = n.hit("/rpc/finish_notification")[0].body;
  eq(fin.p_ok, false);
  assert(String(fin.p_error).startsWith("telegram_502"));
});

Deno.test("submit-order: Cloudflare unreachable -> allowed by default, refused when fail-open is off", async () => {
  const down = () => { throw new Error("unreachable"); };
  const n1 = net({ ...happy(), "siteverify": down as any });
  eq((await submitOrder(post("submit-order", goodOrder), mkEnv(), n1.f)).status, 200);
  const n2 = net({ ...happy(), "siteverify": down as any });
  eq((await submitOrder(post("submit-order", goodOrder), mkEnv({ TURNSTILE_FAIL_OPEN: "0" }), n2.f)).status, 403);
});

Deno.test("submit-order: oversized or malformed bodies are refused", async () => {
  const n = net(happy());
  const big = new Request("https://fn.test/x", { method: "POST", body: "x".repeat(40_000) });
  eq((await submitOrder(big, mkEnv(), n.f)).status, 400);
  eq((await submitOrder(new Request("https://fn.test/x", { method: "POST", body: "[1,2]" }), mkEnv(), n.f)).status, 400);
  eq((await submitOrder(post("submit-order", { ...goodOrder, items: [] }), mkEnv(), n.f)).status, 400);
  eq((await submitOrder(new Request("https://fn.test/x", { method: "GET" }), mkEnv(), n.f)).status, 405);
  eq(n.calls.length, 0);
});

Deno.test("submit-order: other websites cannot call it from a browser", async () => {
  const n = net(happy());
  const e = mkEnv({ ALLOWED_ORIGINS: "https://ruqayya.example" });
  eq((await submitOrder(post("submit-order", goodOrder, { origin: "https://evil.example" }), e, n.f)).status, 403);
  const ok = await submitOrder(post("submit-order", goodOrder, { origin: "https://ruqayya.example" }), e, n.f);
  eq(ok.status, 200);
  eq(ok.headers.get("access-control-allow-origin"), "https://ruqayya.example");
});

Deno.test("submit-inquiry: validates, checks Turnstile, alerts with the new id", async () => {
  const n = net({ ...happy(), "/rpc/submit_inquiry": () => [200, { ok: true, id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" }],
    "/rpc/claim_notification": () => [200, { send: true, payload: { name: "زائر", phone: "", body: "سؤال" } }] });
  const r = await submitInquiry(post("submit-inquiry", { name: "زائر", phone: "", body: "سؤال", turnstile: "good-token-123" }), mkEnv(), n.f);
  eq(r.status, 200);
  await tick();
  eq(n.hit("/rpc/claim_notification")[0].body, { p_kind: "inquiry", p_ref: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" });
  eq((await submitInquiry(post("submit-inquiry", { name: "ز", body: "سؤال", turnstile: "good-token-123" }), mkEnv(), n.f)).status, 400);
  eq((await submitInquiry(post("submit-inquiry", { name: "زائر", body: "سؤال", turnstile: "bad-token-0000" }), mkEnv(), n.f)).status, 403);
  eq((await submitInquiry(post("submit-inquiry", { name: "زائر", body: "سؤال", website: "x" }), mkEnv(), n.f)).status, 400);
});

Deno.test("notify-retry: needs the cron secret; sends what the database hands out", async () => {
  const pending = [{ kind: "order", ref: "1001", payload: { order_no: 1001, customer_name: "زبون", phone: "0770", city: "كربلاء", items: [], total: 1 } },
                   { kind: "inquiry", ref: "abc", payload: { name: "زائر", phone: "", body: "سؤال" } }];
  const n = net({ ...happy(), "/rpc/claim_pending_notifications": () => [200, pending] });
  eq((await notifyRetry(post("notify-retry", {}), mkEnv(), n.f)).status, 401);
  eq((await notifyRetry(post("notify-retry", {}, { "x-cron-secret": "wrong-secret-0123456" }), mkEnv(), n.f)).status, 401);
  const r = await notifyRetry(post("notify-retry", {}, { "x-cron-secret": BASE.CRON_SECRET }), mkEnv(), n.f);
  eq(await r.json(), { sent: 2, failed: 0 });
  eq(n.hit("api.telegram.org").length, 2);
});

Deno.test("notify-retry: without Telegram configured nothing is claimed (alerts wait)", async () => {
  const n = net({ ...happy(), "/rpc/claim_pending_notifications": () => [200, []] });
  const r = await notifyRetry(post("notify-retry", {}, { "x-cron-secret": BASE.CRON_SECRET }), mkEnv({ TELEGRAM_BOT_TOKEN: undefined }), n.f);
  eq(await r.json(), { sent: 0, failed: 0 });
  eq(n.calls.length, 0);
});

Deno.test("notify-test: admins only", async () => {
  const n = net({ ...happy(), "/rpc/am_i_admin": (_b) => [200, false] });
  eq((await notifyTest(post("notify-test", {}), mkEnv(), n.f)).status, 401);
  eq((await notifyTest(post("notify-test", {}, { authorization: "Bearer user.jwt.token" }), mkEnv(), n.f)).status, 403);
  const n2 = net({ ...happy(), "/rpc/am_i_admin": () => [200, true] });
  const r = await notifyTest(post("notify-test", {}, { authorization: "Bearer admin.jwt.token" }), mkEnv(), n2.f);
  eq(await r.json(), { ok: true });
  eq(n2.hit("/rpc/am_i_admin")[0].headers.get("authorization"), "Bearer admin.jwt.token");
});

Deno.test("health: 200 when the database answers, 503 when not", async () => {
  const up = net({ "/rest/v1/settings": () => [200, [{ id: 1 }]] });
  eq((await health(new Request("https://fn.test/health"), mkEnv(), up.f)).status, 200);
  const down = net({ "/rest/v1/settings": () => [503, { message: "down" }] });
  eq((await health(new Request("https://fn.test/health"), mkEnv(), down.f)).status, 503);
});

Deno.test("message formats", () => {
  const t = formatOrder({ order_no: 1001, customer_name: "علي", phone: "0770", city: "كربلاء", address: "حي الحسين", notes: "",
    items: [{ name: "خاتم", qty: 2, price: 100000 }], delivery: 5000, total: 205000, currency: "د.ع" });
  assert(t.includes("#1001") && t.includes("• خاتم × 2 — 200,000 د.ع") && t.includes("الإجمالي: 205,000 د.ع"), t);
  assert(!t.includes("ملاحظات"), t);
  const intl = formatOrder({ order_no: 7, customer_name: "Sara", phone: "+49", country: "ألمانيا", city: "Berlin", items: [], total: 1, delivery: 0, shipping_tbd: true, international: true });
  assert(intl.includes("الدولة: ألمانيا — Berlin") && intl.includes("يُحدَّد مع الزبون") && intl.includes("+ الشحن"), intl);
  assert(formatInquiry({ name: "زائر", phone: "", body: "سؤال" }).endsWith("سؤال"));
});
