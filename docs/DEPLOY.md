# النشر على Cloudflare Pages — معرض رقية

> **كل خطوة في هذا الملف تمسّ الإنتاج أو حساباً مدفوعاً/خارجياً، ولا تُنفَّذ إلا بموافقة صريحة من المالك.**
> الأوامر بالإنجليزية كما تُكتب.

## لماذا Cloudflare Pages
- GitHub Pages لا يسمح بالمتاجر الإلكترونية في شروطه، ولا يسمح برؤوس أمان مخصّصة ولا بدوال.
- Cloudflare Pages (الخطة المجانية): نشر غير محدود للملفات الثابتة عبر شبكة CDN عالمية، رؤوس أمان (`_headers`)، صفحات معاينة لكل فرع، ودوال (Pages Functions) — ١٠٠ ألف طلب دالة يومياً مجاناً.

## ما الذي يُنشر
`node scripts/build.mjs` يبني المجلد `dist/`:
- **فقط** `index.html` و`admin/` و`assets/` و`robots.txt` و`404.html` و`_headers` و`_redirects`.
  لا تُنشر أبداً: `tests/`، `supabase/`، `scripts/`، `docs/`، `.github/` (البناء يفشل إن وُجد أي منها، أو أي مفتاح سرّي).
- كل ملف CSS/JS يُختم بـ `?v=<بصمة المحتوى>` → يُخزَّن في المتصفح والـ CDN سنة كاملة، ويتجدّد فور تغيّره.
- يُحذف عنوان الاختبار المحلي من سياسة أمان المحتوى.

الدالة `functions/api/rpc/[fn].js` (تُقرأ من جذر المشروع): نافذة مخزّنة مؤقتاً (cache) للقراءة فقط على دوال الكتالوج الأربع. لا تمرّ بها الطلبات ولا بيانات الزبائن.

## النشر الحالي على GitHub Pages (أمر واحد)
```bash
RQ_BASE=/-ruqayya-silver/ RQ_SITE=https://montadhar77.github.io/-ruqayya-silver/ node scripts/build.mjs dist
# ثم يُدفع محتوى dist/ كفرع gh-pages (commit فوق الفرع الحالي، دون حذف التاريخ)
```

## الخطوات (بانتظار الموافقة)

### 1) إنشاء المشروع
Cloudflare ← Workers & Pages ← Create ← Pages ← Connect to Git ← `montadhar77/-ruqayya-silver`
- Production branch: `main` (بعد دمج `hardening` فيه بموافقة)
- Build command: `node scripts/build.mjs`
- Build output directory: `dist`
- Root directory: (فارغ)

### 2) المتغيرات (Settings ← Variables and Secrets)
| المتغير | Production | Preview |
|---|---|---|
| `SUPABASE_URL` | `https://hnkjmthvgfknwdnehegr.supabase.co` | `https://rlivlqddrzdrmfqeqnox.supabase.co` |
| `SUPABASE_KEY` | المفتاح العام `sb_publishable_…` للإنتاج | المفتاح العام لـ staging |
| `RQ_SITE` | عنوان الموقع الكامل، مثل `https://ruqayya-silver.pages.dev/` (صورة المشاركة في واتساب، خريطة الموقع لمحركات البحث) | (فارغ) |

(المفتاحان عامّان بطبيعتهما — موجودان أصلاً في `assets/js/config.js`. لا يوضع هنا أي مفتاح `sb_secret_`.)

### 3) النطاق
- Custom domains ← أضف النطاق (مثلاً `ruqayya-silver.com` و`www`). التخزين المؤقت لدالة الكتالوج يعمل على النطاق المخصّص (على `*.pages.dev` تعمل الدالة بلا تخزين).
- أضف النطاق ونطاق `*.pages.dev` الإنتاجي إلى `PRODUCTION_HOSTS` في `assets/js/config.js`:
  ```js
  var PRODUCTION_HOSTS = ["ruqayya-silver.pages.dev", "ruqayya-silver.com", "www.ruqayya-silver.com"];
  ```
  (أي `*.pages.dev` آخر = نسخة معاينة → تتصل بـ staging تلقائياً.)

### 4) ربط الأجزاء الأخرى بالنطاق الجديد
- Supabase (الإنتاج) ← Authentication ← URL Configuration: Site URL = النطاق الجديد، وأضف `https://<النطاق>/admin/` إلى Redirect URLs. (ترتيب فقط: الدخول باسم المستخدم وكلمة المرور والرمز لا يستعمل روابط بريد.)
- فقط إن فُعّلت بوابة الطلبات `edge` (الإنتاج اليوم على `rpc`): أسرار الدوال `ALLOWED_ORIGINS=https://ruqayya-silver.com,https://www.ruqayya-silver.com,https://ruqayya-silver.pages.dev`، وأضف النطاق إلى مفتاح Cloudflare Turnstile.

### متى تظهر تعديلات اللوحة في الموقع
- **المالك:** فوراً. بعد كل حفظ في اللوحة (منتج، صورة، قسم، نص…) يقرأ الموقع في **المتصفح نفسه** من قاعدة البيانات مباشرة لمدة ١٠ دقائق، متجاوزاً التخزين المؤقت (`rq_fresh` في `admin.js` و`site.js`).
- **الزوار:** خلال دقيقة تقريباً (مدة التخزين المؤقت لدالة الكتالوج ٦٠ ثانية، ثم تتجدد في الخلفية). على GitHub Pages لا يوجد تخزين مؤقت، فالتعديل فوري للجميع.

### 5) التحقق بعد النشر
```bash
curl -sI https://<domain>/ | grep -iE "strict-transport|x-frame|x-content-type|cache-control"
curl -sI https://<domain>/admin/ | grep -iE "x-frame|x-robots|cache-control"
curl -s  https://<domain>/supabase/schema.sql -o /dev/null -w "%{http_code}\n"     # 404
curl -sI "https://<domain>/api/rpc/catalog_home?p_limit=60" | grep -i x-rq-cache   # MISS ثم HIT
```
ثم: تصفّح، أضف للسلة، اطلب طلباً تجريبياً واحذفه من اللوحة، ادخل اللوحة بالتحقق بخطوتين.

### 6) إيقاف GitHub Pages
بعد التأكد: GitHub ← Settings ← Pages ← Unpublish، واحذف الفرع `gh-pages` لاحقاً.

## التراجع
- **الموقع:** Cloudflare Pages ← Deployments ← اختر نشراً سابقاً ← *Rollback to this deployment* (فوري، دون بناء).
- **الكود:** `git revert <commit>` على `main` ثم يُبنى تلقائياً؛ أو الرجوع الكامل إلى `v1.0-pre-hardening` (الفرع `checkpoint/v1.0-pre-hardening`).
- **قاعدة البيانات:** ملفات `supabase/rollbacks/NNNN_*.down.sql` بالترتيب العكسي (انظر RUNBOOK §3).
- الموقع الجديد يعمل مع قاعدة البيانات قبل الترحيلات وبعدها (يرجع تلقائياً للاستعلامات السابقة)، لذا ترتيب النشر آمن: **الموقع أولاً، ثم الترحيلات واحداً واحداً.**

## الحدود المجانية المعنية
| الخدمة | المجاني | ما يحدث عند التجاوز |
|---|---|---|
| Pages (ملفات ثابتة) | غير محدود | — |
| Pages Functions | ١٠٠٬٠٠٠ طلب/يوم | تفشل الدالة → الموقع يتصل بقاعدة البيانات مباشرة تلقائياً. خطة Workers Paid ‏٥$/شهر = ١٠ ملايين طلب. |
| Turnstile | مجاني | — |
