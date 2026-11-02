# دليل التشغيل — معرض رقية (عليها السلام)

دليل عملي لمن يشغّل الموقع: البيئات، الاختبارات، ترحيل قاعدة البيانات، النسخ الاحتياطي، والطوارئ.
الأوامر بالإنجليزية كما تُكتب في الطرفية.

## 1. البيئات

| البيئة | قاعدة البيانات | تُستخدم لـ |
|---|---|---|
| **production** | مشروع Supabase `ruqayya-silver` (`hnkjmthvgfknwdnehegr`) | الموقع الحقيقي والزبائن الحقيقيون. لا يُغيَّر إلا بموافقة صريحة. |
| **staging** | مشروع Supabase `ruqayya-silver-staging` (`rlivlqddrzdrmfqeqnox`)، خطة مجانية | تجربة الترحيلات والدوال قبل الإنتاج. بيانات تجريبية فقط. |
| **local** | قاعدة PostgreSQL مؤقتة على جهاز المطوّر + PostgREST حقيقي | الاختبارات الآلية. تُنشأ وتُحذف تلقائياً. |

يختار الموقع البيئة من `assets/js/config.js`:
- `?backend=local` أو `?backend=staging` أو `?backend=production` في الرابط (تُحفظ لهذا التبويب فقط).
- نسخ المعاينة على Cloudflare Pages (`*.pages.dev` غير نطاق الإنتاج) ← staging تلقائياً.
- غير ذلك ← production.

## 2. الاختبارات الآلية

المتطلبات: PostgreSQL 16+، Python 3.11+، Chrome، PostgREST 12، Deno 2.

```bash
pip install -r tests/requirements.txt
export RQ_POSTGREST=/path/to/postgrest      # https://github.com/PostgREST/postgrest/releases (v12.2.3)
scripts/test.sh            # كل شيء
scripts/test.sh db         # قاعدة البيانات فقط (الترحيلات، الصلاحيات، الطلبات، المخزون)
scripts/test.sh e2e        # الموقع ولوحة التحكم في متصفح حقيقي
```

- `tests/db/` — تبني قاعدة جديدة لكل اختبار من `supabase/tests/stub.sql` (بديل محلي لأدوار Supabase وجداول auth/storage وصلاحياتها الافتراضية كما على الإنتاج) ثم كل ملفات `supabase/migrations/`.
- `tests/e2e/stack.py` — يشغّل الموقع كما هو + PostgREST حقيقي + بوابة محلية تحاكي Supabase (`/rest/v1`, `/auth/v1` مع MFA, `/storage/v1`, `/functions/v1`). لتجربته يدوياً:
  ```bash
  python3 tests/e2e/stack.py
  # الموقع:  http://127.0.0.1:8765/?backend=local
  # اللوحة:  http://127.0.0.1:8765/admin/?backend=local   (admin@test.invalid / local-admin-pass-123)
  ```
- كل البيانات في الاختبارات مصطنعة. لا تُستخدم بيانات زبائن حقيقيين أبداً.
- GitHub Actions يشغّل نفس الاختبارات عند كل push (`.github/workflows/test.yml`).

## 3. ترحيلات قاعدة البيانات

- الملفات: `supabase/migrations/NNNN_name.sql`، ولكل ترحيل بعد الأساس ملف تراجع `supabase/rollbacks/NNNN_name.down.sql`.
- `0000_baseline.sql` = مخطط الإنتاج الحالي كما هو (أُعيد بناؤه باستعلامات قراءة فقط). **لا يُطبَّق على الإنتاج** لأنه موجود فيه أصلاً.
- الاختبار `tests/db/test_migrations.py` يتحقق أن كل ترحيل: up ← down ← up يعيد المخطط نفسه حرفياً (بمقارنة pg_dump)، وأن التراجع ينجح وفي القاعدة بيانات.

### تطبيق ترحيل على staging ثم الإنتاج
1. كل الاختبارات المحلية خضراء.
2. على staging (أول مرة فقط): `supabase/staging/bootstrap.sql` ← `0000_baseline.sql` ← `supabase/staging/seed.sql`.
3. طبّق الترحيل الجديد على staging (SQL Editor أو `supabase db push` مرتبطاً بمشروع staging)، ثم جرّب الموقع على staging.
4. **الإنتاج — يحتاج موافقة صريحة من المالك:**
   - خذ نسخة احتياطية أولاً (القسم 5).
   - طبّق الترحيل في SQL Editor لمشروع الإنتاج في وقت هادئ.
   - شغّل استعلامات التحقق المكتوبة في رأس ملف الترحيل.
   - إن ظهرت مشكلة: شغّل ملف التراجع المقابل من `supabase/rollbacks/`.

## 4. نقطة الرجوع في Git

- الوسم `v1.0-pre-hardening` والفرع `checkpoint/v1.0-pre-hardening` = الموقع قبل أعمال التحصين (commit `e92c914`).
- كل الأعمال الجديدة على الفرع `hardening`. الفرع `main` (المنشور) لم يُلمس.
- الرجوع الكامل للموقع: `git checkout main && git reset --hard v1.0-pre-hardening` ثم النشر (بعد موافقة).
