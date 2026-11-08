-- =====================================================================
-- 0010 — translations: English, Persian, Urdu and German beside Arabic
--
-- * products.i18n / categories.i18n: optional translations, one object per language:
--     {"en": {"name": "…", "description": "…", "stone": "…", "metal": "…", "badge": "…"},
--      "fa": {…}, "ur": {…}, "de": {…}}
--   Arabic stays in the existing columns (name, description …); an empty translation
--   falls back to Arabic on the site. Orders, the dashboard and notifications keep Arabic.
-- * Search also finds products by their translated names and descriptions, and
--   departments by their translated names.
-- * Fills in the translations of the departments and the stone sub-departments
--   (a language already written for a department is kept; editable from the dashboard).
-- Verify after applying:
--   select slug, i18n #>> '{en,name}' from public.categories order by parent_id nulls first, sort;
-- Rollback: supabase/rollbacks/0010_translations.down.sql
-- =====================================================================

alter table public.products add column i18n jsonb not null default '{}'::jsonb;
alter table public.categories add column i18n jsonb not null default '{}'::jsonb;
alter table public.products add constraint products_i18n_shape
  check (jsonb_typeof(i18n) = 'object' and octet_length(i18n::text) <= 40000);
alter table public.categories add constraint categories_i18n_shape
  check (jsonb_typeof(i18n) = 'object' and octet_length(i18n::text) <= 8000);

-- every translated text of a row, normalised like private.ar_norm (for search)
create function private.i18n_doc(p jsonb)
 returns text language sql immutable parallel safe cost 200 set search_path to ''
as $function$
  select private.ar_norm(coalesce((
    select string_agg(v #>> '{}', ' ')
    from jsonb_path_query(coalesce(p, '{}'::jsonb), 'lax $.*.* ? (@.type() == "string")') as v), ''))
$function$;
revoke all on function private.i18n_doc(jsonb) from public;
grant execute on function private.i18n_doc(jsonb) to anon, authenticated, service_role;

create index products_i18n_trgm_idx on public.products
  using gin (private.i18n_doc(i18n) extensions.gin_trgm_ops) where i18n <> '{}'::jsonb;

create or replace function public.search_products(p_q text, p_limit integer default 24, p_offset integer default 0)
 returns jsonb language plpgsql stable security definer set search_path to 'public', 'extensions', 'pg_temp'
as $function$
declare
  v_s text := left(private.ar_norm(p_q), 80);
  v_pat text := private.like_any(left(private.ar_norm(p_q), 80));
  v_res jsonb;
begin
  if v_s = '' then return jsonb_build_object('q', '', 'total', 0, 'items', '[]'::jsonb); end if;
  with cats as (
    select c.id from public.categories c
    where c.active and (private.ar_norm(c.name) like v_pat or (c.i18n <> '{}'::jsonb and private.i18n_doc(c.i18n) like v_pat))),
  matched as (
    select p.id from public.products p
    where p.active and private.product_doc(p.name, p.stone, p.metal, p.badge, p.description) like v_pat
    union
    select p.id from public.products p
    where p.active and p.i18n <> '{}'::jsonb and private.i18n_doc(p.i18n) like v_pat
    union
    select p.id from public.products p where p.active and p.category_id in (select id from cats)
    union
    select p.id from public.products p where p.active and p.subcategory_id in (select id from cats)),
  hits as (
    select p.*, (n.nn like v_pat or n.tn like v_pat) as name_hit,
           greatest(extensions.word_similarity(v_s, n.nn), extensions.word_similarity(v_s, n.tn)) as score
    from public.products p join matched m on m.id = p.id
    cross join lateral (select private.ar_norm(p.name) as nn,
                               private.ar_norm(concat_ws(' ', p.i18n #>> '{en,name}', p.i18n #>> '{fa,name}', p.i18n #>> '{ur,name}', p.i18n #>> '{de,name}')) as tn) n),
  page as (
    select h.*, row_number() over (order by h.name_hit desc, h.score desc, h.sort, h.created_at desc, h.id) as rn
    from hits h
    order by rn
    limit least(greatest(coalesce(p_limit, 24), 1), 60) offset least(greatest(coalesce(p_offset, 0), 0), 10000))
  select jsonb_build_object(
    'q', v_s,
    'total', (select count(*) from hits),
    'items', coalesce((select jsonb_agg(to_jsonb(x) - 'name_hit' - 'score' - 'rn' order by x.rn) from page x), '[]'::jsonb))
  into v_res;
  return v_res;
end
$function$;

-- ---------- translations of the departments and the stone sub-departments ----------
update public.categories c set i18n = t.i18n::jsonb || c.i18n
from (values
  ('mens-rings', '{"en":{"name":"Men''s Rings","subtitle":"Agate · Turquoise · Shathar"},"fa":{"name":"انگشترهای مردانه","subtitle":"عقیق · فیروزه · شذر"},"ur":{"name":"مردانہ انگوٹھیاں","subtitle":"عقیق · فیروزہ · شذر"},"de":{"name":"Herrenringe","subtitle":"Achat · Türkis · Schathar"}}'),
  ('womens-rings', '{"en":{"name":"Women''s Rings","subtitle":"Dur-e-Najaf · Turquoise"},"fa":{"name":"انگشترهای زنانه","subtitle":"دُرّ نجف · فیروزه"},"ur":{"name":"زنانہ انگوٹھیاں","subtitle":"دُرِ نجف · فیروزہ"},"de":{"name":"Damenringe","subtitle":"Dur-e-Najaf · Türkis"}}'),
  ('bracelets-necklaces', '{"en":{"name":"Bracelets & Necklaces","subtitle":"925 sterling silver"},"fa":{"name":"دستبند و گردنبند","subtitle":"نقره‌ی ۹۲۵"},"ur":{"name":"کنگن اور ہار","subtitle":"925 اسٹرلنگ چاندی"},"de":{"name":"Armbänder & Ketten","subtitle":"925er Sterlingsilber"}}'),
  ('gemstones', '{"en":{"name":"Gemstones","subtitle":"Natural, hand-picked"},"fa":{"name":"سنگ‌های قیمتی","subtitle":"طبیعی و برگزیده"},"ur":{"name":"قیمتی پتھر","subtitle":"قدرتی اور منتخب"},"de":{"name":"Edelsteine","subtitle":"Natürlich und handverlesen"}}'),
  ('misbaha', '{"en":{"name":"Prayer Beads","subtitle":"Yusr · Amber · Agate"},"fa":{"name":"تسبیح","subtitle":"یُسر · کهربا · عقیق"},"ur":{"name":"تسبیحیں","subtitle":"یسر · کہربا · عقیق"},"de":{"name":"Gebetsketten","subtitle":"Yusr · Bernstein · Achat"}}'),
  ('watches', '{"en":{"name":"Watches","subtitle":"Classic & modern"},"fa":{"name":"ساعت","subtitle":"کلاسیک و مدرن"},"ur":{"name":"گھڑیاں","subtitle":"کلاسیکی اور جدید"},"de":{"name":"Uhren","subtitle":"Klassisch & modern"}}'),
  ('perfumes-incense', '{"en":{"name":"Perfumes & Incense","subtitle":"Oud · Musk · Bakhoor"},"fa":{"name":"عطر و بخور","subtitle":"عود · مشک · بخور"},"ur":{"name":"عطر اور بخور","subtitle":"عود · مشک · بخور"},"de":{"name":"Parfüms & Räucherwerk","subtitle":"Oud · Moschus · Bakhoor"}}'),
  ('prayer-rugs', '{"en":{"name":"Prayer Rugs","subtitle":"Hand-embroidered"},"fa":{"name":"سجاده‌ی نماز","subtitle":"گلدوزی دستی"},"ur":{"name":"جائے نماز","subtitle":"ہاتھ کی کڑھائی"},"de":{"name":"Gebetsteppiche","subtitle":"Handbestickt"}}'),
  ('gifts', '{"en":{"name":"Gifts","subtitle":"Luxury gift wrapping"},"fa":{"name":"هدایا","subtitle":"بسته‌بندی فاخر"},"ur":{"name":"تحائف","subtitle":"شاندار گفٹ پیکنگ"},"de":{"name":"Geschenke","subtitle":"Edle Geschenkverpackung"}}'),
  ('shrine-gifts', '{"en":{"name":"Holy Shrine Gifts","subtitle":"From the shrines of Imam Husayn and Abu al-Fadl al-Abbas (a.s.)"},"fa":{"name":"هدایای عتبات عالیات","subtitle":"از حرم امام حسین و حضرت ابوالفضل العباس (ع)"},"ur":{"name":"مقدس روضوں کے تحائف","subtitle":"امام حسینؑ اور حضرت ابوالفضل العباسؑ کے روضوں سے"},"de":{"name":"Geschenke der heiligen Schreine","subtitle":"Aus den Schreinen von Imam Husain und Abu al-Fadl al-Abbas (a.s.)"}}'),
  ('mens-rings-aqeeq', '{"en":{"name":"Men''s Agate Rings","subtitle":"Yemeni agate"},"fa":{"name":"انگشترهای عقیق مردانه","subtitle":"عقیق یمنی"},"ur":{"name":"مردانہ عقیق کی انگوٹھیاں","subtitle":"یمنی عقیق"},"de":{"name":"Herren-Achatringe","subtitle":"Jemenitischer Achat"}}'),
  ('mens-rings-turquoise', '{"en":{"name":"Men''s Turquoise Rings","subtitle":"Nishapur turquoise"},"fa":{"name":"انگشترهای فیروزه مردانه","subtitle":"فیروزه‌ی نیشابوری"},"ur":{"name":"مردانہ فیروزے کی انگوٹھیاں","subtitle":"نیشاپوری فیروزہ"},"de":{"name":"Herren-Türkisringe","subtitle":"Nishapur-Türkis"}}'),
  ('mens-rings-ruby', '{"en":{"name":"Men''s Ruby Rings","subtitle":"Ruby"},"fa":{"name":"انگشترهای یاقوت مردانه","subtitle":"یاقوت"},"ur":{"name":"مردانہ یاقوت کی انگوٹھیاں","subtitle":"یاقوت"},"de":{"name":"Herren-Rubinringe","subtitle":"Rubin"}}'),
  ('mens-rings-durr-najaf', '{"en":{"name":"Men''s Dur-e-Najaf Rings","subtitle":"Dur-e-Najaf"},"fa":{"name":"انگشترهای دُرّ نجف مردانه","subtitle":"دُرّ نجف"},"ur":{"name":"مردانہ دُرِ نجف کی انگوٹھیاں","subtitle":"دُرِ نجف"},"de":{"name":"Herrenringe mit Dur-e-Najaf","subtitle":"Dur-e-Najaf"}}'),
  ('mens-rings-shathar', '{"en":{"name":"Men''s Shathar Rings","subtitle":"Shathar"},"fa":{"name":"انگشترهای شذر مردانه","subtitle":"شذر"},"ur":{"name":"مردانہ شذر کی انگوٹھیاں","subtitle":"شذر"},"de":{"name":"Herrenringe mit Schathar","subtitle":"Schathar"}}'),
  ('mens-rings-emerald', '{"en":{"name":"Men''s Emerald Rings","subtitle":"Emerald"},"fa":{"name":"انگشترهای زمرد مردانه","subtitle":"زمرد"},"ur":{"name":"مردانہ زمرد کی انگوٹھیاں","subtitle":"زمرد"},"de":{"name":"Herren-Smaragdringe","subtitle":"Smaragd"}}'),
  ('mens-rings-peridot', '{"en":{"name":"Men''s Peridot Rings","subtitle":"Peridot"},"fa":{"name":"انگشترهای زبرجد مردانه","subtitle":"زبرجد"},"ur":{"name":"مردانہ زبرجد کی انگوٹھیاں","subtitle":"زبرجد"},"de":{"name":"Herren-Peridotringe","subtitle":"Peridot"}}'),
  ('mens-rings-jaza', '{"en":{"name":"Men''s Onyx (Jaza'') Rings","subtitle":"Yemeni onyx"},"fa":{"name":"انگشترهای جزع مردانه","subtitle":"جزع یمنی"},"ur":{"name":"مردانہ جزع کی انگوٹھیاں","subtitle":"یمنی جزع"},"de":{"name":"Herren-Onyxringe","subtitle":"Jemenitischer Onyx"}}'),
  ('mens-rings-sulaimani', '{"en":{"name":"Men''s Sulaimani Rings","subtitle":"Sulaimani agate"},"fa":{"name":"انگشترهای سلیمانی مردانه","subtitle":"سلیمانی"},"ur":{"name":"مردانہ سلیمانی کی انگوٹھیاں","subtitle":"سلیمانی"},"de":{"name":"Herrenringe mit Sulaimani","subtitle":"Sulaimani-Achat"}}'),
  ('mens-rings-hadid', '{"en":{"name":"Men''s Hadid Sini Rings","subtitle":"Hadid Sini (hematite)"},"fa":{"name":"انگشترهای حدید چینی مردانه","subtitle":"حدید چینی"},"ur":{"name":"مردانہ حدید چینی کی انگوٹھیاں","subtitle":"حدید چینی"},"de":{"name":"Herrenringe mit Hadid Sini","subtitle":"Hadid Sini (Hämatit)"}}'),
  ('womens-rings-aqeeq', '{"en":{"name":"Women''s Agate Rings","subtitle":"Agate"},"fa":{"name":"انگشترهای عقیق زنانه","subtitle":"عقیق"},"ur":{"name":"زنانہ عقیق کی انگوٹھیاں","subtitle":"عقیق"},"de":{"name":"Damen-Achatringe","subtitle":"Achat"}}'),
  ('womens-rings-turquoise', '{"en":{"name":"Women''s Turquoise Rings","subtitle":"Turquoise"},"fa":{"name":"انگشترهای فیروزه زنانه","subtitle":"فیروزه"},"ur":{"name":"زنانہ فیروزے کی انگوٹھیاں","subtitle":"فیروزہ"},"de":{"name":"Damen-Türkisringe","subtitle":"Türkis"}}'),
  ('womens-rings-ruby', '{"en":{"name":"Women''s Ruby Rings","subtitle":"Ruby"},"fa":{"name":"انگشترهای یاقوت زنانه","subtitle":"یاقوت"},"ur":{"name":"زنانہ یاقوت کی انگوٹھیاں","subtitle":"یاقوت"},"de":{"name":"Damen-Rubinringe","subtitle":"Rubin"}}'),
  ('womens-rings-emerald', '{"en":{"name":"Women''s Emerald Rings","subtitle":"Emerald"},"fa":{"name":"انگشترهای زمرد زنانه","subtitle":"زمرد"},"ur":{"name":"زنانہ زمرد کی انگوٹھیاں","subtitle":"زمرد"},"de":{"name":"Damen-Smaragdringe","subtitle":"Smaragd"}}'),
  ('womens-rings-durr-najaf', '{"en":{"name":"Women''s Dur-e-Najaf Rings","subtitle":"Dur-e-Najaf"},"fa":{"name":"انگشترهای دُرّ نجف زنانه","subtitle":"دُرّ نجف"},"ur":{"name":"زنانہ دُرِ نجف کی انگوٹھیاں","subtitle":"دُرِ نجف"},"de":{"name":"Damenringe mit Dur-e-Najaf","subtitle":"Dur-e-Najaf"}}'),
  ('womens-rings-pearl', '{"en":{"name":"Women''s Pearl Rings","subtitle":"Pearl"},"fa":{"name":"انگشترهای مروارید زنانه","subtitle":"مروارید"},"ur":{"name":"زنانہ موتی کی انگوٹھیاں","subtitle":"موتی"},"de":{"name":"Damen-Perlenringe","subtitle":"Perle"}}'),
  ('womens-rings-coral', '{"en":{"name":"Women''s Coral Rings","subtitle":"Coral"},"fa":{"name":"انگشترهای مرجان زنانه","subtitle":"مرجان"},"ur":{"name":"زنانہ مرجان کی انگوٹھیاں","subtitle":"مرجان"},"de":{"name":"Damen-Korallenringe","subtitle":"Koralle"}}'),
  ('womens-rings-zircon', '{"en":{"name":"Women''s Zircon Rings","subtitle":"Zircon"},"fa":{"name":"انگشترهای زرکن زنانه","subtitle":"زرکن"},"ur":{"name":"زنانہ زرقون کی انگوٹھیاں","subtitle":"زرقون"},"de":{"name":"Damen-Zirkonringe","subtitle":"Zirkon"}}')
) as t(slug, i18n)
where c.slug = t.slug;
