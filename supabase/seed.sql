insert into public.settings(id,data) values (1, '{"brand":{"name":"معرض رقية","full":"معرض رقية (عليها السلام)","tagline":"فضيات وأحجار كريمة · كربلاء المقدسة","logo":"","favicon":""},"intro":{"enabled":true,"video":"","every_visit":false,"max_seconds":9,"subtitle":"فضيات وأحجار كريمة · كربلاء المقدسة"},"theme":{"pearl":"#eef1ef","paper":"#f8faf8","emerald":"#0d4a3a","deep":"#072d24","silver":"#8e999b","accent":"#b08d57","ink":"#17221e","floral":true},"announcement":{"enabled":true,"items":["توصيل لجميع محافظات العراق","كل القطع مدموغة بعيار ٩٢٥","تغليف هدايا فاخر","الدفع عند الاستلام"]},"hero":{"eyebrow":"فضة عيار ٩٢٥ · صناعة يدوية","title1":"فضّةٌ","title2":"بنقشٍ كربلائي","text":"من جوار الحرم الحسيني الشريف، نقدّم خواتم العقيق والفيروز ودُرّ النجف، والمسابح والعطور وهدايا العتبات المقدسة، مصاغةً بيد حِرفيين ورثوا الصنعة.","cta1":"تسوّق الآن","cta2":"أقسام المعرض","slide_seconds":5.5,"slides":[],"stats":[{"value":"٩٢٥","label":"عيار الفضة"},{"value":"١٨","label":"محافظة يصلها التوصيل"}]},"sections":{"departments":{"show":true,"eyebrow":"Departments","title":"أقسام المعرض","text":"كل قسمٍ في محرابه، من الخاتم إلى سجادة الصلاة."},"featured":{"show":true,"eyebrow":"قطعة الموسم","product_id":"","button":"اطلبها الآن"},"collection":{"show":true,"eyebrow":"The Collection","title":"المجموعة المختارة","text":"قطع مختارة بعناية من جميع أقسام المعرض.","count":8},"band":{"show":true,"items":["فضة ٩٢٥ مدموغة","أحجار طبيعية","صناعة يدوية","هدايا العتبات المقدسة","توصيل لكل العراق"]},"about":{"show":true,"eyebrow":"Our Story","title":"من كربلاء، بحبّ رقية (ع)","text":"معرض رقية (عليها السلام) بيتٌ للفضة الأصيلة والأحجار الكريمة في كربلاء المقدسة.\nنختار كل قطعة بعناية، ونحرص أن تحمل روح المدينة وجمال صنعتها، لتكون هديةً تبقى وذكرى تُحمل.","image":""},"testimonials":{"show":true,"title":"قالوا عن المعرض","items":[]},"visit":{"show":true,"title":"زورونا","form_title":"راسلنا","form_text":"اكتب سؤالك أو طلبك الخاص، وسنتواصل معك."}},"contact":{"phone":"","whatsapp":"","address":"كربلاء المقدسة","hours":"","map_url":"","email":"","instagram":"","facebook":"","tiktok":"","telegram":"","snapchat":""},"shop":{"currency":"د.ع","delivery_fee":5000,"free_delivery_over":0,"payment_note":"الدفع نقداً عند الاستلام","whatsapp_orders":true,"cities":["كربلاء","بغداد","النجف","بابل","البصرة","ذي قار","ميسان","واسط","الديوانية","المثنى","ديالى","صلاح الدين","كركوك","نينوى","الأنبار","أربيل","السليمانية","دهوك"]},"footer":{"text":"فضيات وأحجار كريمة وهدايا العتبات المقدسة، من كربلاء إلى كل العراق.","copyright":"جميع الحقوق محفوظة لمعرض رقية (عليها السلام)"},"seo":{"title":"معرض رقية (عليها السلام) — فضيات وأحجار كريمة · كربلاء","description":"خواتم فضة رجالية ونسائية، أحجار كريمة، مسابح، ساعات، عطور وبخور، سجاد صلاة وهدايا العتبات المقدسة. توصيل لجميع محافظات العراق."}}'::jsonb) on conflict (id) do nothing;
insert into public.categories(name,subtitle,slug,icon,sort) values
('خواتم رجالية','عقيق · فيروز · شذر','mens-rings','men',1),
('خواتم نسائية','دُرّ النجف · فيروز','womens-rings','women',2),
('أساور وقلائد','فضة ٩٢٥','bracelets-necklaces','jewel',3),
('أحجار كريمة','طبيعية مختارة','gemstones','stone',4),
('مسابح','يُسر · كهرب · عقيق','misbaha','misbaha',5),
('ساعات','كلاسيك وعصرية','watches','watch',6),
('عطور وبخور','عود · مسك · بخور','perfumes-incense','perfume',7),
('سجاد صلاة','تطريز يدوي','prayer-rugs','rug',8),
('هدايا','تغليف فاخر','gifts','gift',9),
('هدايا العتبات المقدسة','من حرم الإمام الحسين وأبي الفضل العباس (ع)','shrine-gifts','lantern',10)
on conflict (slug) do nothing;
insert into public.products(category_id,name,description,price,old_price,badge,metal,stone,featured,sort)
select c.id, v.name, 'منتج تجريبي لعرض شكل الموقع — عدّله بصورك وبياناتك أو احذفه من لوحة التحكم.', v.price, v.old, v.badge, v.metal, v.stone, v.feat, v.sort from (values
('mens-rings','خاتم الفيروز النيشابوري',240000,null::int,'جديد','فضة ٩٢٥','فيروز نيشابوري',true,1),
('womens-rings','خاتم دُرّ النجف',160000,null::int,'','فضة ٩٢٥','دُرّ النجف',false,2),
('mens-rings','خاتم العقيق اليماني الملكي',320000,360000,'قطعة الموسم','فضة ٩٢٥','عقيق يماني',true,3),
('misbaha','مسبحة عقيق يماني ٣٣ حبة',95000,null::int,'الأكثر طلباً','','عقيق يماني',false,4),
('misbaha','مسبحة يُسر أسود',120000,null::int,'','','يُسر',false,5),
('mens-rings','خاتم الشذر الأصفر',210000,null::int,'','فضة ٩٢٥','شذر',false,6),
('bracelets-necklaces','قلادة فضة منقوشة',145000,null::int,'','فضة ٩٢٥','',false,7),
('perfumes-incense','بخور عود كربلائي',35000,null::int,'','','',false,8)
) v(slug,name,price,old,badge,metal,stone,feat,sort) join public.categories c on c.slug=v.slug;
insert into public.admins(user_id) select id from auth.users where email='danialwahab77@gmail.com' on conflict do nothing;
