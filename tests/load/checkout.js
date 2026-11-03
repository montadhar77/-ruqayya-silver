// Checkout under pressure (k6).
//   SCENARIO=spike : N customers press "order" at the same instant for a product with limited
//                    stock; each one also re-sends the same order (double click / lost reply).
//                    Afterwards run.py checks: no overselling, no duplicate orders.
//   SCENARIO=steady: orders at a constant rate while visitors browse (run together with browse.js).
import http from "k6/http";
import { check } from "k6";
import exec from "k6/execution";

const BASE = __ENV.BASE, JWT = __ENV.JWT, DATA = JSON.parse(open(__ENV.DATA));
const SCENARIO = __ENV.SCENARIO || "spike", N = Number(__ENV.N || 300), RATE = Number(__ENV.RATE || 5);

export const options = {
  scenarios: SCENARIO === "spike"
    ? { spike: { executor: "per-vu-iterations", vus: N, iterations: 1, maxDuration: "2m" } }
    : { steady: { executor: "constant-arrival-rate", rate: RATE, timeUnit: "1s", duration: __ENV.DURATION || "2m",
                  preAllocatedVUs: 50, maxVUs: 200 } },
  thresholds: SCENARIO === "spike"
    ? { "http_req_duration{name:place_order}": ["p(95)<1500"], checks: ["rate>0.99"] }
    : { "http_req_duration{name:place_order}": ["p(95)<1500"], http_req_failed: ["rate<0.01"] },
  summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "p(99)", "max"],
};

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === "x" ? r : (r & 3) | 8).toString(16); });
}

export default function () {
  const n = exec.scenario.iterationInTest;
  const product = SCENARIO === "spike" ? DATA.limited : DATA.prods[n % DATA.prods.length];
  const body = JSON.stringify({
    p_customer: { name: `زبون حمل ${n}`, phone: `0770${String(n).padStart(7, "0")}`, city: "بغداد", address: "عنوان اختبار" },
    p_items: [{ id: product, qty: 1 }], p_idempotency_key: uuid() });
  const params = { headers: { Authorization: `Bearer ${JWT}`, "Content-Type": "application/json", Accept: "application/json",
                              "X-Forwarded-For": `198.51.${(n >> 8) & 255}.${n & 255}` }, tags: { name: "place_order" } };
  const r1 = http.post(`${BASE}/rpc/place_order`, body, params);
  const ok = r1.status === 200, sold = r1.status === 400 && String(r1.body).includes("out_of_stock");
  check(r1, { "order accepted or cleanly refused (out of stock)": () => ok || sold });
  if (SCENARIO === "spike" && ok) {
    const r2 = http.post(`${BASE}/rpc/place_order`, body, Object.assign({}, params, { tags: { name: "place_order_retry" } }));
    check(r2, { "re-send returns the same order": (x) => x.status === 200 && x.json("order_no") === r1.json("order_no") && x.json("duplicate") === true });
  }
}
