/* Default content for every editable part of the site.
   The admin dashboard saves changes to Supabase (table: settings);
   anything not saved there falls back to these values. */
window.RQ_DEFAULTS = {
  brand: {
    name: "معرض رقية",
    full: "معرض رقية (عليها السلام)",
    tagline: "فضيات وأحجار كريمة · كربلاء المقدسة",
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
    deep: "#020f0b",
    pearl: "#06201a",
    paper: "#0c2c23",
    emerald: "#34e3a8",
    silver: "#c7d3cf",
    accent: "#e3bd72",
    ink: "#ecf6f2",
    floral: true,
    mode: "dark",
    jasmine: true
  },
  theme_light: {
    deep: "#f3f8f5",
    pearl: "#e4efe9",
    paper: "#ffffff",
    emerald: "#0c8a5d",
    silver: "#55685f",
    accent: "#a87a25",
    ink: "#0b2119"
  },
  announcement: {
    enabled: true,
    items: ["توصيل لجميع محافظات العراق", "شحن دولي لكل دول العالم", "كل القطع مدموغة بعيار ٩٢٥", "تغليف هدايا فاخر"]
  },
  hero: {
    eyebrow: "فضة عيار ٩٢٥ · صناعة يدوية",
    title1: "فضّةٌ",
    title2: "بنقشٍ كربلائي",
    text: "من جوار الحرم الحسيني الشريف، نقدّم خواتم العقيق والفيروز ودُرّ النجف، والمسابح والعطور وهدايا العتبات المقدسة، مصاغةً بيد حِرفيين ورثوا الصنعة.",
    cta1: "تسوّق الآن",
    cta2: "أقسام المعرض",
    slide_seconds: 5.5,
    slides: [],
    stats: [
      { value: "٩٢٥", label: "عيار الفضة" },
      { value: "١٨", label: "محافظة عراقية" },
      { value: "٢٠+", label: "دولة يصلها الشحن" }
    ]
  },
  sections: {
    departments: { show: true, eyebrow: "Departments", title: "أقسام المعرض", text: "كل قسمٍ في محرابه، من الخاتم إلى سجادة الصلاة." },
    featured: { show: true, eyebrow: "قطعة الموسم", product_id: "", button: "اطلبها الآن" },
    collection: { show: true, eyebrow: "The Collection", title: "المجموعة المختارة", text: "قطع مختارة بعناية من جميع أقسام المعرض.", count: 8 },
    band: { show: true, items: ["فضة ٩٢٥ مدموغة", "أحجار طبيعية", "صناعة يدوية", "هدايا العتبات المقدسة", "شحن لكل دول العالم"] },
    about: {
      show: true,
      eyebrow: "Our Story",
      title: "من كربلاء، بحبّ رقية (ع)",
      text: "معرض رقية (عليها السلام) بيتٌ للفضة الأصيلة والأحجار الكريمة في كربلاء المقدسة.\nنختار كل قطعة بعناية، ونحرص أن تحمل روح المدينة وجمال صنعتها، لتكون هديةً تبقى وذكرى تُحمل.",
      image: ""
    },
    testimonials: { show: true, title: "قالوا عن المعرض", items: [] },
    visit: { show: true, title: "زورونا", form_title: "راسلنا", form_text: "اكتب سؤالك أو طلبك الخاص، وسنتواصل معك." }
  },
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
