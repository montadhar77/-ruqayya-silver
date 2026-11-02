# معرض رقية (عليها السلام) — Ruqayya Silver

موقع المعرض والمتجر الإلكتروني + لوحة تحكم منفصلة.

- **الموقع:** `index.html` — الواجهة، الأقسام، قطعة الموسم، المجموعة، عن المعرض، آراء الزبائن، التواصل، صفحات الأقسام والمنتجات، السلة وإتمام الطلب، البحث، الافتتاحية (فيديو الشعار أو حركة القوس).
- **لوحة التحكم:** `admin/` — منفصلة تماماً عن الموقع (غير مرتبطة به، ومخفية عن محركات البحث). تتحكم بـ: المنتجات وصورها، الأقسام وترتيبها وأيقوناتها، الطلبات وحالاتها، الرسائل، كل نصوص الصفحة الرئيسية وصورها، الشعار والألوان وفيديو الافتتاحية، أرقام التواصل والحسابات، التوصيل والدفع.
- **قاعدة البيانات:** Supabase، مشروع `ruqayya-silver`. المخطط في `supabase/schema.sql` والبيانات الأولية في `supabase/seed.sql`.

## Tech

Static site (no build step) · Supabase (Postgres + Auth + Storage, row level security) · GSAP + ScrollTrigger (vendored in `assets/vendor`).

- Prices are recomputed on the server in `place_order()`, so visitors cannot change them.
- Only users listed in `public.admins` can change anything; everyone else can only read the catalog, place orders and send messages.
- Uploaded images are compressed in the browser before upload (WebP, max 1800px).

## Run locally

```
python3 -m http.server 8000
# open http://localhost:8000  and  http://localhost:8000/admin/   (uses the production backend)
```

Against a local, throw-away backend with test data (needs PostgreSQL + PostgREST, see docs/RUNBOOK.md):

```
scripts/local-db.sh start
python3 tests/e2e/stack.py      # then open http://127.0.0.1:8765/?backend=local
```

## Tests

`scripts/test.sh` runs the database tests (`tests/db`, every migration, RLS, checkout) and the
browser tests (`tests/e2e`, storefront + dashboard in Chrome) against local services only.
Database changes live in `supabase/migrations/` with rollbacks in `supabase/rollbacks/`.
Operations guide (environments, staging, migrations, backups, incidents): `docs/RUNBOOK.md`.
