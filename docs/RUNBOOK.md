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

## 5. الطلبات والمخزون (المرحلة 1)

- `place_order` يحجز المخزون داخل نفس العملية التي تُنشئ الطلب: آخر قطعة لا تُباع مرتين مهما ضغط الزبائن معاً.
- كل نموذج طلب يحمل مفتاحاً عشوائياً (`p_idempotency_key`)؛ إعادة الإرسال (ضغطتان، انقطاع إنترنت) تعيد **نفس** الطلب.
- إلغاء الطلب من اللوحة يعيد قطعه للمخزون، وإرجاعه من الإلغاء يحجزها من جديد (ويرفض إن بيعت لغيره)، وحذف طلب محجوز يعيد قطعه.
- سجل كل حركة: جدول `stock_movements` (للمدير فقط):
  ```sql
  select m.created_at, p.name, m.delta, m.reason, m.order_no from stock_movements m join products p on p.id = m.product_id order by m.created_at desc limit 50;
  ```
- المنتج بلا كمية (`stock` فارغ) = غير محدود ولا يُحجز.

## 6. الحماية من السبام والإغراق (المرحلة 2)

ثلاث طبقات:
1. **Cloudflare Turnstile** (في الدوال `submit-order` و`submit-inquiry`): خفي للزبون الحقيقي، يظهر مربع فقط عند الاشتباه.
2. **حقل مصيدة (honeypot)** مخفي في النموذجين: الروبوت الذي يملؤه يُرفض.
3. **حدود في قاعدة البيانات** تسري على كل الطرق (حتى الاتصال المباشر بالـ API):

| النوع | النطاق | الحد |
|---|---|---|
| طلب | نفس العنوان IP | ٦ / ١٠ دقائق، ٣٠ / يوم |
| طلب | نفس رقم الهاتف | ٤ / ١٠ دقائق، ١٢ / يوم |
| طلب | المتجر كله (قاطع طوارئ) | ٣٠٠ / ١٠ دقائق |
| رسالة | نفس العنوان IP | ٥ / ١٠ دقائق، ٣٠ / يوم |
| رسالة | الكل | ٢٠٠ / ١٠ دقائق |

تُخزَّن بصمات (sha256) فقط، لا عناوين ولا أرقام. تعديل حد:
```sql
update private.rate_rules set max_count = 10 where kind = 'order' and scope = 'ip' and window_seconds = 600;
```

**التفعيل على الإنتاج (بانتظار موافقة):** إنشاء مفاتيح Turnstile في Cloudflare ← سرّ `TURNSTILE_SECRET` في دوال Supabase ← نشر الدوال ← وضع مفتاح الموقع في `config.js` (`turnstile`) وتغيير `gateway` إلى `"edge"`. الموقع يرجع تلقائياً للطريق القديم إن لم تكن الدوال منشورة، فترتيب النشر آمن.

## 7. إشعارات تيليجرام (المرحلة 3)

- الطلب/الرسالة يُرسَل فوراً من الدالة؛ وإن فشل (تيليجرام معطل، انقطاع) يعيد `notify-retry` المحاولة كل دقيقة (pg_cron) بتباعد ١، ٢، ٤… دقائق حتى ساعة، لمدة ٣ أيام. لا يضيع أي إشعار (قد يتكرر نادراً).
- حالة الإشعار تظهر داخل الطلب في اللوحة. مفاتيح التشغيل/الإيقاف: «التواصل والمتجر ← إشعارات تيليجرام»، مع زر «إرسال رسالة تجريبية».
- **الإعداد (مرة واحدة، بانتظار موافقة):**
  1. أنشئ بوتاً عبر @BotFather واحفظ التوكن. أرسل أي رسالة للبوت، ثم افتح `https://api.telegram.org/bot<TOKEN>/getUpdates` لمعرفة `chat.id`.
  2. أسرار الدوال (Supabase ← Edge Functions ← Secrets): `TELEGRAM_BOT_TOKEN`، `TELEGRAM_CHAT_ID`، `CRON_SECRET` (عشوائي: `openssl rand -hex 24`).
  3. شغّل `supabase/scheduled/notify_cron.sql` في SQL Editor بعد استبدال `<PROJECT_REF>` و`<CRON_SECRET>`.
- فحص المعلّق:
  ```sql
  select order_no, created_at, notify_attempts, notify_error from orders where notified_at is null order by created_at desc;
  ```

## 8. الدوال (Edge Functions)

| الدالة | من يستدعيها | verify_jwt |
|---|---|---|
| `submit-order` | الموقع | false (تتحقق بنفسها: Turnstile + الأصل + حدود القاعدة) |
| `submit-inquiry` | الموقع | false |
| `notify-retry` | pg_cron (ترويسة `x-cron-secret`) | false |
| `notify-test` | لوحة التحكم (المدير فقط، تتحقق عبر `am_i_admin`) | false |
| `health` | مراقبة التوفر | false |

الأسرار: `SB_SECRET_KEY` (مفتاح `sb_secret_…`؛ إن لم يوجد تُستخدم `SUPABASE_SERVICE_ROLE_KEY` التلقائية)، `SB_PUBLISHABLE_KEY`، `TURNSTILE_SECRET`، `ALLOWED_ORIGINS` (نطاقات الموقع مفصولة بفواصل)، `TELEGRAM_BOT_TOKEN`، `TELEGRAM_CHAT_ID`، `CRON_SECRET`.

نشر (بعد موافقة): `supabase functions deploy submit-order --no-verify-jwt` (وكذا البقية) مع `--project-ref`.
