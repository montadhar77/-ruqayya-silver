"""0010: translations (English, Persian, Urdu, German) of products and departments."""
import json

import psycopg
import pytest

import harness

MENS = "10000000-0000-4000-8000-000000000001"
P1 = "20000000-0000-4000-8000-000000000001"   # خاتم الفيروز النيشابوري
P2 = "20000000-0000-4000-8000-000000000002"   # خاتم العقيق اليماني
P3 = "20000000-0000-4000-8000-000000000003"   # مسبحة يُسر أسود


def tr(db, table, row_id, value):
    harness.admin_sql(db, f"update public.{table} set i18n = %s::jsonb where id = %s", (json.dumps(value, ensure_ascii=False), row_id))


def test_seed_translates_departments_and_stone_subdepartments():
    db = harness.build(upto="0008", fixtures=False)
    try:
        harness.admin_sql(db, """insert into public.categories (name, slug, sort) values
            ('خواتم رجالية', 'mens-rings', 1), ('خواتم نسائية', 'womens-rings', 2), ('مسابح', 'misbaha', 3), ('قسم خاص', 'own-dept', 4)""")
        for v in ("0009", "0010"):
            harness.run_sql_file(db, next(m for m in harness.migrations() if m.name.startswith(v)))
        got = dict(harness.admin_sql(db, "select slug, i18n from public.categories"))
        assert got["mens-rings"]["en"]["name"] == "Men's Rings" and got["mens-rings"]["de"]["name"] == "Herrenringe"
        assert got["mens-rings"]["ur"]["name"] == "مردانہ انگوٹھیاں" and got["mens-rings"]["fa"]["name"] == "انگشترهای مردانه"
        assert got["misbaha"]["en"] == {"name": "Prayer Beads", "subtitle": "Yusr · Amber · Agate"}
        assert got["mens-rings-aqeeq"]["en"]["name"] == "Men's Agate Rings"
        assert got["womens-rings-zircon"]["de"]["name"] == "Damen-Zirkonringe"
        subs = [s for s in got if s.startswith(("mens-rings-", "womens-rings-"))]
        assert len(subs) == 18 and all(set(got[s]) == {"en", "fa", "ur", "de"} for s in subs)
        assert got["womens-rings-pearl"]["fa"] == {"name": "انگشترهای مروارید زنانه", "subtitle": "مروارید"}
        assert got["own-dept"] == {}                                     # departments the owner added stay as they are
    finally:
        harness.drop_db(db)


def test_translations_reach_the_storefront(anon, db):
    tr(db, "products", P1, {"en": {"name": "Nishapur Turquoise Ring"}, "de": {"name": "Nishapur-Türkisring"}})
    tr(db, "categories", MENS, {"en": {"name": "Men's Rings"}})
    home = anon.one("select public.catalog_home()")
    p = next(x for x in home["prods"] if x["id"] == P1)
    assert p["i18n"]["en"]["name"] == "Nishapur Turquoise Ring"
    assert next(c for c in home["cats"] if c["id"] == MENS)["i18n"]["en"]["name"] == "Men's Rings"
    assert anon.one("select public.product_page(%s::uuid)", (P1,))["product"]["i18n"]["de"]["name"] == "Nishapur-Türkisring"
    assert anon.one("select public.list_products()")["items"][0]["i18n"] is not None


def test_search_finds_translated_names_descriptions_and_departments(anon, db):
    tr(db, "products", P1, {"en": {"name": "Nishapur Turquoise Ring", "description": "Sky-blue stone in 925 silver"}})
    tr(db, "products", P3, {"ur": {"name": "سیاہ یسر تسبیح"}, "de": {"name": "Schwarze Yusr-Gebetskette"}, "fa": {"name": "تسبیح یُسر سیاه"}})
    tr(db, "categories", MENS, {"en": {"name": "Men's Rings"}, "de": {"name": "Herrenringe"}})
    ids = lambda q: [x["id"] for x in anon.one("select public.search_products(%s)", (q,))["items"]]
    assert ids("turquoise") == [P1]                        # case does not matter
    assert ids("SKY-BLUE") == [P1]
    assert ids("gebetskette") == [P3]
    assert ids("یسر تسبیح") == [P3]
    assert ids("تسبیح یسر سیاه") == [P3]                    # Persian (the harakat do not matter)
    assert set(ids("herrenringe")) == {P1, P2}              # translated department name
    assert ids("خاتم الفيروز")[0] == P1                    # Arabic search as before


def test_search_uses_the_translation_index(db):
    harness.admin_sql(db, """insert into public.products (category_id, name, price, i18n)
        select %s, 'منتج ' || i, 1000, jsonb_build_object('en', jsonb_build_object('name', 'item ' || i)) from generate_series(1, 3000) i""", (MENS,))
    harness.admin_sql(db, "analyze public.products")
    plan = "\n".join(r[0] for r in harness.admin_sql(db, """explain select id from public.products p
        where p.active and p.i18n <> '{}'::jsonb and private.i18n_doc(p.i18n) like private.like_any('item 2999')"""))
    assert "products_i18n_trgm_idx" in plan, plan


def test_only_objects_of_reasonable_size_are_accepted(db):
    with pytest.raises(psycopg.errors.CheckViolation):
        harness.admin_sql(db, "update public.products set i18n = '[1, 2]' where id = %s", (P1,))
    with pytest.raises(psycopg.errors.CheckViolation):
        harness.admin_sql(db, "update public.categories set i18n = %s::jsonb where id = %s",
                          (json.dumps({"en": {"name": "x" * 9000}}), MENS))
    with pytest.raises(psycopg.errors.NotNullViolation):
        harness.admin_sql(db, "update public.products set i18n = null where id = %s", (P1,))


def test_i18n_doc_ignores_odd_shapes(db):
    [(empty, flat, both)] = harness.admin_sql(db, """select private.i18n_doc('{}'), private.i18n_doc('{"en": "flat"}'),
        private.i18n_doc('{"en": {"name": "Ring", "n": 5}, "de": {"name": "Ring Ä"}}')""")
    assert (empty, flat) == ("", "") and sorted(both.split()) == ["ring", "ring", "ä"]   # numbers are not text


def test_seed_adds_languages_and_keeps_written_ones(db):
    """Re-running the department seed adds missing languages but keeps what is already written."""
    harness.admin_sql(db, """update public.categories set i18n = '{"en": {"name": "My rings"}}' where id = %s""", (MENS,))   # slug mens-rings
    seed = next(m for m in harness.migrations() if m.name.startswith("0010")).read_text()
    harness.admin_sql(db, seed[seed.index("update public.categories c set i18n"):])
    got = harness.admin_sql(db, "select i18n from public.categories where id = %s", (MENS,))[0][0]
    assert got["en"] == {"name": "My rings"} and got["fa"]["name"] == "انگشترهای مردانه" and got["de"]["name"] == "Herrenringe"


def test_admin_writes_translations_visitor_cannot(admin, anon, visitor, db):
    admin.q("update public.products set i18n = '{\"en\": {\"name\": \"Agate ring\"}}' where id = %s", (P2,))
    assert harness.admin_sql(db, "select i18n #>> '{en,name}' from public.products where id = %s", (P2,)) == [("Agate ring",)]
    for s in (anon, visitor):
        try:
            s.q("update public.products set i18n = '{\"en\": {\"name\": \"hacked\"}}' where id = %s", (P2,))
        except psycopg.Error:
            pass                                                         # no privilege, or row level security: no rows
    assert harness.admin_sql(db, "select i18n #>> '{en,name}' from public.products where id = %s", (P2,)) == [("Agate ring",)]
