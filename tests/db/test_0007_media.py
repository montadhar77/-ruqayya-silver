"""0007: finding media files nothing uses any more (so storage can be freed safely)."""
import json

import psycopg
import pytest

import harness

BASE = "https://example.supabase.co/storage/v1/object/public/media/"
P1 = "20000000-0000-4000-8000-000000000001"


def add_obj(db, name, hours_old=48, size=1000):
    harness.admin_sql(db, """insert into storage.objects (bucket_id, name, metadata, created_at)
        values ('media', %s, jsonb_build_object('size', %s), now() - make_interval(hours => %s))""", (name, size, hours_old))


def test_unused_media(db, admin, anon):
    # used: product photo (+ its two sizes), department image, logo in settings, photo kept in an order
    for n in ("products/a.v.webp", "products/a.v-1080.webp", "products/a.v-480.webp", "categories/c.webp",
              "brand/logo.png", "products/old-in-order.webp"):
        add_obj(db, n)
    # unused: removed photo (+ sizes), a replaced hero image; too new to judge: a fresh upload
    for n in ("products/gone.v.webp", "products/gone.v-1080.webp", "products/gone.v-480.webp", "hero/replaced.webp"):
        add_obj(db, n, size=2000)
    add_obj(db, "products/just-uploaded.v.webp", hours_old=0)
    harness.admin_sql(db, "update public.products set images = %s where id = %s", ([BASE + "products/a.v.webp"], P1))
    harness.admin_sql(db, "update public.categories set image_url = %s where slug = 'misbaha'", (BASE + "categories/c.webp",))
    harness.admin_sql(db, "update public.settings set data = data || %s::jsonb", (json.dumps({"brand": {"logo": BASE + "brand/logo.png"}}),))
    harness.admin_sql(db, """insert into public.orders (customer_name, phone, items) values ('زبون', '07700000001', %s::jsonb)""",
                      (json.dumps([{"name": "قطعة", "image": BASE + "products/old-in-order.webp"}]),))
    r = admin.one("select public.admin_unused_media()")
    assert sorted(r["names"]) == sorted(["products/gone.v.webp", "products/gone.v-1080.webp", "products/gone.v-480.webp", "hero/replaced.webp"])
    assert r["count"] == 4 and r["bytes"] == 8000
    assert "products/just-uploaded.v.webp" not in admin.one("select public.admin_unused_media(0)")["names"]   # never younger than 1 hour


def test_unused_media_is_admin_only(anon, visitor, admin_password_only):
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        anon.q("select public.admin_unused_media()")
    for s in (visitor, admin_password_only):
        with pytest.raises(psycopg.errors.InsufficientPrivilege, match="not_allowed"):
            s.q("select public.admin_unused_media()")
