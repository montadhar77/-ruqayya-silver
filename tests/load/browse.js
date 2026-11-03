// 500 concurrent visitors browsing the shop (k6). Each virtual visitor follows a realistic
// journey with think time: home -> department/shop page -> product -> sometimes search
// and cart. Talks straight to the database API (no CDN): the worst case for the database.
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE, JWT = __ENV.JWT, VUS = Number(__ENV.VUS || 500), HOLD = __ENV.HOLD || "2m";
const DATA = JSON.parse(open(__ENV.DATA));
const H = { headers: { Authorization: `Bearer ${JWT}`, Accept: "application/json" } };
const WORDS = ["عقيق", "فيروز", "خاتم", "مسبحه", "فضة ٩٢٥", "ياقوت", "رقم 12", "دُر نجف", "هدية"];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const think = (a, b) => sleep(a + Math.random() * (b - a));
const think_on = __ENV.NO_THINK ? false : true;

export const options = {
  scenarios: {
    browse: { executor: "ramping-vus", startVUs: 0, gracefulRampDown: "10s",
      stages: [{ duration: "45s", target: VUS }, { duration: HOLD, target: VUS }, { duration: "15s", target: 0 }] },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{name:catalog_home}": ["p(95)<500"],
    "http_req_duration{name:list_products}": ["p(95)<500"],
    "http_req_duration{name:product_page}": ["p(95)<500"],
    "http_req_duration{name:search_products}": ["p(95)<800"],
    "http_req_duration{name:products_by_ids}": ["p(95)<500"],
  },
  summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "p(99)", "max"],
};

function get(fn, qs) {
  const r = http.get(`${BASE}/rpc/${fn}?${qs}`, Object.assign({ tags: { name: fn } }, H));
  check(r, { [`${fn} 200`]: (x) => x.status === 200 });
  return r;
}

export default function () {
  get("catalog_home", "p_limit=60");
  if (think_on) think(2, 5);
  const cat = Math.random() < 0.7 ? pick(DATA.cats) : "";
  get("list_products", `${cat ? "p_category=" + cat + "&" : ""}p_sort=${pick(["default", "default", "new", "low", "high"])}&p_limit=24&p_offset=${pick([0, 0, 0, 24, 48])}`);
  if (think_on) think(2, 5);
  get("product_page", `p_id=${pick(DATA.prods)}`);
  if (think_on) think(3, 6);
  if (Math.random() < 0.3) {
    get("search_products", `p_q=${encodeURIComponent(pick(WORDS))}&p_limit=24`);
    if (think_on) think(2, 4);
  }
  if (Math.random() < 0.2) {
    const r = http.post(`${BASE}/rpc/products_by_ids`, JSON.stringify({ p_ids: [pick(DATA.prods), pick(DATA.prods)] }),
      { headers: Object.assign({ "Content-Type": "application/json" }, H.headers), tags: { name: "products_by_ids" } });
    check(r, { "products_by_ids 200": (x) => x.status === 200 });
    if (think_on) think(1, 3);
  }
}
