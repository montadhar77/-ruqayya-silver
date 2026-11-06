# تجهيز Supabase للإنتاج — معرض رقية

> لا يُنفَّذ أي بند هنا على مشروع الإنتاج (`ruqayya-silver`، `hnkjmthvgfknwdnehegr`) إلا بموافقة صريحة من المالك.
> كل الترحيلات مُختبرة آلياً محلياً، وطُبّقت كلها على مشروع staging (‏`rlivlqddrzdrmfqeqnox`، PostgreSQL 17) — ما عدا `0008` (حذف الجداول القديمة)، المُختبر محلياً فقط.

## 1. الخطة (قرار مالي للمالك)
| | Free (الحالي) | Pro |
|---|---|---|
| السعر | ٠ | يبدأ من ٢٥$/شهر (يشمل ١٠$ رصيد حوسبة = خادم Micro) |
| النسخ الاحتياطي | **لا يوجد** | يومي، يُحفظ ٧ أيام |
| التوقف | يتوقف بعد أسبوع بلا نشاط | لا يتوقف |
| قاعدة البيانات / التخزين / النقل | ٥٠٠ م.ب / ١ غ.ب / ٥ غ.ب | ٨ غ.ب / ١٠٠ غ.ب / ٢٥٠ غ.ب |
| تجاوز النقل | — | ٠٫٠٩$ لكل غ.ب |

**التوصية:** Pro قبل الإطلاق العام (النسخ الاحتياطي وعدم التوقف وحدهما يبرّران ذلك لمتجر يستقبل طلبات). الترقية من: Organization ← Billing. PITR (الاستعادة لأي لحظة) اختياري: ١٠٠$/شهر لكل ٧ أيام — غير ضروري الآن مع النسخ اليومية + النسخة المشفّرة الليلية في GitHub.

## 2. إعدادات Authentication (لوحة Supabase ← Authentication)
- [ ] **Providers ← Email:** Allow new users to sign up = **Off** (المدير الوحيد موجود؛ لا تسجيل عام).
- [ ] **Password security:** Minimum length = **12**، تفعيل **Leaked password protection** (يتطلب Pro)، Required characters = letters + digits.
- [ ] **Multi-Factor:** TOTP = Enabled (مفعّل افتراضياً). بعد نشر اللوحة الجديدة يُطبَّق `0005` فتصبح الخطوة الثانية إلزامية من قاعدة البيانات.
- [ ] **SMTP:** خادم بريد خاص (Resend / Brevo / Amazon SES) — بريد Supabase الافتراضي محدود بعدد قليل من الرسائل في الساعة.
- [ ] **URL Configuration:** Site URL = نطاق الموقع، Redirect URLs = `https://<النطاق>/admin/`.
- [ ] **Sessions:** JWT expiry 3600 (الافتراضي)، Refresh token reuse interval الافتراضي. اللوحة نفسها تخرج بعد ٣٠ دقيقة خمول.
- [ ] غيّر كلمة مرور المدير المؤقتة إلى ١٢ حرفاً على الأقل من «حسابي» في اللوحة.

## 3. إعدادات API وقاعدة البيانات
- [ ] **API ← Exposed schemas:** `public` فقط (الافتراضي). المخطط `private` لا يُعرض أبداً.
- [ ] **API ← Max rows:** يبقى 1000 (اللوحة تجلب المنتجات على دفعات من 1000، والطلبات عبر `admin_orders`).
- [ ] **Database ← Network restrictions:** (Pro) اسمح فقط بعناوين GitHub Actions إن فُعّل النسخ الليلي، أو اتركها مفتوحة مع كلمة مرور قوية.
- [ ] **SSL enforcement:** On.
- [ ] الامتدادات: `pg_trgm` (يُنشئه `0006`)، `pg_cron` و`pg_net` (لـ `notify_cron.sql`).
- مهلة الاستعلام الافتراضية في Supabase: anon ٣ ث، authenticated ٨ ث — كافية (أبطأ دالة مقيسة ~٧٠ م.ث على ٥٠٠٠ منتج).
- اتصالات قاعدة البيانات: الموقع لا يتصل بقاعدة البيانات مباشرة؛ كل الطلبات تمرّ عبر PostgREST (مجمّع اتصالات) والدوال، فلا خطر استنزاف الاتصالات من الزوار.

## 4. ترتيب الإطلاق على الإنتاج (كل خطوة بموافقة، مع نسخة احتياطية قبلها)
| # | الخطوة | التحقق | التراجع |
|---|---|---|---|
| 0 | نسخة احتياطية: `scripts/backup.sh` (أو Pro backups) | الملف المشفّر موجود + `scripts/restore-drill.sh` ينجح | — |
| 1 | نشر الموقع الجديد على Cloudflare Pages (`docs/DEPLOY.md`) — يعمل مع قاعدة البيانات الحالية كما هي | تصفّح + طلب تجريبي | Rollback في Pages |
| 2 | `0001` المخزون الذري + منع التكرار | استعلامات التحقق في رأس الملف | `rollbacks/0001…down.sql` |
| 3 | `0002` حدود الإغراق + نشر `submit-order` و`submit-inquiry` + مفاتيح Turnstile + `gateway: "edge"` | طلب تجريبي عبر الدالة؛ الطلب السابع من نفس الجهاز يُرفض | `gateway: "rpc"` ثم `rollbacks/0002…` |
| 4 | `0003` الإشعارات + أسرار تيليجرام + `notify_cron.sql` | زر «رسالة تجريبية» في اللوحة | إيقاف cron ثم `rollbacks/0003…` |
| 5 | `0004` أقل صلاحيات + سجل الأخطاء | اختبار رفع صورة من اللوحة | `rollbacks/0004…` |
| 6 | تفعيل MFA للمدير من اللوحة الجديدة، **ثم** `0005` | دخول بكلمة المرور فقط لا يسمح بأي تعديل | `update private.admin_policy set require_mfa=false` أو `rollbacks/0005…` |
| 7 | `0006` الكتالوج والبحث | `select public.catalog_home() -> 'total';` | `rollbacks/0006…` (الموقع يرجع تلقائياً للاستعلامات السابقة) |
| 8 | `0007` تنظيف الصور | زر «فحص الملفات غير المستخدمة» | `rollbacks/0007…` |
| 9 | `0008` حذف الجداول القديمة الفارغة (يرفض إن وُجدت بيانات) + حذف الحاوية `artwork-images` من Storage | `select to_regclass('public.exhibitions');` = null | `rollbacks/0008…` |
| 10 | استبدال المنتجات التجريبية بالحقيقية وصورها، أرقام واتساب/الهاتف | — | — |

### حالة الإنتاج (٦ تشرين الثاني ٢٠٢٦، بموافقة المالك)
- طُبِّقت على الإنتاج: `0001`، `0002`، `0003`، `0004`، `0005` (ثم `require_mfa = false` في الترحيل نفسه — التحقق بخطوتين اختياري حالياً)، `0006`، `0007`، `0009` (الأقسام الفرعية للخواتم الرجالية والنسائية حسب الحجر).
- **لم يُطبَّق `0008`**: أوقفه شرط الأمان لأن `public.site_settings` فيه صف واحد (قيم قالب فقط مثل `[ADDRESS]`). الجداول القديمة باقية ولا يستعملها الموقع؛ لحذفها لاحقاً: احذف ذلك الصف بموافقة المالك ثم طبّق `0008`.
- حُذفت المنتجات التجريبية الثمانية (لا طلبات مرتبطة بها)؛ المتجر فارغ حتى تُضاف المنتجات الحقيقية من اللوحة.
- دخول اللوحة باسم مستخدم (يُحوَّل داخلياً إلى `<الاسم>@admin.ruqaya.invalid`)؛ استعادة كلمة المرور بالبريد غير ممكنة — تُغيَّر من لوحة Supabase ← Authentication ← Users.
- `0010` (اللغات: ترجمات المنتجات والأقسام + بحث بالترجمات): تُطبَّق بعد موافقة المالك على الصور — انظر RUNBOOK §16.
- الموقع منشور على GitHub Pages من الفرع `gh-pages` (ناتج `RQ_BASE=/-ruqayya-silver/ node scripts/build.mjs`)، والطلبات عبر `place_order` مباشرة (`gateway: "rpc"`) مع حدود الإغراق من `0002`.

كيف يُطبَّق ترحيل: SQL Editor في مشروع الإنتاج ← الصق محتوى الملف ← Run، في وقت هادئ، ثم استعلامات «Verify» المكتوبة في رأس الملف. (أو `supabase link --project-ref hnkjmthvgfknwdnehegr && supabase db push` بعد أن يُسجَّل `0000` كمطبّق: `supabase migration repair --status applied 0000`.)

## 5. الدوال (Edge Functions) على الإنتاج
```bash
supabase link --project-ref hnkjmthvgfknwdnehegr
supabase secrets set TURNSTILE_SECRET=... ALLOWED_ORIGINS=https://<domain> TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... CRON_SECRET=$(openssl rand -hex 24)
for f in submit-order submit-inquiry notify-retry notify-test health; do supabase functions deploy $f --no-verify-jwt; done
```

## 6. النسخ الاحتياطي والاستعادة
- **Pro:** نسخ يومية تلقائية ٧ أيام (Database ← Backups ← Restore).
- **مستقل عن Supabase:** `.github/workflows/backup.yml` ليلياً، مشفّر بمفتاح age للمالك (RUNBOOK §11). مُختبر: نسخ ← تشفير ← استعادة في قاعدة مؤقتة ← مطابقة الأعداد.
- **الصور:** ليست في نسخة قاعدة البيانات. شهرياً: Storage ← media ← تنزيل، أو `rclone` إلى R2.
- **التمرين:** مرة كل شهر شغّل `scripts/restore-drill.sh` على آخر نسخة (لا يلمس أي قاعدة حية).

## 7. المراقبة
- UptimeRobot / Better Stack (مجاني): الصفحة الرئيسية + `https://<ref>.supabase.co/functions/v1/health` كل ٥ دقائق.
- اللوحة: عدد أخطاء الزوار (`client_error_summary`)، حالة إشعار كل طلب.
- Supabase ← Reports (API / Database) و Advisors (Security + Performance) بعد كل ترحيل.
- تحذيرات Advisor المتبقية على staging مقصودة: دوال `SECURITY DEFINER` المتاحة للزوار (`place_order`, `log_client_error`, ودوال الكتالوج التي لا تُرجع إلا المنتجات الظاهرة) وللمدير (دوال اللوحة تتحقق من صلاحية المدير + aal2 داخلياً).
