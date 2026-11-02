// Local development server: every Edge Function on one port (used by tests/e2e/stack.py).
// Not deployed. Each function is deployed separately from its own folder.
import { handler as submitOrder } from "../submit-order/handler.ts";
import { handler as submitInquiry } from "../submit-inquiry/handler.ts";
import { handler as notifyRetry } from "../notify-retry/handler.ts";
import { handler as notifyTest } from "../notify-test/handler.ts";
import { handler as health } from "../health/handler.ts";

const routes: Record<string, (req: Request) => Promise<Response>> = {
  "/submit-order": (r) => submitOrder(r),
  "/submit-inquiry": (r) => submitInquiry(r),
  "/notify-retry": (r) => notifyRetry(r),
  "/notify-test": (r) => notifyTest(r),
  "/health": (r) => health(r),
};

Deno.serve({ hostname: "127.0.0.1", port: Number(Deno.env.get("PORT") ?? "54332"), onListen: () => {} }, (req) => {
  const fn = routes[new URL(req.url).pathname];
  return fn ? fn(req) : new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
});
