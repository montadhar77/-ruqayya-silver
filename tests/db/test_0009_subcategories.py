"""0009: sub-departments (men's rings → agate rings, turquoise rings …)."""
import psycopg
import pytest

import harness

MENS = "10000000-0000-4000-8000-000000000001"
MISBAHA = "10000000-0000-4000-8000-000000000002"
P1 = "20000000-0000-4000-8000-000000000001"   # خاتم الفيروز النيشابوري, mens-rings
P2 = "20000000-0000-4000-8000-000000000002"   # خاتم العقيق اليماني, mens-rings
P3 = "20000000-0000-4000-8000-000000000003"   # مسبحة, misbaha


def subs(db):
    """Two sub-departments of men's rings; P1 in turquoise, P2 in agate."""
    rows = harness.admin_sql(db, """insert into public.categories (parent_id, name, slug, sort) values
        (%s, 'خواتم العقيق الرجالية', 'mens-rings-aqeeq', 1), (%s, 'خواتم الفيروز الرجالية', 'mens-rings-turquoise', 2)
        returning id""", (MENS, MENS))
    aq, tq = (str(r[0]) for r in rows)
    harness.admin_sql(db, "update public.products set subcategory_id = %s where id = %s", (tq, P1))
    harness.admin_sql(db, "update public.products set subcategory_id = %s where id = %s", (aq, P2))
    return aq, tq


def test_seed_creates_stone_subdepartments_when_ring_departments_exist():
    db = harness.build(upto="0008", fixtures=False)
    try:
        harness.admin_sql(db, """insert into public.categories (name, slug, sort) values
            ('خواتم رجالية', 'mens-rings', 1), ('خواتم نسائية', 'womens-rings', 2)""")
        harness.run_sql_file(db, next(m for m in harness.migrations() if m.name.startswith("0009")))
        rows = harness.admin_sql(db, """select p.slug, c.name from public.categories c join public.categories p on p.id = c.parent_id
                                        order by p.sort, c.sort""")
        mens = [n for s, n in rows if s == "mens-rings"]
        womens = [n for s, n in rows if s == "womens-rings"]
        assert mens[:2] == ["خواتم العقيق الرجالية", "خواتم الفيروز الرجالية"] and len(mens) == 10
        assert womens[:2] == ["خواتم العقيق النسائية", "خواتم الفيروز النسائية"] and len(womens) == 8
    finally:
        harness.drop_db(db)


def test_catalog_home_counts_per_subdepartment(anon, db):
    aq, tq = subs(db)
    cats = {c["slug"]: c for c in anon.one("select public.catalog_home()")["cats"]}
    assert cats["mens-rings"]["count"] == 2 and cats["mens-rings"]["parent_id"] is None
    assert cats["mens-rings-aqeeq"]["count"] == 1 and cats["mens-rings-aqeeq"]["parent_id"] == MENS
    assert cats["mens-rings-turquoise"]["count"] == 1


def test_list_products_by_subdepartment(anon, db):
    aq, tq = subs(db)
    r = anon.one("select public.list_products(%s::uuid, 'default', 24, 0, %s::uuid)", (MENS, aq))
    assert [x["id"] for x in r["items"]] == [P2] and r["total"] == 1
    assert anon.one("select public.list_products(%s::uuid)", (MENS,))["total"] == 2        # whole department as before
    assert anon.one("select public.list_products(p_sub => %s::uuid)", (tq,))["total"] == 1


def test_search_matches_subdepartment_names(anon, db):
    aq, tq = subs(db)
    harness.admin_sql(db, "update public.products set name = 'خاتم فضة ملكي', stone = '', description = '' where id = %s", (P2,))
    r = anon.one("select public.search_products('خواتم العقيق الرجاليه')")
    assert P2 in [x["id"] for x in r["items"]]


def test_hidden_parent_hides_its_subdepartments(anon, db):
    subs(db)
    harness.admin_sql(db, "update public.categories set active = false where id = %s", (MENS,))
    slugs = [c["slug"] for c in anon.one("select public.catalog_home()")["cats"]]
    assert "mens-rings-aqeeq" not in slugs and "mens-rings" not in slugs


def test_only_one_level_and_no_self_parent(db):
    aq, tq = subs(db)
    with pytest.raises(psycopg.errors.CheckViolation, match="category_too_deep"):
        harness.admin_sql(db, "insert into public.categories (parent_id, name, slug) values (%s, 'x', 'x-deep')", (aq,))
    with pytest.raises(psycopg.errors.CheckViolation, match="category_parent_self"):
        harness.admin_sql(db, "update public.categories set parent_id = id where id = %s", (MISBAHA,))
    with pytest.raises(psycopg.errors.CheckViolation, match="category_has_children"):
        harness.admin_sql(db, "update public.categories set parent_id = %s where id = %s", (MISBAHA, MENS))


def test_subdepartment_must_belong_to_the_products_department(db):
    aq, tq = subs(db)
    harness.admin_sql(db, "update public.products set subcategory_id = %s where id = %s", (aq, P3))   # misbaha product
    assert harness.admin_sql(db, "select subcategory_id from public.products where id = %s", (P3,)) == [(None,)]
    harness.admin_sql(db, "update public.products set category_id = %s where id = %s", (MISBAHA, P2))  # moved department
    assert harness.admin_sql(db, "select subcategory_id from public.products where id = %s", (P2,)) == [(None,)]


def test_moving_or_deleting_subdepartments_keeps_products_consistent(db):
    aq, tq = subs(db)
    harness.admin_sql(db, "update public.categories set parent_id = %s where id = %s", (MISBAHA, tq))   # turquoise → misbaha
    assert harness.admin_sql(db, "select category_id::text, subcategory_id::text from public.products where id = %s", (P1,)) == [(MISBAHA, tq)]
    harness.admin_sql(db, "delete from public.categories where id = %s", (aq,))
    assert harness.admin_sql(db, "select category_id::text, subcategory_id from public.products where id = %s", (P2,)) == [(MENS, None)]
    harness.admin_sql(db, "delete from public.categories where id = %s", (MISBAHA,))                   # parent gone → its subs too
    assert harness.admin_sql(db, "select count(*) from public.categories where id = %s", (tq,)) == [(0,)]
    assert harness.admin_sql(db, "select category_id, subcategory_id from public.products where id = %s", (P1,)) == [(None, None)]


def test_admin_can_manage_subdepartments_visitor_cannot(admin, anon, visitor):
    r = admin.one("insert into public.categories (parent_id, name, slug) values (%s, 'خواتم الياقوت الرجالية', 'mens-rings-ruby') returning parent_id::text", (MENS,))
    assert r == MENS
    for s in (anon, visitor):
        with pytest.raises(psycopg.Error):
            s.q("insert into public.categories (parent_id, name, slug) values (%s, 'x', 'x-visitor')", (MENS,))
