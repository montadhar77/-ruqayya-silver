# Load test results (local stack — not production)

Machine: 2 vCPU, 7.8 GB RAM · PostgreSQL 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1) (fsync on) · PostgREST pool 10 · 2009 products

## 1. 500 concurrent visitors (think time 2–6 s), direct to the API
requests: 21285 · 112.1/s · failed: 0.00%

| call | p50 ms | p95 ms | p99 ms | max ms |
|---|---|---|---|---|
| catalog_home | 7.3 | 18.4 | 30.4 | 86.0 |
| list_products | 5.3 | 17.7 | 29.6 | 67.8 |
| product_page | 2.3 | 7.1 | 12.1 | 52.9 |
| search_products | 26.1 | 217.7 | 294.1 | 485.8 |
| products_by_ids | 1.8 | 6.3 | 12.1 | 31.7 |

## 3a. Mixed: 500 visitors browsing …
requests: 21273 · 112.0/s · failed: 0.00%

| call | p50 ms | p95 ms | p99 ms | max ms |
|---|---|---|---|---|
| catalog_home | 7.3 | 19.1 | 33.6 | 64.9 |
| list_products | 5.0 | 15.6 | 27.3 | 74.4 |
| product_page | 2.2 | 7.0 | 12.8 | 41.1 |
| search_products | 25.4 | 204.4 | 279.0 | 373.5 |
| products_by_ids | 1.7 | 5.9 | 11.0 | 60.0 |

## 4. Stress: 100 visitors, no think time
requests: 35680 · 297.2/s · failed: 0.00%

| call | p50 ms | p95 ms | p99 ms | max ms |
|---|---|---|---|---|
| catalog_home | 123.0 | 896.9 | 1494.7 | 3159.5 |
| list_products | 110.7 | 885.8 | 1492.2 | 4166.4 |
| product_page | 99.7 | 848.8 | 1430.8 | 3157.8 |
| search_products | 249.8 | 1436.8 | 1939.8 | 3785.9 |
| products_by_ids | 104.8 | 891.5 | 1439.6 | 2037.8 |

## 2. Spike: 300 simultaneous orders for a 100-piece product (+ re-send)
requests: 400 · place_order p50 350.9 ms · p95 516.3 ms · p99 528.6 ms · max 534.0 ms

## 3b. Mixed: 5 orders/second during browsing
requests: 601 · place_order p50 4.2 ms · p95 12.8 ms · p99 20.8 ms · max 35.2 ms

## Integrity after the spike
stock left 0 · pieces sold 100 · stock moves -100 · duplicate idempotency keys 0
**no overselling: True · no duplicate orders: True** · orders saved during mixed run: 601

## Heaviest database statements
| calls | mean ms | total s | statement |
|---|---|---|---|
| 6650 | 118.55 | 788.4 | `WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT $1 AS json_data) pgrst_p` |
| 22390 | 12.4 | 277.6 | `WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT $1 AS json_data) pgrst_p` |
| 6739 | 16.36 | 110.3 | `WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT $1 AS json_data) pgrst_p` |
| 15651 | 4.74 | 74.2 | `WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT $1 AS json_data) pgrst_p` |
| 22390 | 0.89 | 19.9 | `WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT $1 AS json_data) pgrst_p` |
| 801 | 4.53 | 3.6 | `WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT $1 AS json_data) pgrst_p` |
| 4418 | 0.46 | 2.1 | `WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT $1 AS json_data) pgrst_p` |
| 79239 | 0.02 | 1.8 | `select set_config('search_path', $1, true), set_config('role', $2, true), set_config('requ` |
