#!/usr/bin/env python3
"""Load tests on a LOCAL copy of the full stack (never production, never Supabase).

  python3 tests/load/run.py            # needs k6 (RQ_K6), PostgREST (RQ_POSTGREST), PostgreSQL 16+

Starts its own PostgreSQL cluster with production-like durability (fsync on, unlike the unit
tests), builds a database from the migrations, adds 2,000 synthetic products, runs real
PostgREST, then runs k6:
  1. browse  — 500 concurrent visitors with think time, straight to the API (no CDN)
  2. spike   — 300 customers order a 100-piece product at the same instant + re-send
  3. mixed   — 500 visitors browsing while 5 orders/second arrive
  4. stress  — 100 visitors with no think time (how far the API goes on this machine)
and checks the database afterwards: no overselling, no duplicate orders.
Writes tests/load/results/latest.json and latest.md.
"""
from __future__ import annotations

import json
import os
import platform
import shutil
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
PGDIR, PGPORT = "/tmp/pgrq_load", "54339"
os.environ.update(RQ_PG_HOST=PGDIR, RQ_PG_PORT=PGPORT, RQ_POOL=os.environ.get("RQ_POOL", "10"))
sys.path.insert(0, str(ROOT / "tests" / "db"))
sys.path.insert(0, str(ROOT / "tests" / "e2e"))
import harness  # noqa: E402
import stack  # noqa: E402

K6 = os.environ.get("RQ_K6") or shutil.which("k6")
PGBIN = sorted(Path("/usr/lib/postgresql").glob("*/bin"))[-1]
OUT = HERE / "results"
TMP = Path(os.environ.get("RQ_LOAD_TMP", "/tmp/rq_load"))


def as_pg(cmd: str):
    if os.getuid() == 0:
        subprocess.run(["bash", "-c", "id pgrunner >/dev/null 2>&1 || useradd -m pgrunner"], check=True)
        subprocess.run(["chown", "-R", "pgrunner", PGDIR], check=True)
        return subprocess.run(["su", "pgrunner", "-c", cmd], check=True, capture_output=True, text=True)
    return subprocess.run(["bash", "-c", cmd], check=True, capture_output=True, text=True)


def start_cluster():
    Path(PGDIR).mkdir(parents=True, exist_ok=True)
    if not (Path(PGDIR) / "data" / "PG_VERSION").exists():
        as_pg(f"{PGBIN}/initdb -D {PGDIR}/data -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null")
    # durability as in production (fsync / synchronous_commit on); memory close to a small Supabase instance
    opts = (f"-p {PGPORT} -k {PGDIR} -c listen_addresses='' -c max_connections=120 -c shared_buffers=256MB "
            f"-c shared_preload_libraries=pg_stat_statements -c fsync=on -c synchronous_commit=on")
    subprocess.run(["bash", "-c", f"su pgrunner -c '{PGBIN}/pg_ctl -D {PGDIR}/data status' >/dev/null 2>&1"])
    try:
        as_pg(f"{PGBIN}/pg_ctl -D {PGDIR}/data status")
    except subprocess.CalledProcessError:
        as_pg(f'{PGBIN}/pg_ctl -D {PGDIR}/data -l {PGDIR}/log.txt -w start -o "{opts}"')


def stop_cluster():
    try:
        as_pg(f"{PGBIN}/pg_ctl -D {PGDIR}/data -m fast stop")
    except subprocess.CalledProcessError:
        pass


def k6(script: str, name: str, **env) -> dict:
    summary = TMP / f"{name}.json"
    cmd = [K6, "run", "--quiet", "--summary-export", str(summary), str(HERE / script)]
    for k, v in env.items():
        cmd[2:2] = ["-e", f"{k}={v}"]
    t0 = time.time()
    p = subprocess.run(cmd, capture_output=True, text=True)
    (TMP / f"{name}.log").write_text(p.stdout + p.stderr)
    s = json.loads(summary.read_text())
    s["_seconds"] = round(time.time() - t0, 1)
    s["_exit"] = p.returncode
    return s


def metric(s, key, stat):
    m = s["metrics"].get(key)
    if not m:
        return None
    v = m.get(stat, m.get("values", {}).get(stat) if isinstance(m.get("values"), dict) else None)
    return round(v, 1) if isinstance(v, (int, float)) else v


def row(s, label, tag):
    k = f"http_req_duration{{name:{tag}}}"
    return {"label": label, "p50": metric(s, k, "med"), "p95": metric(s, k, "p(95)"), "p99": metric(s, k, "p(99)"), "max": metric(s, k, "max")}


def main():
    if not K6:
        sys.exit("k6 not found (set RQ_K6)")
    TMP.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    start_cluster()
    db = harness.build()
    harness.admin_sql(db, "create extension if not exists pg_stat_statements")
    s = stack.start(db=db, functions=False)
    try:
        cats = [str(r[0]) for r in harness.admin_sql(db, "select id from public.categories where active")]
        harness.admin_sql(db, """
            insert into public.products (category_id, name, description, price, old_price, stone, metal, images, featured, active, sort)
            select (%s::uuid[])[1 + i %% array_length(%s::uuid[], 1)], 'قطعة رقم ' || i,
                   'وصف تجريبي مفصّل للقطعة رقم ' || i || ' — فضة عيار ٩٢٥ بنقش يدوي، حجر طبيعي مختار، تغليف هدايا.',
                   20000 + (i * 137) %% 480000, case when i %% 7 = 0 then 600000 end,
                   (array['عقيق يماني','فيروز نيشابوري','ياقوت','زمرد','دُر نجف','شذر','كهرب'])[1 + i %% 7], 'فضة ٩٢٥',
                   array['https://example.invalid/p' || i || '.v.webp', 'https://example.invalid/q' || i || '.v.webp'],
                   i %% 40 = 0, true, 100 + i
            from generate_series(1, 2000) i""", (cats, cats))
        limited = str(harness.admin_sql(db, """insert into public.products (category_id, name, price, stock, active, sort)
            values (%s, 'قطعة محدودة (١٠٠ قطعة)', 150000, 100, true, 1) returning id""", (cats[0],))[0][0])
        harness.admin_sql(db, "vacuum analyze")
        harness.admin_sql(db, "select pg_stat_statements_reset()")
        prods = [str(r[0]) for r in harness.admin_sql(db, "select id from public.products where active and stock is null order by random() limit 600")]
        data = TMP / "data.json"
        data.write_text(json.dumps({"cats": cats, "prods": prods, "limited": limited}))
        base = f"http://127.0.0.1:{stack.REST_PORT}"
        common = {"BASE": base, "JWT": stack.ANON_JWT, "DATA": str(data)}
        results = {}

        print("1/4 browse: 500 visitors …", flush=True)
        results["browse"] = k6("browse.js", "browse", VUS="500", HOLD="2m", **common)
        print("2/4 spike: 300 simultaneous orders for 100 pieces …", flush=True)
        results["spike"] = k6("checkout.js", "spike", SCENARIO="spike", N="300", **common)
        inv = {
            "stock_left": harness.admin_sql(db, "select stock from public.products where id = %s", (limited,))[0][0],
            "orders_for_limited": harness.admin_sql(db, "select count(*) from public.orders where items @> %s::jsonb", (json.dumps([{"id": limited}]),))[0][0],
            "pieces_sold": harness.admin_sql(db, "select coalesce(sum((i->>'qty')::int), 0) from public.orders o, jsonb_array_elements(o.items) i where i->>'id' = %s", (limited,))[0][0],
            "stock_moves": harness.admin_sql(db, "select coalesce(sum(delta), 0) from public.stock_movements where product_id = %s", (limited,))[0][0],
            "duplicate_keys": harness.admin_sql(db, "select count(*) - count(distinct idempotency_key) from public.orders where idempotency_key is not null")[0][0],
        }
        inv["no_oversell"] = inv["stock_left"] == 0 and inv["pieces_sold"] == 100 and inv["stock_moves"] == -100
        inv["no_duplicates"] = inv["duplicate_keys"] == 0
        results["spike_invariants"] = inv
        print("   ", inv, flush=True)

        print("3/4 mixed: 500 visitors + 5 orders/s …", flush=True)
        orders_before = harness.admin_sql(db, "select count(*) from public.orders")[0][0]
        env_b = dict(common, VUS="500", HOLD="2m")
        cmd_b = [K6, "run", "--quiet", "--summary-export", str(TMP / "mixed_browse.json")] + sum([["-e", f"{k}={v}"] for k, v in env_b.items()], []) + [str(HERE / "browse.js")]
        pb = subprocess.Popen(cmd_b, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(45)   # orders start once the visitors have ramped up
        results["mixed_orders"] = k6("checkout.js", "mixed_orders", SCENARIO="steady", RATE="5", DURATION="2m", **common)
        pb.wait()
        results["mixed_browse"] = json.loads((TMP / "mixed_browse.json").read_text())
        results["mixed_orders_saved"] = harness.admin_sql(db, "select count(*) from public.orders")[0][0] - orders_before

        print("4/4 stress: 100 visitors, no think time …", flush=True)
        results["stress"] = k6("browse.js", "stress", VUS="100", HOLD="1m", NO_THINK="1", **common)

        results["top_queries"] = [
            {"query": q[:90], "calls": c, "mean_ms": round(m, 2), "total_s": round(t / 1000, 1)}
            for q, c, m, t in harness.admin_sql(db, """select regexp_replace(query, '\\s+', ' ', 'g'), calls, mean_exec_time, total_exec_time
                from pg_stat_statements where query not ilike '%%pg_stat_statements%%' order by total_exec_time desc limit 8""")]
        results["machine"] = {"cpus": os.cpu_count(), "ram_gb": round(os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / 2**30, 1),
                              "platform": platform.platform(), "postgrest_pool": os.environ["RQ_POOL"],
                              "postgres": harness.admin_sql(db, "show server_version")[0][0], "products": 2008 + 1}
        (OUT / "latest.json").write_text(json.dumps(results, ensure_ascii=False, indent=1, default=str))
        write_md(results)
        print((OUT / "latest.md").read_text())
    finally:
        stack.stop()
        stop_cluster()


def write_md(r):
    def reqs(s):
        m = s["metrics"]
        return m["http_reqs"].get("rate") or m["http_reqs"].get("values", {}).get("rate"), m["http_reqs"].get("count")

    def failed(s):
        m = s["metrics"]["http_req_failed"]
        return m.get("value", m.get("rate", m.get("values", {}).get("rate")))
    lines = ["# Load test results (local stack — not production)", "",
             f"Machine: {r['machine']['cpus']} vCPU, {r['machine']['ram_gb']} GB RAM · PostgreSQL {r['machine']['postgres']} (fsync on) · PostgREST pool {r['machine']['postgrest_pool']} · {r['machine']['products']} products", ""]
    for key, title in [("browse", "1. 500 concurrent visitors (think time 2–6 s), direct to the API"),
                       ("mixed_browse", "3a. Mixed: 500 visitors browsing …"), ("stress", "4. Stress: 100 visitors, no think time")]:
        s = r[key]
        rate, count = reqs(s)
        lines += [f"## {title}", f"requests: {count} · {rate:.1f}/s · failed: {failed(s) * 100:.2f}%", "",
                  "| call | p50 ms | p95 ms | p99 ms | max ms |", "|---|---|---|---|---|"]
        for tag in ("catalog_home", "list_products", "product_page", "search_products", "products_by_ids"):
            x = row(s, tag, tag)
            lines.append(f"| {tag} | {x['p50']} | {x['p95']} | {x['p99']} | {x['max']} |")
        lines.append("")
    for key, title in [("spike", "2. Spike: 300 simultaneous orders for a 100-piece product (+ re-send)"), ("mixed_orders", "3b. Mixed: 5 orders/second during browsing")]:
        s = r[key]
        rate, count = reqs(s)
        x = row(s, title, "place_order")
        lines += [f"## {title}", f"requests: {count} · place_order p50 {x['p50']} ms · p95 {x['p95']} ms · p99 {x['p99']} ms · max {x['max']} ms", ""]
    inv = r["spike_invariants"]
    lines += ["## Integrity after the spike", f"stock left {inv['stock_left']} · pieces sold {inv['pieces_sold']} · stock moves {inv['stock_moves']} · duplicate idempotency keys {inv['duplicate_keys']}",
              f"**no overselling: {inv['no_oversell']} · no duplicate orders: {inv['no_duplicates']}** · orders saved during mixed run: {r['mixed_orders_saved']}", "",
              "## Heaviest database statements", "| calls | mean ms | total s | statement |", "|---|---|---|---|"]
    for q in r["top_queries"]:
        lines.append(f"| {q['calls']} | {q['mean_ms']} | {q['total_s']} | `{q['query'].replace('|', '/')}` |")
    (OUT / "latest.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
