"""0006: Arabic-aware search, paged catalogue, one-call home data, dashboard lists/stats,
and the indexes that keep them fast with thousands of rows."""
import json
import time

import psycopg
import pytest

import harness

P1 = "20000000-0000-4000-8000-000000000001"   # خاتم الفيروز النيشابوري, mens-rings, featured, 240000
P2 = "20000000-0000-4000-8000-000000000002"   # خاتم العقيق اليماني, mens-rings, featured, 320000
P3 = "20000000-0000-4000-8000-000000000003"   # مسبحة يُسر أسود, misbaha, 120000
P4 = "20000000-0000-4000-8000-000000000004"   # inactive
P5 = "20000000-0000-4000-8000-000000000005"   # مسبحة كهرب, misbaha, 0 in stock, 90000
MENS = "10000000-0000-4000-8000-000000000001"
MISBAHA = "10000000-0000-4000-8000-000000000002"


def ids(items):
    return [x["id"] for x in items]


# ------------------------------------------------------------------ normalisation
@pytest.mark.parametrize("raw,norm", [
    ("أَحْمَد إبراهيم آمنة ٱلله", "احمد ابراهيم امنه الله"),
    ("مسبحةٌ  كهرمانـــية", "مسبحه كهرمانيه"),
    ("مُصطفى", "مصطفي"),
    ("مؤمن  رئيس", "مومن رييس"),
    ("٠٧٧٠ ۱۲۳", "0770 123"),
    ("Silver RING", "silver ring"),
    (None, ""),
])
def test_ar_norm(db, raw, norm):
    assert harness.admin_sql(db, "select private.ar_norm(%s)", (raw,))[0][0] == norm


def test_like_any_escapes_wildcards(db):
    assert harness.admin_sql(db, "select private.like_any('5%_x')")[0][0] == "%5\\%\\_x%"


# ------------------------------------------------------------------ catalog_home
def test_catalog_home_small_shop_is_complete_and_matches_the_old_queries(anon):
    home = anon.one("select public.catalog_home()")
    old = anon.q("select id from public.products where active order by sort, created_at desc")
    assert ids(home["prods"]) == [str(r[0]) for r in old]          # same products, same order as before
    assert home["total"] == 4 and home["complete"] is True
    assert P4 not in ids(home["prods"])
    cats = {c["slug"]: c["count"] for c in home["cats"]}
    assert cats == {"mens-rings": 2, "misbaha": 2}               # hidden department excluded
    assert home["settings"]["brand"]["name"] == "معرض رقية"
    full = next(p for p in home["prods"] if p["id"] == P2)
    assert full["description"] == "عقيق يماني" and full["old_price"] == 360000 and full["stock"] == 5


def test_catalog_home_large_shop_returns_first_page_plus_featured(anon, db):
    harness.admin_sql(db, "update public.products set featured = true where id = %s", (P5,))
    harness.admin_sql(db, """update public.settings set data = jsonb_set(data, '{sections}', jsonb_build_object('featured', jsonb_build_object('product_id', %s::text)))""", (P3,))
    home = anon.one("select public.catalog_home(1)")
    assert home["complete"] is False and home["total"] == 4
    got = ids(home["prods"])
    assert got[0] == P1                      # first by sort
    assert set(got) == {P1, P2, P3, P5}      # + featured (P2, P5) + the product chosen in the dashboard (P3)


def test_catalog_home_limit_is_clamped(anon):
    assert anon.one("select public.catalog_home(100000)")["complete"] is True
    assert len(anon.one("select public.catalog_home(-5)")["prods"]) >= 1


# ------------------------------------------------------------------ list_products
def test_list_products_sorts_like_the_shop_page(anon):
    def page(sort, cat=None):
        return ids(anon.one("select public.list_products(%s::uuid, %s)", (cat, sort))["items"])
    assert page("default") == [P1, P2, P3, P5]
    assert page("low") == [P5, P3, P1, P2]
    assert page("high") == [P2, P1, P3, P5]
    assert page("default", MISBAHA) == [P3, P5]
    assert page("nonsense") == [P1, P2, P3, P5]


def test_list_products_pages_and_totals(anon):
    a = anon.one("select public.list_products(null, 'default', 2, 0)")
    b = anon.one("select public.list_products(null, 'default', 2, 2)")
    c = anon.one("select public.list_products(null, 'default', 2, 4)")
    assert a["total"] == b["total"] == c["total"] == 4
    assert ids(a["items"]) + ids(b["items"]) == [P1, P2, P3, P5] and c["items"] == []
    assert "rn" not in a["items"][0]
    assert len(anon.one("select public.list_products(null, 'default', 5000, -10)")["items"]) == 4   # clamped


# ------------------------------------------------------------------ search
@pytest.mark.parametrize("q,expect", [
    ("عقيق", [P2]),
    ("العقيق اليمانى", [P2]),             # ى typed for ي
    ("مسبحه", [P3, P5]),                   # ه typed for ة
    ("مسابح", [P3, P5]),                   # department name
    ("خاتم", [P1, P2]),
    ("فضة ٩٢٥", [P1]),                     # description + Arabic digits
    ("كهرب", [P5]),
    ("متوقفة", []),                        # inactive product never found
    ("%", []), ("_", []), ("", []), ("   ", []),
])
def test_search_products(anon, q, expect):
    r = anon.one("select public.search_products(%s)", (q,))
    assert sorted(ids(r["items"])) == sorted(expect)
    assert r["total"] == len(expect)


def test_search_ranks_name_hits_first(anon, db):
    harness.admin_sql(db, "update public.products set description = 'يشبه العقيق' where id = %s", (P3,))
    r = anon.one("select public.search_products('عقيق')")
    assert ids(r["items"]) == [P2, P3]
    assert set(r["items"][0]) >= {"id", "name", "price", "images"} and "score" not in r["items"][0]


def test_search_pages(anon):
    a = anon.one("select public.search_products('خاتم', 1, 0)")
    b = anon.one("select public.search_products('خاتم', 1, 1)")
    assert a["total"] == b["total"] == 2 and set(ids(a["items"]) + ids(b["items"])) == {P1, P2}


# ------------------------------------------------------------------ product page / cart
def test_product_page_and_related(anon):
    r = anon.one("select public.product_page(%s)", (P1,))
    assert r["product"]["id"] == P1 and ids(r["related"]) == [P2]
    assert anon.one("select public.product_page(%s)", (P4,)) == {"product": None, "related": []}
    assert anon.one("select public.product_page('00000000-0000-4000-8000-000000000000')")["product"] is None


def test_products_by_ids_only_active(anon):
    r = anon.one("select public.products_by_ids(%s::uuid[])", ([P2, P4, P5],))
    assert sorted(ids(r)) == sorted([P2, P5])
    assert anon.one("select public.products_by_ids('{}'::uuid[])") == []


# ------------------------------------------------------------------ dashboard functions
CUSTOMER = {"name": "زبون تجريبي", "phone": "0770 000 0001", "city": "كربلاء"}


def place(s, name, phone, country=None):
    c = {"name": name, "phone": phone, "city": "بغداد"}
    if country:
        c["country"] = country
    return s.one("select public.place_order(%s::jsonb, %s::jsonb)", (json.dumps(c), json.dumps([{"id": P1, "qty": 1}])))


def test_admin_functions_need_two_step_admin(anon, visitor, admin_password_only, admin):
    for s in (anon,):
        for fn in ("public.admin_orders()", "public.admin_stats()"):
            with pytest.raises(psycopg.errors.InsufficientPrivilege):
                s.q(f"select {fn}")
    for s in (visitor, admin_password_only):
        for fn in ("public.admin_orders()", "public.admin_stats()"):
            with pytest.raises(psycopg.errors.InsufficientPrivilege, match="not_allowed"):
                s.q(f"select {fn}")
    assert admin.one("select public.admin_stats()")["products_total"] == 5


def test_admin_orders_search_filter_and_pages(anon, admin):
    a = place(anon, "أحمد عبد الله", "0770 111 2222")
    b = place(anon, "Sara", "+49 151 0000000", "ألمانيا")
    c = place(anon, "مصطفى كريم", "07801234567")
    admin.q("update public.orders set status = 'confirmed' where order_no = %s", (c["order_no"],))

    def nos(**kw):
        r = admin.one("select public.admin_orders(%s, %s, %s, %s)",
                      (kw.get("st"), kw.get("q"), kw.get("n", 50), kw.get("k", 0)))
        return [o["order_no"] for o in r["items"]], r
    got, r = nos()
    assert got == [c["order_no"], b["order_no"], a["order_no"]]          # newest first
    assert r["total"] == 3 and r["counts"]["all"] == 3 and r["counts"]["new"] == 2 and r["counts"]["confirmed"] == 1
    assert nos(q="احمد")[0] == [a["order_no"]]                            # أ typed as ا
    assert nos(q="مصطفي")[0] == [c["order_no"]]
    assert nos(q="0770 111")[0] == [a["order_no"]]                        # phone typed with spaces
    assert nos(q="٠٧٧٠١١١")[0] == [a["order_no"]]                         # Arabic digits
    assert nos(q=str(b["order_no"]))[0] == [b["order_no"]]
    assert nos(q="ألمانيا")[0] == [b["order_no"]]
    assert nos(st="confirmed")[0] == [c["order_no"]]
    got, r = nos(st="new", q="0770")
    assert got == [a["order_no"]] and r["counts"]["confirmed"] == 0       # counts follow the search
    p1, _ = nos(n=2, k=0)
    p2, _ = nos(n=2, k=2)
    assert p1 + p2 == [c["order_no"], b["order_no"], a["order_no"]]


def test_admin_stats(anon, admin, db):
    o = place(anon, "زبون", "07700000009")
    place(anon, "زبون آخر", "07700000008")
    admin.q("update public.orders set status = 'cancelled' where order_no = %s", (o["order_no"],))
    anon.q("insert into public.inquiries (name, phone, body) values ('سائل', '', 'سؤال تجريبي')")
    harness.admin_sql(db, "update public.products set stock = 2 where id = %s", (P3,))
    s = admin.one("select public.admin_stats()")
    assert s["orders_total"] == 2 and s["orders_new"] == 1 and s["orders_month"] == 1
    assert s["sales_month"] == 245000                                     # cancelled order not counted
    assert s["inquiries_unread"] == 1
    assert s["products_total"] == 5 and s["products_active"] == 4
    assert s["products_no_photo"] == 4 and s["products_out"] == 1 and s["products_low"] == 1
    assert s["last_order_at"] is not None


# ------------------------------------------------------------------ privileges
def test_storefront_functions_open_to_visitors_only_as_intended(db):
    rows = harness.admin_sql(db, """
        select p.proname, has_function_privilege('anon', p.oid, 'EXECUTE')
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname in ('catalog_home', 'list_products', 'search_products', 'product_page',
                                                     'products_by_ids', 'admin_orders', 'admin_stats') order by 1""")
    assert dict(rows) == {"admin_orders": False, "admin_stats": False, "catalog_home": True, "list_products": True,
                          "product_page": True, "products_by_ids": True, "search_products": True}


def test_storefront_functions_never_return_hidden_products(db):
    """They run as definer (for the index) but only ever return what a visitor may see."""
    harness.admin_sql(db, "update public.products set active = false where id = %s", (P2,))
    with harness.session(db, "anon") as s:
        assert P2 not in ids(s.one("select public.catalog_home()")["prods"])
        assert s.one("select public.search_products('عقيق')")["total"] == 0
        assert s.one("select public.product_page(%s)", (P2,))["product"] is None
        assert s.one("select public.products_by_ids(%s::uuid[])", ([P2],)) == []
        assert P2 not in ids(s.one("select public.list_products()")["items"])
        hidden_cat = s.one("select public.catalog_home()")["cats"]
        assert "hidden-cat" not in [c["slug"] for c in hidden_cat]


# ------------------------------------------------------------------ scale
def _bulk(db, n):
    harness.admin_sql(db, """
        insert into public.products (category_id, name, description, price, stone, metal, active, sort)
        select case when i %% 2 = 0 then %s::uuid else %s::uuid end,
               'قطعة تجريبية رقم ' || i, 'وصف تجريبي ' || md5(i::text), 1000 + i,
               (array['عقيق','فيروز','ياقوت','زمرد','دُر نجف'])[1 + i %% 5], 'فضة', true, 100 + i
        from generate_series(1, %s) i""", (MENS, MISBAHA, n))
    harness.admin_sql(db, "analyze public.products")


def test_search_and_lists_use_indexes_at_scale(db):
    _bulk(db, 5000)
    plan = "\n".join(r[0] for r in harness.admin_sql(db, """
        explain select id from public.products
        where private.product_doc(name, stone, metal, badge, description) like private.like_any('رقم 4321')"""))
    assert "products_search_trgm_idx" in plan, plan
    plan = "\n".join(r[0] for r in harness.admin_sql(db, f"""
        explain select id from public.products where active and category_id = '{MISBAHA}' order by sort, created_at desc limit 24"""))
    assert "Seq Scan" not in plan and "Sort" not in plan, plan          # an index walk, no full read + sort


def test_catalogue_calls_stay_fast_with_5000_products(db):
    _bulk(db, 5000)
    with harness.session(db, "anon") as s:
        timings = {}
        for name, sql in [("home", "select public.catalog_home()"),
                          ("page", "select public.list_products(null, 'default', 24, 2400)"),
                          ("dept", f"select public.list_products('{MISBAHA}', 'low', 24, 0)"),
                          ("search", "select public.search_products('ياقوت')"),
                          ("search_rare", "select public.search_products('رقم 4321')")]:
            s.one(sql)                                     # warm
            t = time.perf_counter()
            for _ in range(5):
                r = s.one(sql)
            timings[name] = (time.perf_counter() - t) / 5 * 1000
            assert r is not None
        home = s.one("select public.catalog_home()")
        assert home["total"] == 5004 and home["complete"] is False and len(home["prods"]) == 60
        assert s.one("select public.search_products('ياقوت')")["total"] == 1000
        assert s.one("select public.search_products('رقم 4321')")["items"][0]["name"] == "قطعة تجريبية رقم 4321"
    print("catalogue timings (ms):", {k: round(v, 1) for k, v in timings.items()})
    assert max(timings.values()) < 250, timings


def test_dashboard_order_list_stays_fast_with_20000_orders(db):
    harness.admin_sql(db, """
        insert into public.orders (customer_name, phone, city, country, items, subtotal, delivery, total, status, created_at)
        select 'زبون رقم ' || i, '0770' || lpad(i::text, 7, '0'), 'بغداد', 'العراق', '[]'::jsonb, 1000, 0, 1000,
               (array['new','confirmed','shipped','delivered','cancelled'])[1 + i % 5], now() - (i || ' minutes')::interval
        from generate_series(1, 20000) i""")
    harness.admin_sql(db, "analyze public.orders")
    with harness.session(db, "authenticated", harness.ADMIN_ID, claims={"aal": "aal2"}) as s:
        timings = {}
        for name, args in [("first_page", (None, None, 50, 0)), ("deep_page", (None, None, 50, 15000)),
                           ("status", ("shipped", None, 50, 0)), ("phone", (None, "0770 001 2345", 50, 0)),
                           ("name", (None, "زبون رقم 19999", 50, 0)), ("stats", None)]:
            sql = "select public.admin_stats()" if args is None else "select public.admin_orders(%s, %s, %s, %s)"
            s.one(sql, args)
            t = time.perf_counter()
            for _ in range(3):
                r = s.one(sql, args)
            timings[name] = (time.perf_counter() - t) / 3 * 1000
        assert s.one("select public.admin_orders(null, '0770 001 2345')")["total"] == 1
        assert s.one("select public.admin_orders()")["counts"]["all"] == 20000
    print("dashboard timings (ms):", {k: round(v, 1) for k, v in timings.items()})
    assert max(timings.values()) < 400, timings
