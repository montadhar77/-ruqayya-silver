/* Default content for every editable part of the site.
   The admin dashboard saves changes to Supabase (table: settings);
   anything not saved there falls back to these values. */
window.RQ_DEFAULTS = {
  brand: {
    name: "معرض رقية",
    full: "معرض رقية (عليها السلام)",
    tagline: "فضيات وأحجار كريمة · كربلاء المقدسة",
    sub: "عليها السلام",
    logo: "",
    favicon: ""
  },
  intro: {
    enabled: true,
    video: "",
    every_visit: false,
    max_seconds: 9,
    subtitle: "فضيات وأحجار كريمة · كربلاء المقدسة"
  },
  theme: {
    deep: "#0b0d0c",
    pearl: "#121614",
    paper: "#1b201e",
    emerald: "#d6b26e",
    silver: "#b9c0bc",
    accent: "#5fae8a",
    ink: "#f3efe6",
    floral: true,
    flowers: true,
    mode: "dark"
  },
  theme_light: {
    deep: "#f4f4f1",
    pearl: "#e9eae5",
    paper: "#ffffff",
    emerald: "#134e3a",
    silver: "#5d6a64",
    accent: "#a8823c",
    ink: "#111a16"
  },
  announcement: {
    enabled: false,
    items: ["توصيل لجميع محافظات العراق", "شحن دولي لكل دول العالم", "كل القطع مدموغة بعيار ٩٢٥", "تغليف هدايا فاخر"]
  },
  hero: {
    eyebrow: "فضة عيار ٩٢٥ · صناعة يدوية",
    title1: "فضّةٌ",
    title2: "بنقشٍ كربلائي",
    flip_more: ["بأحجارٍ كريمة", "بلمسةٍ فاخرة"],
    text: "من جوار الحرم الحسيني الشريف، نقدّم خواتم العقيق والفيروز ودُرّ النجف، والمسابح والعطور وهدايا العتبات المقدسة، مصاغةً بيد حِرفيين ورثوا الصنعة.",
    cta1: "تسوّق الآن",
    cta2: "أقسام المعرض",
    slide_seconds: 5.5,
    slides: [],
    stats: [
      { value: "٩٢٥", label: "عيار الفضة" }
    ]
  },
  sections: {
    departments: { show: true, eyebrow: "Departments", title: "أقسام المعرض", text: "كل قسمٍ في محرابه، من الخاتم إلى سجادة الصلاة." },
    featured: { show: true, eyebrow: "قطعة الموسم", product_id: "", button: "اطلبها الآن" },
    collection: { show: true, eyebrow: "The Collection", title: "المجموعة المختارة", text: "قطع مختارة بعناية من جميع أقسام المعرض.", count: 8 },
    showroom: { show: true, eyebrow: "جولة في المعرض", title: "قطعٌ تُروى حكايتها", hint: "مرّر للأسفل لتتجوّل بين القطع", hint_touch: "اسحب لتتجوّل بين القطع", end_title: "كل القطع" },
    about: {
      show: true,
      eyebrow: "Our Story",
      title: "من كربلاء، بحبّ رقية (ع)",
      text: "معرض رقية (عليها السلام) بيتٌ للفضة الأصيلة والأحجار الكريمة في كربلاء المقدسة.\nنختار كل قطعة بعناية، ونحرص أن تحمل روح المدينة وجمال صنعتها، لتكون هديةً تبقى وذكرى تُحمل.",
      image: "",
      values: [
        { icon: "shield", title: "أصالة مضمونة", text: "فضة ٩٢٥ مدموغة وأحجار طبيعية" },
        { icon: "gift", title: "تغليف فاخر", text: "جاهز للإهداء" },
        { icon: "truck", title: "من كربلاء إلى العالم", text: "توصيل داخل العراق وشحن دولي" }
      ],
      button: "تصفّح المتجر"
    },
    globe: { show: true, eyebrow: "Worldwide", title: "من كربلاء إلى العالم", text: "نغلّف كل قطعة بعناية ونشحنها إلى محبّي رقية (ع) في كل مكان، مع متابعة الطلب خطوة بخطوة عبر واتساب.", stat_cities: "محافظة عراقية", stat_countries: "دولة يصلها الشحن", stat_pack: "تغليف آمن ومؤمَّن", pin: "كربلاء المقدسة", hint: "اسحب لتدوير الكرة", hint_touch: "حرّك بإصبعك لتدوير الكرة" },
    testimonials: { show: true, title: "قالوا عن المعرض", items: [] },
    visit: { show: true, eyebrow: "Visit us", title: "زورونا", image: "", form_title: "راسلنا", form_text: "اكتب سؤالك أو طلبك الخاص، وسنتواصل معك." }
  },
  /* every small piece of interface text — editable from «نصوص الموقع» in the dashboard.
     {name}, {n}, {q}, {amount}, {brand}, {price} are filled in automatically. */
  ui: {
    nav_home: "الرئيسية", nav_shop: "المتجر", nav_departments: "الأقسام", nav_contact: "تواصل معنا",
    menu_title: "القائمة", menu_all: "كل المنتجات", search_placeholder: "ابحث عن خاتم، مسبحة، عطر…", intro_skip: "تخطّي",
    soon: "قريباً", filter_all: "الكل", filter_all_sub: "كل {name}", collection_empty: "قطعُ المعرض الأولى في طريقها إليكم — قريباً بإذن الله.", collection_more: "عرض كل المنتجات ({n})", featured_add: "أضف للسلة",
    shop_title: "كل المنتجات", shop_count: "{n} منتج", shop_more: "عرض المزيد ({n})", sort_label: "ترتيب", sort_default: "المقترح", sort_new: "الأحدث", sort_low: "السعر: من الأقل", sort_high: "السعر: من الأعلى",
    empty_category: "لا توجد منتجات في هذا القسم حالياً — قريباً بإذن الله.", out_of_stock: "نفدت الكمية",
    spec_category: "القسم", spec_metal: "المعدن", spec_stone: "الحجر", spec_weight: "الوزن", spec_size: "المقاس", spec_stock: "التوفر", in_stock: "متوفر", in_stock_n: "متوفر ({n})",
    qty: "الكمية", add_to_cart: "أضف إلى السلة", buy_now: "اطلب الآن", ask_whatsapp: "اسأل عنه على واتساب", out_note: "نفدت الكمية حالياً — راسلنا ليصلك خبر توفّرها.",
    assure_1: "فضة أصلية مضمونة", assure_2: "شحن لكل دول العالم", assure_2_local: "توصيل لكل المحافظات", assure_3: "تغليف هدايا", related: "قد يعجبك أيضاً",
    notfound_title: "المنتج غير متوفر", notfound_text: "ربما بيع أو أُزيل من المعرض.", notfound_btn: "العودة إلى المتجر",
    cart_title: "السلة", cart_empty: "سلتك فارغة", cart_browse: "تصفّح المنتجات", cart_remove: "حذف", cart_subtotal: "المجموع الفرعي", cart_delivery: "التوصيل داخل العراق",
    cart_free_hint: "أضف {amount} للحصول على توصيل مجاني داخل العراق", cart_intl_hint: "نشحن أيضاً لكل دول العالم — اختر دولتك عند إتمام الطلب", cart_total: "الإجمالي", cart_checkout: "إتمام الطلب",
    added_toast: "أُضيف «{name}» إلى السلة", cart_is_empty: "السلة فارغة", free: "مجاني", tbd: "يُحدَّد حسب الدولة",
    co_title: "إتمام الطلب", co_name: "الاسم الكامل", co_phone: "رقم الهاتف (واتساب)", co_country: "الدولة", co_other: "دولة أخرى…", co_other_name: "اسم الدولة",
    co_city: "المحافظة", co_city_intl: "المدينة", co_addr: "العنوان", co_addr_intl: "العنوان الكامل", co_addr_ph: "المنطقة، أقرب نقطة دالة", co_addr_ph_intl: "الشارع، رقم المبنى، الرمز البريدي",
    co_notes: "ملاحظات (اختياري)", co_notes_ph: "مقاس الخاتم، تغليف هدية…", co_sub: "المجموع", co_delivery: "التوصيل", co_intl_shipping: "الشحن الدولي", co_total: "الإجمالي", co_plus_shipping: "+ الشحن",
    co_submit: "تأكيد الطلب", co_sending: "جارٍ إرسال الطلب…",
    co_err_name: "يرجى كتابة الاسم", co_err_phone: "يرجى كتابة رقم هاتف صحيح", co_err_country: "يرجى كتابة اسم الدولة", co_err_city: "يرجى كتابة المدينة", co_err_addr: "يرجى كتابة العنوان الكامل للشحن",
    co_err_stock: "إحدى القطع نفدت كميتها، يرجى مراجعة السلة", co_err_gone: "إحدى القطع لم تعد متوفرة", co_err_failed: "تعذّر إرسال الطلب، حاول مرة أخرى",
    co_err_busy: "وصلتنا طلبات كثيرة من هذا الجهاز أو الرقم، يرجى المحاولة بعد قليل أو مراسلتنا على واتساب", co_err_human: "تعذّر التحقق من الطلب، يرجى المحاولة مرة أخرى",
    ok_title: "تمّ استلام طلبك", ok_text: "شكراً لك يا {name}، سنتواصل معك قريباً لتأكيد الطلب.", ok_no: "رقم طلبك", ok_wa: "أرسل تفاصيل الطلب على واتساب", ok_continue: "متابعة التسوق",
    search_results: "{n} نتيجة", search_none: "لا توجد نتائج لـ «{q}»",
    lbl_address: "العنوان", map_link: "الموقع على الخريطة", lbl_hours: "أوقات الدوام", lbl_phone: "الهاتف", lbl_whatsapp: "واتساب", lbl_email: "البريد",
    form_name: "الاسم", form_phone: "رقم الهاتف", form_body: "رسالتك", form_send: "إرسال الرسالة", form_sending: "جارٍ الإرسال…",
    form_ok: "وصلتنا رسالتك، شكراً لك", form_err: "تعذّر الإرسال، حاول مرة أخرى", form_busy: "أرسلت رسائل كثيرة، يرجى المحاولة بعد قليل", form_need_name: "يرجى كتابة الاسم", form_need_body: "يرجى كتابة الرسالة",
    net_down: "تعذّر الاتصال بالمتجر الآن. تحقّق من الإنترنت ثم أعد المحاولة.", net_retry: "إعادة المحاولة", net_retrying: "جارٍ المحاولة…",
    footer_departments: "الأقسام", footer_contact: "تواصل", footer_shop: "المتجر",
    wa_hello: "السلام عليكم", wa_inquiry: "السلام عليكم، أودّ الاستفسار من {brand}", wa_product: "السلام عليكم، أريد طلب: {name} — {price}",
    wa_order: "السلام عليكم، طلب جديد من موقع {brand}", wa_order_no: "رقم الطلب", wa_items: "المنتجات", wa_notes: "ملاحظات", room_count: "{pieces} في المتجر",
    lang_label: "اللغة", theme_toggle: "الوضع الداكن / الفاتح", a11y_main_nav: "القائمة الرئيسية", a11y_menu: "فتح القائمة", a11y_close: "إغلاق", a11y_theme: "تبديل الوضع الداكن والفاتح", a11y_search: "بحث", a11y_search_input: "بحث في المنتجات",
    a11y_cart: "السلة", a11y_cart_panel: "سلة التسوق", a11y_whatsapp: "راسلنا على واتساب", a11y_logo: "شعار {brand}", a11y_photo: "الصورة {n}", a11y_less: "إنقاص", a11y_more: "زيادة"
  },
  notify: { orders: true, inquiries: true },
  contact: {
    phone: "",
    whatsapp: "",
    address: "كربلاء المقدسة",
    hours: "",
    map_url: "",
    email: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    telegram: "",
    snapchat: ""
  },
  shop: {
    currency: "د.ع",
    delivery_fee: 5000,
    free_delivery_over: 0,
    payment_note: "الدفع نقداً عند الاستلام",
    whatsapp_orders: true,
    intl_enabled: true,
    intl_delivery_fee: 0,
    intl_free_over: 0,
    intl_note: "تُحدَّد أجرة الشحن الدولي حسب الدولة ونتواصل معك لتأكيدها قبل الإرسال",
    intl_payment_note: "يُنسَّق الدفع للطلبات الدولية عبر واتساب",
    countries: ["السعودية", "الكويت", "الإمارات", "قطر", "البحرين", "عُمان", "الأردن", "لبنان", "سوريا", "إيران", "تركيا", "مصر", "المملكة المتحدة", "ألمانيا", "السويد", "هولندا", "فرنسا", "الدنمارك", "النرويج", "الولايات المتحدة", "كندا", "أستراليا"],
    cities: ["كربلاء", "بغداد", "النجف", "بابل", "البصرة", "ذي قار", "ميسان", "واسط", "الديوانية", "المثنى", "ديالى", "صلاح الدين", "كركوك", "نينوى", "الأنبار", "أربيل", "السليمانية", "دهوك"]
  },
  footer: {
    text: "فضيات وأحجار كريمة وهدايا العتبات المقدسة، من كربلاء إلى العراق والعالم.",
    copyright: "جميع الحقوق محفوظة لمعرض رقية (عليها السلام)"
  },
  seo: {
    title: "معرض رقية (عليها السلام) — فضيات وأحجار كريمة · كربلاء",
    description: "خواتم فضة رجالية ونسائية، أحجار كريمة، مسابح، ساعات، عطور وبخور، سجاد صلاة وهدايا العتبات المقدسة. توصيل لكل محافظات العراق وشحن دولي لكل دول العالم."
  }
};

/* deep merge: saved values win, defaults fill any gaps (arrays are replaced, not merged) */
window.rqMerge = function merge(base, over) {
  if (Array.isArray(base)) return Array.isArray(over) ? over : base;
  if (base && typeof base === "object") {
    const out = {};
    const keys = new Set([...Object.keys(base), ...Object.keys(over && typeof over === "object" ? over : {})]);
    keys.forEach((k) => { out[k] = over && k in over ? merge(base[k], over[k]) : base[k]; });
    return out;
  }
  return over === undefined || over === null ? base : over;
};
