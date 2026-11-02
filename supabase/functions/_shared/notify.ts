// Telegram notifications for new orders and messages.
// Delivery is at-least-once: the database hands out each notification (claim),
// we send it, then record the result (finish). Anything not confirmed is picked
// up again by notify-retry (run every minute by pg_cron), so a Telegram outage
// or a crashed function never loses an order alert.
import { type Env, env } from "./http.ts";
import { rpc } from "./db.ts";

type Payload = Record<string, unknown>;
const num = (n: unknown) => Number(n ?? 0).toLocaleString("en-US");

export function telegramConfigured(e: Env = env): boolean {
  return !!(e.get("TELEGRAM_BOT_TOKEN") && e.get("TELEGRAM_CHAT_ID"));
}

export async function sendTelegram(text: string, e: Env = env, f: typeof fetch = fetch): Promise<{ ok: boolean; error?: string }> {
  const token = e.get("TELEGRAM_BOT_TOKEN"), chat = e.get("TELEGRAM_CHAT_ID");
  if (!token || !chat) return { ok: false, error: "not_configured" };
  const api = e.get("TELEGRAM_API") ?? "https://api.telegram.org";
  try {
    const r = await f(`${api}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: text.slice(0, 4000), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8_000),
    });
    if (r.ok) return { ok: true };
    const body = await r.text();
    return { ok: false, error: `telegram_${r.status}: ${body.slice(0, 160)}` };
  } catch (err) {
    return { ok: false, error: `network: ${String(err).slice(0, 160)}` };
  }
}

export function formatOrder(p: Payload): string {
  const cur = String(p.currency ?? "د.ع");
  const intl = !!p.international;
  const items = Array.isArray(p.items) ? p.items as Payload[] : [];
  const lines = [
    `🛍️ طلب جديد #${p.order_no}`,
    `الاسم: ${p.customer_name}`,
    `الهاتف: ${p.phone}`,
    intl ? `الدولة: ${p.country} — ${p.city}` : `المحافظة: ${p.city}`,
    p.address ? `العنوان: ${p.address}` : "",
    "",
    "المنتجات:",
    ...items.map((i) => `• ${i.name} × ${i.qty} — ${num(Number(i.price) * Number(i.qty))} ${cur}`),
    "",
    `${intl ? "الشحن الدولي" : "التوصيل"}: ${p.shipping_tbd ? "يُحدَّد مع الزبون" : Number(p.delivery) ? `${num(p.delivery)} ${cur}` : "مجاني"}`,
    `الإجمالي: ${num(p.total)} ${cur}${p.shipping_tbd ? " + الشحن" : ""}`,
    p.notes ? `ملاحظات: ${p.notes}` : "",
  ];
  return lines.filter((l, i) => l !== "" || (i > 0 && lines[i - 1] !== "")).join("\n").trim();
}

export function formatInquiry(p: Payload): string {
  return [`✉️ رسالة جديدة من الموقع`, `الاسم: ${p.name}`, p.phone ? `الهاتف: ${p.phone}` : "", "", String(p.body ?? "")]
    .filter((l, i) => l !== "" || i === 3).join("\n");
}

async function deliver(kind: "order" | "inquiry", ref: string, e: Env, f: typeof fetch): Promise<boolean> {
  if (!telegramConfigured(e)) return false;
  const claim = await rpc("claim_notification", { p_kind: kind, p_ref: ref }, e, f);
  const c = claim.ok ? claim.data as { send?: boolean; payload?: Payload } | null : null;
  if (!c?.send || !c.payload) return false;
  const res = await sendTelegram(kind === "order" ? formatOrder(c.payload) : formatInquiry(c.payload), e, f);
  await rpc("finish_notification", { p_kind: kind, p_ref: ref, p_ok: res.ok, p_error: res.error ?? "" }, e, f);
  return res.ok;
}

export function notifyOrder(order: Payload, _customer: Payload, e: Env = env, f: typeof fetch = fetch): Promise<boolean> {
  return deliver("order", String(order.order_no), e, f);
}

export async function notifyInquiry(_p: Payload, e: Env = env, f: typeof fetch = fetch, ref?: string): Promise<boolean> {
  return ref ? deliver("inquiry", ref, e, f) : false;   // inquiries are delivered by notify-retry within a minute
}

/** Send everything still pending (used by notify-retry). */
export async function flushPending(e: Env = env, f: typeof fetch = fetch, limit = 20): Promise<{ sent: number; failed: number }> {
  if (!telegramConfigured(e)) return { sent: 0, failed: 0 };
  const claim = await rpc("claim_pending_notifications", { p_limit: limit }, e, f);
  const list = claim.ok && Array.isArray(claim.data) ? claim.data as { kind: "order" | "inquiry"; ref: string; payload: Payload }[] : [];
  let sent = 0, failed = 0;
  for (const n of list) {
    const res = await sendTelegram(n.kind === "order" ? formatOrder(n.payload) : formatInquiry(n.payload), e, f);
    await rpc("finish_notification", { p_kind: n.kind, p_ref: n.ref, p_ok: res.ok, p_error: res.error ?? "" }, e, f);
    if (res.ok) sent++; else failed++;
  }
  return { sent, failed };
}
