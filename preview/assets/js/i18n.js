/* Languages of the public site: Arabic (the original), English, Persian, Urdu and German.
   - Arabic texts live in defaults.js and in the dashboard as before.
   - The built-in translations below are used for every text the owner has not changed;
     a text the owner changed in Arabic shows in Arabic until its translation is written
     in the dashboard («اللغات والترجمة»), so no visitor ever sees outdated information.
   - Products and departments carry their own translations (column i18n); stones, metals,
     badges and measures without one are translated from the short dictionaries below.
   The dashboard itself stays in Arabic. */
(function () {
  "use strict";
  var LANGS = {
    ar: { name: "العربية", short: "ع", dir: "rtl", locale: "ar-IQ" },
    en: { name: "English", short: "EN", dir: "ltr", locale: "en-US" },
    fa: { name: "فارسی", short: "فا", dir: "rtl", locale: "fa-IR" },
    ur: { name: "اردو", short: "اردو", dir: "rtl", locale: "ur-PK-u-nu-latn" },
    de: { name: "Deutsch", short: "DE", dir: "ltr", locale: "de-DE" }
  };
  var ORDER = ["ar", "en", "fa", "ur", "de"];

  var T = {};
  /* ======================================================================= English */
  T.en = {
    brand: { name: "Ruqayya Gallery", full: "Ruqayya Gallery (peace be upon her)", tagline: "Silver & gemstones · Holy Karbala", sub: "peace be upon her" },
    intro: { subtitle: "Silver & gemstones · Holy Karbala" },
    announcement: { items: ["Delivery to every governorate of Iraq", "International shipping worldwide", "Every piece hallmarked 925 silver", "Luxury gift wrapping"] },
    hero: {
      eyebrow: "925 sterling silver · Handcrafted", title1: "Silver", title2: "engraved in Karbala", flip_more: ["set with gemstones", "with a touch of luxury"],
      text: "Steps from the holy shrine of Imam Husayn, we offer agate, turquoise and Dur-e-Najaf rings, prayer beads, perfumes and gifts from the holy shrines — crafted by artisans who inherited the trade.",
      cta1: "Shop now", cta2: "Our departments", stats: [{ value: "925", label: "Silver purity" }]
    },
    sections: {
      departments: { eyebrow: "Departments", title: "Our Departments", text: "Every department in its own alcove, from rings to prayer rugs." },
      featured: { eyebrow: "Piece of the Season", button: "Order it now" },
      collection: { eyebrow: "The Collection", title: "The Curated Collection", text: "Pieces carefully chosen from every department of the gallery." },
      showroom: { eyebrow: "A walk through the gallery", title: "Pieces with a story", hint: "Scroll down to walk through the pieces", hint_touch: "Swipe to walk through the pieces", end_title: "All pieces" },
      about: {
        eyebrow: "Our Story", title: "From Karbala, with love for Ruqayya (a.s.)",
        text: "Ruqayya Gallery (peace be upon her) is a home for genuine silver and gemstones in Holy Karbala.\nWe choose every piece with care, so that it carries the spirit of the city and the beauty of its craft — a gift that lasts and a memory you keep.",
        values: [{ title: "Guaranteed authenticity", text: "Hallmarked 925 silver and natural stones" }, { title: "Luxury wrapping", text: "Ready to give" }, { title: "From Karbala to the world", text: "Delivery across Iraq and international shipping" }],
        button: "Browse the shop"
      },
      globe: { eyebrow: "Worldwide", title: "From Karbala to the World", text: "We wrap every piece with care and ship it to those who love Ruqayya (a.s.), wherever they are, with step-by-step order updates on WhatsApp.", stat_cities: "Iraqi governorates", stat_countries: "Countries we ship to", stat_pack: "Safe, insured packaging", pin: "Holy Karbala", hint: "Drag to spin the globe", hint_touch: "Move your finger to spin the globe" },
      testimonials: { title: "What our customers say" },
      visit: { eyebrow: "Visit us", title: "Visit Us", form_title: "Write to us", form_text: "Send us your question or special request, and we will get back to you." }
    },
    ui: {
      nav_home: "Home", nav_shop: "Shop", nav_departments: "Departments", nav_contact: "Contact",
      menu_title: "Menu", menu_all: "All products", search_placeholder: "Search for a ring, prayer beads, perfume…", intro_skip: "Skip",
      soon: "Coming soon", filter_all: "All", filter_all_sub: "All {name}", collection_empty: "The gallery's first pieces are on their way — coming soon.", collection_more: "View all products ({n})", featured_add: "Add to cart",
      shop_title: "All products", shop_count: "{n} products", shop_count_one: "{n} product", shop_more: "Show more ({n})", sort_label: "Sort", sort_default: "Recommended", sort_new: "Newest", sort_low: "Price: low to high", sort_high: "Price: high to low",
      empty_category: "No products in this department yet — coming soon.", out_of_stock: "Sold out",
      spec_category: "Department", spec_metal: "Metal", spec_stone: "Stone", spec_weight: "Weight", spec_size: "Size", spec_stock: "Availability", in_stock: "In stock", in_stock_n: "In stock ({n})",
      qty: "Quantity", add_to_cart: "Add to cart", buy_now: "Order now", ask_whatsapp: "Ask about it on WhatsApp", out_note: "Sold out for now — message us and we will let you know when it is back.",
      assure_1: "Genuine silver, guaranteed", assure_2: "Shipping worldwide", assure_2_local: "Delivery to every governorate", assure_3: "Gift wrapping", related: "You may also like",
      notfound_title: "Product not available", notfound_text: "It may have been sold or removed from the gallery.", notfound_btn: "Back to the shop",
      cart_title: "Cart", cart_empty: "Your cart is empty", cart_browse: "Browse products", cart_remove: "Remove", cart_subtotal: "Subtotal", cart_delivery: "Delivery within Iraq",
      cart_free_hint: "Add {amount} for free delivery within Iraq", cart_intl_hint: "We also ship worldwide — choose your country at checkout", cart_total: "Total", cart_checkout: "Checkout",
      added_toast: "“{name}” added to your cart", cart_is_empty: "Your cart is empty", free: "Free", tbd: "Depends on the country",
      co_title: "Checkout", co_name: "Full name", co_phone: "Phone number (WhatsApp)", co_country: "Country", co_other: "Another country…", co_other_name: "Country name",
      co_city: "Governorate", co_city_intl: "City", co_addr: "Address", co_addr_intl: "Full address", co_addr_ph: "District, nearest landmark", co_addr_ph_intl: "Street, building number, postcode",
      co_notes: "Notes (optional)", co_notes_ph: "Ring size, gift wrapping…", co_sub: "Subtotal", co_delivery: "Delivery", co_intl_shipping: "International shipping", co_total: "Total", co_plus_shipping: "+ shipping",
      co_submit: "Confirm order", co_sending: "Sending your order…",
      co_err_name: "Please enter your name", co_err_phone: "Please enter a valid phone number", co_err_country: "Please enter the country name", co_err_city: "Please enter the city", co_err_addr: "Please enter the full shipping address",
      co_err_stock: "One of the pieces is sold out — please review your cart", co_err_gone: "One of the pieces is no longer available", co_err_failed: "Your order could not be sent — please try again",
      co_err_busy: "We have received many orders from this device or number — please try again shortly or message us on WhatsApp", co_err_human: "We could not verify the order — please try again",
      ok_title: "Your order has been received", ok_text: "Thank you, {name} — we will contact you shortly to confirm your order.", ok_no: "Your order number", ok_wa: "Send the order details on WhatsApp", ok_continue: "Continue shopping",
      search_results: "{n} results", search_results_one: "{n} result", search_none: "No results for “{q}”",
      lbl_address: "Address", map_link: "Location on the map", lbl_hours: "Opening hours", lbl_phone: "Phone", lbl_whatsapp: "WhatsApp", lbl_email: "Email",
      form_name: "Name", form_phone: "Phone number", form_body: "Your message", form_send: "Send message", form_sending: "Sending…",
      form_ok: "We have received your message — thank you", form_err: "Could not send — please try again", form_busy: "You have sent many messages — please try again shortly", form_need_name: "Please enter your name", form_need_body: "Please write your message",
      net_down: "We cannot reach the shop right now. Check your internet connection and try again.", net_retry: "Try again", net_retrying: "Trying…",
      footer_departments: "Departments", footer_contact: "Contact", footer_shop: "Shop",
      wa_hello: "Assalamu alaikum", wa_inquiry: "Assalamu alaikum, I would like to ask {brand} about something", wa_product: "Assalamu alaikum, I would like to order: {name} — {price}",
      wa_order: "Assalamu alaikum, a new order from the {brand} website", wa_order_no: "Order number", wa_items: "Products", wa_notes: "Notes",
      pieces_one: "{n} piece", pieces_other: "{n} pieces", room_count: "{pieces} in the shop", stat_depts_one: "Department", stat_depts_other: "Departments", stat_pieces_one: "Piece in the shop", stat_pieces_other: "Pieces in the shop",
      lang_label: "Language", theme_toggle: "Dark / light mode", a11y_main_nav: "Main menu", a11y_menu: "Open menu", a11y_close: "Close", a11y_theme: "Switch dark / light mode", a11y_search: "Search", a11y_search_input: "Search products",
      a11y_cart: "Cart", a11y_cart_panel: "Shopping cart", a11y_whatsapp: "Message us on WhatsApp", a11y_logo: "{brand} logo", a11y_photo: "Photo {n}", a11y_less: "Decrease", a11y_more: "Increase"
    },
    contact: { address: "Holy Karbala" },
    shop: { currency: "IQD", payment_note: "Cash on delivery", intl_note: "International shipping is priced by country — we will contact you to confirm it before dispatch", intl_payment_note: "Payment for international orders is arranged on WhatsApp" },
    footer: { text: "Silver, gemstones and gifts from the holy shrines — from Karbala to Iraq and the world.", copyright: "All rights reserved — Ruqayya Gallery (peace be upon her)" },
    seo: { title: "Ruqayya Gallery (peace be upon her) — Silver & Gemstones · Karbala", description: "Men's and women's silver rings, gemstones, prayer beads, watches, perfumes and incense, prayer rugs and gifts from the holy shrines. Delivery across Iraq and international shipping worldwide." }
  };

  /* ======================================================================= Urdu */
  T.ur = {
    brand: { name: "معرضِ رقیہ", full: "معرضِ رقیہ (علیہا السلام)", tagline: "چاندی اور قیمتی پتھر · کربلائے معلیٰ", sub: "علیہا السلام" },
    intro: { subtitle: "چاندی اور قیمتی پتھر · کربلائے معلیٰ" },
    announcement: { items: ["عراق کے تمام صوبوں میں ڈیلیوری", "دنیا بھر میں انٹرنیشنل شپنگ", "ہر زیور پر 925 چاندی کی مہر", "شاندار گفٹ پیکنگ"] },
    hero: {
      eyebrow: "925 اسٹرلنگ چاندی · ہاتھ کی کاریگری", title1: "چاندی", title2: "کربلائی نقش کے ساتھ", flip_more: ["قیمتی پتھروں کے ساتھ", "شاہانہ انداز میں"],
      text: "حرمِ امام حسینؑ کے پڑوس سے ہم عقیق، فیروزہ اور دُرِ نجف کی انگوٹھیاں، تسبیحیں، عطر اور مقدس روضوں کے تحائف پیش کرتے ہیں، جنہیں وہ کاریگر بناتے ہیں جنہیں یہ ہنر وراثت میں ملا ہے۔",
      cta1: "ابھی خریدیں", cta2: "نمائش کے شعبے", stats: [{ value: "925", label: "چاندی کا معیار" }]
    },
    sections: {
      departments: { title: "نمائش کے شعبے", text: "ہر شعبہ اپنے محراب میں، انگوٹھی سے جائے نماز تک۔" },
      featured: { eyebrow: "سیزن کا خاص زیور", button: "ابھی آرڈر کریں" },
      collection: { title: "منتخب مجموعہ", text: "نمائش کے تمام شعبوں سے احتیاط کے ساتھ چنے گئے زیورات۔" },
      showroom: { eyebrow: "نمائش کی سیر", title: "ہر زیور کی اپنی کہانی", hint: "زیورات دیکھنے کے لیے نیچے اسکرول کریں", hint_touch: "زیورات دیکھنے کے لیے سوائپ کریں", end_title: "تمام زیورات" },
      about: {
        title: "کربلا سے، بی بی رقیہؑ کی محبت میں",
        text: "معرضِ رقیہ (علیہا السلام) کربلائے معلیٰ میں خالص چاندی اور قیمتی پتھروں کا گھر ہے۔\nہم ہر زیور کو احتیاط سے چنتے ہیں تاکہ اس میں شہر کی روح اور اس کے ہنر کی خوبصورتی جھلکے — ایک ایسا تحفہ جو قائم رہے اور ایک ایسی یاد جو ساتھ رہے۔",
        values: [{ title: "اصلیت کی ضمانت", text: "مہر شدہ 925 چاندی اور قدرتی پتھر" }, { title: "شاندار پیکنگ", text: "تحفے کے لیے تیار" }, { title: "کربلا سے پوری دنیا تک", text: "عراق میں ڈیلیوری اور انٹرنیشنل شپنگ" }],
        button: "دکان دیکھیں"
      },
      globe: { title: "کربلا سے پوری دنیا تک", text: "ہم ہر زیور کو احتیاط سے پیک کر کے دنیا بھر میں بی بی رقیہؑ کے چاہنے والوں تک پہنچاتے ہیں، اور واٹس ایپ پر آرڈر کے ہر مرحلے کی خبر دیتے رہتے ہیں۔", stat_cities: "عراقی صوبے", stat_countries: "ممالک جہاں شپنگ ہوتی ہے", stat_pack: "محفوظ اور بیمہ شدہ پیکنگ", pin: "کربلائے معلیٰ", hint: "گلوب گھمانے کے لیے کھینچیں", hint_touch: "گلوب گھمانے کے لیے انگلی پھیریں" },
      testimonials: { title: "ہمارے گاہکوں کی رائے" },
      visit: { title: "ہمارے پاس تشریف لائیں", form_title: "ہمیں لکھیں", form_text: "اپنا سوال یا خاص فرمائش لکھیں، ہم آپ سے رابطہ کریں گے۔" }
    },
    ui: {
      nav_home: "ہوم", nav_shop: "دکان", nav_departments: "شعبے", nav_contact: "رابطہ کریں",
      menu_title: "مینو", menu_all: "تمام مصنوعات", search_placeholder: "انگوٹھی، تسبیح، عطر تلاش کریں…", intro_skip: "چھوڑیں",
      soon: "جلد آ رہا ہے", filter_all: "سب", filter_all_sub: "تمام {name}", collection_empty: "نمائش کے پہلے زیورات جلد آپ کے سامنے ہوں گے، ان شاء اللہ۔", collection_more: "تمام مصنوعات دیکھیں ({n})", featured_add: "کارٹ میں ڈالیں",
      shop_title: "تمام مصنوعات", shop_count: "{n} آئٹمز", shop_count_one: "{n} آئٹم", shop_more: "مزید دیکھیں ({n})", sort_label: "ترتیب", sort_default: "تجویز کردہ", sort_new: "نئی ترین", sort_low: "قیمت: کم سے زیادہ", sort_high: "قیمت: زیادہ سے کم",
      empty_category: "اس شعبے میں فی الحال کوئی چیز نہیں — ان شاء اللہ جلد آئے گی۔", out_of_stock: "ختم ہو گیا",
      spec_category: "شعبہ", spec_metal: "دھات", spec_stone: "پتھر", spec_weight: "وزن", spec_size: "سائز", spec_stock: "دستیابی", in_stock: "دستیاب", in_stock_n: "دستیاب ({n})",
      qty: "تعداد", add_to_cart: "کارٹ میں ڈالیں", buy_now: "ابھی آرڈر کریں", ask_whatsapp: "واٹس ایپ پر پوچھیں", out_note: "یہ فی الحال ختم ہو گیا ہے — ہمیں پیغام بھیجیں، دوبارہ دستیاب ہوتے ہی ہم آپ کو بتا دیں گے۔",
      assure_1: "اصلی چاندی کی ضمانت", assure_2: "دنیا بھر میں شپنگ", assure_2_local: "تمام صوبوں میں ڈیلیوری", assure_3: "گفٹ پیکنگ", related: "یہ بھی آپ کو پسند آ سکتے ہیں",
      notfound_title: "یہ چیز دستیاب نہیں", notfound_text: "شاید یہ فروخت ہو گئی یا نمائش سے ہٹا دی گئی۔", notfound_btn: "دکان پر واپس جائیں",
      cart_title: "کارٹ", cart_empty: "آپ کا کارٹ خالی ہے", cart_browse: "مصنوعات دیکھیں", cart_remove: "ہٹائیں", cart_subtotal: "ذیلی میزان", cart_delivery: "عراق میں ڈیلیوری",
      cart_free_hint: "عراق میں مفت ڈیلیوری کے لیے مزید {amount} کی خریداری کریں", cart_intl_hint: "ہم دنیا بھر میں بھی شپنگ کرتے ہیں — آرڈر مکمل کرتے وقت اپنا ملک منتخب کریں", cart_total: "کل رقم", cart_checkout: "آرڈر مکمل کریں",
      added_toast: "«{name}» کارٹ میں شامل ہو گیا", cart_is_empty: "کارٹ خالی ہے", free: "مفت", tbd: "ملک کے حساب سے طے ہو گا",
      co_title: "آرڈر مکمل کریں", co_name: "پورا نام", co_phone: "فون نمبر (واٹس ایپ)", co_country: "ملک", co_other: "کوئی اور ملک…", co_other_name: "ملک کا نام",
      co_city: "صوبہ", co_city_intl: "شہر", co_addr: "پتہ", co_addr_intl: "مکمل پتہ", co_addr_ph: "علاقہ، قریبی نشانی", co_addr_ph_intl: "گلی، عمارت نمبر، پوسٹ کوڈ",
      co_notes: "نوٹ (اختیاری)", co_notes_ph: "انگوٹھی کا سائز، گفٹ پیکنگ…", co_sub: "میزان", co_delivery: "ڈیلیوری", co_intl_shipping: "انٹرنیشنل شپنگ", co_total: "کل رقم", co_plus_shipping: "+ شپنگ",
      co_submit: "آرڈر کی تصدیق کریں", co_sending: "آرڈر بھیجا جا رہا ہے…",
      co_err_name: "براہِ کرم اپنا نام لکھیں", co_err_phone: "براہِ کرم درست فون نمبر لکھیں", co_err_country: "براہِ کرم ملک کا نام لکھیں", co_err_city: "براہِ کرم شہر لکھیں", co_err_addr: "براہِ کرم شپنگ کا مکمل پتہ لکھیں",
      co_err_stock: "ایک زیور ختم ہو گیا ہے، براہِ کرم اپنا کارٹ دیکھ لیں", co_err_gone: "ایک زیور اب دستیاب نہیں", co_err_failed: "آرڈر نہیں بھیجا جا سکا، دوبارہ کوشش کریں",
      co_err_busy: "اس ڈیوائس یا نمبر سے بہت سے آرڈر آ چکے ہیں، تھوڑی دیر بعد کوشش کریں یا واٹس ایپ پر ہم سے رابطہ کریں", co_err_human: "آرڈر کی تصدیق نہیں ہو سکی، دوبارہ کوشش کریں",
      ok_title: "آپ کا آرڈر موصول ہو گیا", ok_text: "شکریہ {name}، ہم آرڈر کی تصدیق کے لیے جلد آپ سے رابطہ کریں گے۔", ok_no: "آپ کا آرڈر نمبر", ok_wa: "آرڈر کی تفصیل واٹس ایپ پر بھیجیں", ok_continue: "خریداری جاری رکھیں",
      search_results: "{n} نتائج", search_results_one: "{n} نتیجہ", search_none: "«{q}» کے لیے کوئی نتیجہ نہیں ملا",
      lbl_address: "پتہ", map_link: "نقشے پر مقام", lbl_hours: "اوقاتِ کار", lbl_phone: "فون", lbl_whatsapp: "واٹس ایپ", lbl_email: "ای میل",
      form_name: "نام", form_phone: "فون نمبر", form_body: "آپ کا پیغام", form_send: "پیغام بھیجیں", form_sending: "بھیجا جا رہا ہے…",
      form_ok: "آپ کا پیغام ہمیں مل گیا، شکریہ", form_err: "پیغام نہیں بھیجا جا سکا، دوبارہ کوشش کریں", form_busy: "آپ بہت سے پیغام بھیج چکے ہیں، تھوڑی دیر بعد کوشش کریں", form_need_name: "براہِ کرم اپنا نام لکھیں", form_need_body: "براہِ کرم اپنا پیغام لکھیں",
      net_down: "اس وقت دکان سے رابطہ نہیں ہو پا رہا۔ اپنا انٹرنیٹ چیک کر کے دوبارہ کوشش کریں۔", net_retry: "دوبارہ کوشش کریں", net_retrying: "کوشش جاری ہے…",
      footer_departments: "شعبے", footer_contact: "رابطہ", footer_shop: "دکان",
      wa_hello: "السلام علیکم", wa_inquiry: "السلام علیکم، مجھے {brand} سے ایک بات پوچھنی ہے", wa_product: "السلام علیکم، مجھے یہ آرڈر کرنا ہے: {name} — {price}",
      wa_order: "السلام علیکم، {brand} کی ویب سائٹ سے نیا آرڈر", wa_order_no: "آرڈر نمبر", wa_items: "مصنوعات", wa_notes: "نوٹ",
      pieces_one: "{n} آئٹم", pieces_other: "{n} آئٹمز", room_count: "دکان میں {pieces}", stat_depts_one: "شعبہ", stat_depts_other: "شعبے", stat_pieces_one: "آئٹم دکان میں", stat_pieces_other: "آئٹمز دکان میں",
      lang_label: "زبان", theme_toggle: "ڈارک / لائٹ موڈ", a11y_main_nav: "مرکزی مینو", a11y_menu: "مینو کھولیں", a11y_close: "بند کریں", a11y_theme: "ڈارک / لائٹ موڈ بدلیں", a11y_search: "تلاش", a11y_search_input: "مصنوعات تلاش کریں",
      a11y_cart: "کارٹ", a11y_cart_panel: "خریداری کا کارٹ", a11y_whatsapp: "واٹس ایپ پر ہم سے بات کریں", a11y_logo: "{brand} کا لوگو", a11y_photo: "تصویر {n}", a11y_less: "کم کریں", a11y_more: "بڑھائیں"
    },
    contact: { address: "کربلائے معلیٰ" },
    shop: { currency: "IQD", payment_note: "ڈیلیوری پر نقد ادائیگی", intl_note: "انٹرنیشنل شپنگ کا کرایہ ملک کے حساب سے طے ہوتا ہے، روانگی سے پہلے ہم آپ سے رابطہ کر کے اس کی تصدیق کریں گے", intl_payment_note: "انٹرنیشنل آرڈرز کی ادائیگی واٹس ایپ کے ذریعے طے کی جاتی ہے" },
    footer: { text: "چاندی، قیمتی پتھر اور مقدس روضوں کے تحائف — کربلا سے عراق اور پوری دنیا تک۔", copyright: "جملہ حقوق محفوظ ہیں — معرضِ رقیہ (علیہا السلام)" },
    seo: { title: "معرضِ رقیہ (علیہا السلام) — چاندی اور قیمتی پتھر · کربلا", description: "مردانہ اور زنانہ چاندی کی انگوٹھیاں، قیمتی پتھر، تسبیحیں، گھڑیاں، عطر اور بخور، جائے نماز اور مقدس روضوں کے تحائف۔ پورے عراق میں ڈیلیوری اور دنیا بھر میں انٹرنیشنل شپنگ۔" }
  };

  /* ======================================================================= Persian */
  T.fa = {
    brand: { name: "نمایشگاه رقیه", full: "نمایشگاه رقیه (سلام‌الله‌علیها)", tagline: "نقره و سنگ‌های قیمتی · کربلای معلی", sub: "سلام‌الله‌علیها" },
    intro: { subtitle: "نقره و سنگ‌های قیمتی · کربلای معلی" },
    announcement: { items: ["ارسال به همه‌ی استان‌های عراق", "ارسال بین‌المللی به سراسر جهان", "همه‌ی قطعه‌ها با مُهر عیار ۹۲۵", "بسته‌بندی هدیه‌ی فاخر"] },
    hero: {
      eyebrow: "نقره‌ی عیار ۹۲۵ · دست‌ساز", title1: "نقره", title2: "با نقش کربلایی", flip_more: ["با سنگ‌های قیمتی", "با جلوه‌ای فاخر"],
      text: "از جوار حرم مطهر امام حسین (ع)، انگشترهای عقیق و فیروزه و دُرّ نجف، تسبیح، عطر و هدایای عتبات عالیات را تقدیم می‌کنیم؛ ساخته‌شده به دست استادکارانی که این هنر را به ارث برده‌اند.",
      cta1: "همین حالا خرید کنید", cta2: "بخش‌های نمایشگاه", stats: [{ value: "۹۲۵", label: "عیار نقره" }]
    },
    sections: {
      departments: { title: "بخش‌های نمایشگاه", text: "هر بخش در محراب خودش؛ از انگشتر تا سجاده‌ی نماز." },
      featured: { eyebrow: "قطعه‌ی فصل", button: "همین حالا سفارش دهید" },
      collection: { title: "مجموعه‌ی برگزیده", text: "قطعه‌هایی که با دقت از همه‌ی بخش‌های نمایشگاه انتخاب شده‌اند." },
      showroom: { eyebrow: "گشتی در نمایشگاه", title: "قطعه‌هایی با داستان", hint: "برای دیدن قطعه‌ها به پایین بروید", hint_touch: "برای دیدن قطعه‌ها بکشید", end_title: "همه‌ی قطعه‌ها" },
      about: {
        title: "از کربلا، با عشق رقیه (س)",
        text: "نمایشگاه رقیه (سلام‌الله‌علیها) خانه‌ی نقره‌ی اصیل و سنگ‌های قیمتی در کربلای معلی است.\nهر قطعه را با دقت انتخاب می‌کنیم تا روح این شهر و زیبایی هنرش را با خود داشته باشد؛ هدیه‌ای ماندگار و یادگاری همیشگی.",
        values: [{ title: "اصالت تضمین‌شده", text: "نقره‌ی عیار ۹۲۵ مهرشده و سنگ‌های طبیعی" }, { title: "بسته‌بندی فاخر", text: "آماده‌ی هدیه دادن" }, { title: "از کربلا تا سراسر جهان", text: "ارسال به سراسر عراق و ارسال بین‌المللی" }],
        button: "دیدن فروشگاه"
      },
      globe: { title: "از کربلا تا سراسر جهان", text: "هر قطعه را با دقت بسته‌بندی می‌کنیم و برای دوستداران رقیه (س) در هر کجای جهان می‌فرستیم و مراحل سفارش را قدم‌به‌قدم در واتس‌اپ خبر می‌دهیم.", stat_cities: "استان‌های عراق", stat_countries: "کشورهای مقصد ارسال", stat_pack: "بسته‌بندی ایمن و بیمه‌شده", pin: "کربلای معلی", hint: "برای چرخاندن کره بکشید", hint_touch: "با انگشت کره را بچرخانید" },
      testimonials: { title: "نظر مشتریان ما" },
      visit: { title: "به ما سر بزنید", form_title: "برای ما بنویسید", form_text: "سؤال یا درخواست ویژه‌ی خود را بنویسید تا با شما تماس بگیریم." }
    },
    ui: {
      nav_home: "خانه", nav_shop: "فروشگاه", nav_departments: "بخش‌ها", nav_contact: "تماس با ما",
      menu_title: "منو", menu_all: "همه‌ی محصولات", search_placeholder: "جست‌وجوی انگشتر، تسبیح، عطر…", intro_skip: "رد شدن",
      soon: "به‌زودی", filter_all: "همه", filter_all_sub: "همه‌ی {name}", collection_empty: "نخستین قطعه‌های نمایشگاه در راه‌اند؛ به‌زودی ان‌شاءالله.", collection_more: "دیدن همه‌ی محصولات ({n})", featured_add: "افزودن به سبد",
      shop_title: "همه‌ی محصولات", shop_count: "{n} محصول", shop_more: "نمایش بیشتر ({n})", sort_label: "مرتب‌سازی", sort_default: "پیشنهادی", sort_new: "جدیدترین", sort_low: "قیمت: کم به زیاد", sort_high: "قیمت: زیاد به کم",
      empty_category: "فعلاً محصولی در این بخش نیست؛ به‌زودی ان‌شاءالله.", out_of_stock: "ناموجود",
      spec_category: "بخش", spec_metal: "فلز", spec_stone: "سنگ", spec_weight: "وزن", spec_size: "اندازه", spec_stock: "موجودی", in_stock: "موجود", in_stock_n: "موجود ({n})",
      qty: "تعداد", add_to_cart: "افزودن به سبد", buy_now: "همین حالا سفارش دهید", ask_whatsapp: "پرسیدن در واتس‌اپ", out_note: "این قطعه فعلاً ناموجود است؛ پیام بدهید تا به محض موجود شدن خبرتان کنیم.",
      assure_1: "تضمین نقره‌ی اصل", assure_2: "ارسال به سراسر جهان", assure_2_local: "ارسال به همه‌ی استان‌ها", assure_3: "بسته‌بندی هدیه", related: "شاید این‌ها را هم بپسندید",
      notfound_title: "این محصول در دسترس نیست", notfound_text: "شاید فروخته شده یا از نمایشگاه برداشته شده باشد.", notfound_btn: "بازگشت به فروشگاه",
      cart_title: "سبد خرید", cart_empty: "سبد خرید شما خالی است", cart_browse: "دیدن محصولات", cart_remove: "حذف", cart_subtotal: "جمع جزء", cart_delivery: "ارسال داخل عراق",
      cart_free_hint: "{amount} دیگر خرید کنید تا ارسال داخل عراق رایگان شود", cart_intl_hint: "به سراسر جهان هم ارسال می‌کنیم؛ کشورتان را هنگام ثبت سفارش انتخاب کنید", cart_total: "جمع کل", cart_checkout: "تکمیل سفارش",
      added_toast: "«{name}» به سبد خرید اضافه شد", cart_is_empty: "سبد خرید خالی است", free: "رایگان", tbd: "بسته به کشور",
      co_title: "تکمیل سفارش", co_name: "نام و نام خانوادگی", co_phone: "شماره‌ی تلفن (واتس‌اپ)", co_country: "کشور", co_other: "کشوری دیگر…", co_other_name: "نام کشور",
      co_city: "استان", co_city_intl: "شهر", co_addr: "نشانی", co_addr_intl: "نشانی کامل", co_addr_ph: "محله، نزدیک‌ترین نشانه", co_addr_ph_intl: "خیابان، پلاک، کد پستی",
      co_notes: "توضیحات (اختیاری)", co_notes_ph: "اندازه‌ی انگشتر، بسته‌بندی هدیه…", co_sub: "جمع جزء", co_delivery: "ارسال", co_intl_shipping: "ارسال بین‌المللی", co_total: "جمع کل", co_plus_shipping: "+ هزینه‌ی ارسال",
      co_submit: "تأیید سفارش", co_sending: "در حال ارسال سفارش…",
      co_err_name: "لطفاً نام خود را بنویسید", co_err_phone: "لطفاً شماره‌ی تلفن معتبر وارد کنید", co_err_country: "لطفاً نام کشور را بنویسید", co_err_city: "لطفاً نام شهر را بنویسید", co_err_addr: "لطفاً نشانی کامل ارسال را بنویسید",
      co_err_stock: "یکی از قطعه‌ها تمام شده است؛ لطفاً سبد خرید را بررسی کنید", co_err_gone: "یکی از قطعه‌ها دیگر در دسترس نیست", co_err_failed: "ارسال سفارش انجام نشد؛ لطفاً دوباره تلاش کنید",
      co_err_busy: "از این دستگاه یا شماره سفارش‌های زیادی رسیده است؛ کمی بعد دوباره تلاش کنید یا در واتس‌اپ پیام دهید", co_err_human: "تأیید سفارش ممکن نشد؛ لطفاً دوباره تلاش کنید",
      ok_title: "سفارش شما ثبت شد", ok_text: "سپاس، {name}؛ به‌زودی برای تأیید سفارش با شما تماس می‌گیریم.", ok_no: "شماره‌ی سفارش شما", ok_wa: "ارسال جزئیات سفارش در واتس‌اپ", ok_continue: "ادامه‌ی خرید",
      search_results: "{n} نتیجه", search_none: "نتیجه‌ای برای «{q}» پیدا نشد",
      lbl_address: "نشانی", map_link: "موقعیت روی نقشه", lbl_hours: "ساعات کاری", lbl_phone: "تلفن", lbl_whatsapp: "واتس‌اپ", lbl_email: "ایمیل",
      form_name: "نام", form_phone: "شماره‌ی تلفن", form_body: "پیام شما", form_send: "ارسال پیام", form_sending: "در حال ارسال…",
      form_ok: "پیام شما به دست ما رسید؛ سپاسگزاریم", form_err: "ارسال نشد؛ لطفاً دوباره تلاش کنید", form_busy: "پیام‌های زیادی فرستاده‌اید؛ کمی بعد دوباره تلاش کنید", form_need_name: "لطفاً نام خود را بنویسید", form_need_body: "لطفاً پیام خود را بنویسید",
      net_down: "اکنون دسترسی به فروشگاه ممکن نیست. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.", net_retry: "تلاش دوباره", net_retrying: "در حال تلاش…",
      footer_departments: "بخش‌ها", footer_contact: "تماس", footer_shop: "فروشگاه",
      wa_hello: "سلام علیکم", wa_inquiry: "سلام علیکم، سؤالی از {brand} دارم", wa_product: "سلام علیکم، می‌خواهم این را سفارش دهم: {name} — {price}",
      wa_order: "سلام علیکم، سفارش تازه از وب‌سایت {brand}", wa_order_no: "شماره‌ی سفارش", wa_items: "محصولات", wa_notes: "توضیحات",
      pieces_one: "{n} قطعه", pieces_other: "{n} قطعه", room_count: "{pieces} در فروشگاه", stat_depts_one: "بخش در نمایشگاه", stat_depts_other: "بخش در نمایشگاه", stat_pieces_one: "قطعه در فروشگاه", stat_pieces_other: "قطعه در فروشگاه",
      lang_label: "زبان", theme_toggle: "حالت تیره / روشن", a11y_main_nav: "منوی اصلی", a11y_menu: "باز کردن منو", a11y_close: "بستن", a11y_theme: "تغییر حالت تیره و روشن", a11y_search: "جست‌وجو", a11y_search_input: "جست‌وجوی محصولات",
      a11y_cart: "سبد خرید", a11y_cart_panel: "سبد خرید", a11y_whatsapp: "در واتس‌اپ به ما پیام دهید", a11y_logo: "نشان {brand}", a11y_photo: "تصویر {n}", a11y_less: "کم کردن", a11y_more: "افزودن"
    },
    contact: { address: "کربلای معلی" },
    shop: { currency: "دینار عراق", payment_note: "پرداخت نقدی هنگام تحویل", intl_note: "هزینه‌ی ارسال بین‌المللی بر اساس کشور تعیین می‌شود و پیش از ارسال برای تأیید با شما تماس می‌گیریم", intl_payment_note: "پرداخت سفارش‌های بین‌المللی از طریق واتس‌اپ هماهنگ می‌شود" },
    footer: { text: "نقره، سنگ‌های قیمتی و هدایای عتبات عالیات؛ از کربلا به عراق و سراسر جهان.", copyright: "همه‌ی حقوق برای نمایشگاه رقیه (سلام‌الله‌علیها) محفوظ است" },
    seo: { title: "نمایشگاه رقیه (سلام‌الله‌علیها) — نقره و سنگ‌های قیمتی · کربلا", description: "انگشترهای نقره‌ی مردانه و زنانه، سنگ‌های قیمتی، تسبیح، ساعت، عطر و بخور، سجاده‌ی نماز و هدایای عتبات عالیات. ارسال به سراسر عراق و ارسال بین‌المللی به همه‌ی کشورها." }
  };

  /* ======================================================================= German */
  T.de = {
    brand: { name: "Ruqayya Galerie", full: "Ruqayya Galerie (Friede sei mit ihr)", tagline: "Silber & Edelsteine · Heiliges Kerbela", sub: "Friede sei mit ihr" },
    intro: { subtitle: "Silber & Edelsteine · Heiliges Kerbela" },
    announcement: { items: ["Lieferung in alle Provinzen des Irak", "Internationaler Versand weltweit", "Jedes Stück mit 925er Silberstempel", "Edle Geschenkverpackung"] },
    hero: {
      eyebrow: "925er Sterlingsilber · Handarbeit", title1: "Silber", title2: "graviert in Kerbela", flip_more: ["mit Edelsteinen", "mit edler Note"],
      text: "Nur wenige Schritte vom heiligen Schrein Imam Husains entfernt bieten wir Achat-, Türkis- und Dur-e-Najaf-Ringe, Gebetsketten, Parfüms und Geschenke der heiligen Schreine an – gefertigt von Kunsthandwerkern, die ihr Handwerk geerbt haben.",
      cta1: "Jetzt einkaufen", cta2: "Unsere Abteilungen", stats: [{ value: "925", label: "Silberfeingehalt" }]
    },
    sections: {
      departments: { eyebrow: "Abteilungen", title: "Unsere Abteilungen", text: "Jede Abteilung in ihrer eigenen Nische – vom Ring bis zum Gebetsteppich." },
      featured: { eyebrow: "Stück der Saison", button: "Jetzt bestellen" },
      collection: { eyebrow: "Die Kollektion", title: "Die ausgewählte Kollektion", text: "Sorgfältig ausgewählte Stücke aus allen Abteilungen der Galerie." },
      showroom: { eyebrow: "Rundgang durch die Galerie", title: "Stücke, die Geschichten erzählen", hint: "Nach unten scrollen, um durch die Stücke zu gehen", hint_touch: "Wischen, um durch die Stücke zu gehen", end_title: "Alle Stücke" },
      about: {
        eyebrow: "Unsere Geschichte", title: "Aus Kerbela, mit Liebe zu Ruqayya (a.s.)",
        text: "Die Ruqayya Galerie (Friede sei mit ihr) ist ein Haus für echtes Silber und Edelsteine im heiligen Kerbela.\nWir wählen jedes Stück mit Sorgfalt aus, damit es den Geist der Stadt und die Schönheit ihres Handwerks in sich trägt – ein Geschenk, das bleibt, und eine Erinnerung, die man bei sich trägt.",
        values: [{ title: "Garantierte Echtheit", text: "Gestempeltes 925er Silber und natürliche Steine" }, { title: "Edle Verpackung", text: "Bereit zum Verschenken" }, { title: "Von Kerbela in die Welt", text: "Lieferung im Irak und internationaler Versand" }],
        button: "Zum Shop"
      },
      globe: { eyebrow: "Weltweit", title: "Von Kerbela in die Welt", text: "Wir verpacken jedes Stück mit Sorgfalt und versenden es an alle, die Ruqayya (a.s.) lieben – wo auch immer sie sind, mit Updates zu jedem Schritt Ihrer Bestellung über WhatsApp.", stat_cities: "Irakische Provinzen", stat_countries: "Länder mit Versand", stat_pack: "Sichere, versicherte Verpackung", pin: "Heiliges Kerbela", hint: "Ziehen, um den Globus zu drehen", hint_touch: "Mit dem Finger den Globus drehen" },
      testimonials: { title: "Was unsere Kunden sagen" },
      visit: { eyebrow: "Besuchen Sie uns", title: "Besuchen Sie uns", form_title: "Schreiben Sie uns", form_text: "Senden Sie uns Ihre Frage oder Ihren besonderen Wunsch – wir melden uns bei Ihnen." }
    },
    ui: {
      nav_home: "Startseite", nav_shop: "Shop", nav_departments: "Abteilungen", nav_contact: "Kontakt",
      menu_title: "Menü", menu_all: "Alle Produkte", search_placeholder: "Ring, Gebetskette, Parfüm suchen…", intro_skip: "Überspringen",
      soon: "Demnächst", filter_all: "Alle", filter_all_sub: "Alle {name}", collection_empty: "Die ersten Stücke der Galerie sind unterwegs – bald verfügbar.", collection_more: "Alle Produkte ansehen ({n})", featured_add: "In den Warenkorb",
      shop_title: "Alle Produkte", shop_count: "{n} Produkte", shop_count_one: "{n} Produkt", shop_more: "Mehr anzeigen ({n})", sort_label: "Sortieren", sort_default: "Empfohlen", sort_new: "Neueste", sort_low: "Preis: aufsteigend", sort_high: "Preis: absteigend",
      empty_category: "In dieser Abteilung gibt es derzeit keine Produkte – bald verfügbar.", out_of_stock: "Ausverkauft",
      spec_category: "Abteilung", spec_metal: "Metall", spec_stone: "Stein", spec_weight: "Gewicht", spec_size: "Größe", spec_stock: "Verfügbarkeit", in_stock: "Auf Lager", in_stock_n: "Auf Lager ({n})",
      qty: "Menge", add_to_cart: "In den Warenkorb", buy_now: "Jetzt bestellen", ask_whatsapp: "Auf WhatsApp nachfragen", out_note: "Derzeit ausverkauft – schreiben Sie uns, und wir sagen Ihnen Bescheid, sobald es wieder da ist.",
      assure_1: "Garantiert echtes Silber", assure_2: "Versand weltweit", assure_2_local: "Lieferung in alle Provinzen", assure_3: "Geschenkverpackung", related: "Das könnte Ihnen auch gefallen",
      notfound_title: "Produkt nicht verfügbar", notfound_text: "Es wurde vielleicht verkauft oder aus der Galerie entfernt.", notfound_btn: "Zurück zum Shop",
      cart_title: "Warenkorb", cart_empty: "Ihr Warenkorb ist leer", cart_browse: "Produkte ansehen", cart_remove: "Entfernen", cart_subtotal: "Zwischensumme", cart_delivery: "Lieferung im Irak",
      cart_free_hint: "Noch {amount} bis zur kostenlosen Lieferung im Irak", cart_intl_hint: "Wir versenden auch weltweit – wählen Sie Ihr Land an der Kasse", cart_total: "Gesamt", cart_checkout: "Zur Kasse",
      added_toast: "„{name}“ liegt im Warenkorb", cart_is_empty: "Der Warenkorb ist leer", free: "Kostenlos", tbd: "Je nach Land",
      co_title: "Bestellung abschließen", co_name: "Vollständiger Name", co_phone: "Telefonnummer (WhatsApp)", co_country: "Land", co_other: "Anderes Land…", co_other_name: "Name des Landes",
      co_city: "Provinz", co_city_intl: "Stadt", co_addr: "Adresse", co_addr_intl: "Vollständige Adresse", co_addr_ph: "Viertel, nächster Orientierungspunkt", co_addr_ph_intl: "Straße, Hausnummer, Postleitzahl",
      co_notes: "Anmerkungen (optional)", co_notes_ph: "Ringgröße, Geschenkverpackung…", co_sub: "Zwischensumme", co_delivery: "Lieferung", co_intl_shipping: "Internationaler Versand", co_total: "Gesamt", co_plus_shipping: "+ Versand",
      co_submit: "Bestellung bestätigen", co_sending: "Bestellung wird gesendet…",
      co_err_name: "Bitte geben Sie Ihren Namen ein", co_err_phone: "Bitte geben Sie eine gültige Telefonnummer ein", co_err_country: "Bitte geben Sie den Namen des Landes ein", co_err_city: "Bitte geben Sie die Stadt ein", co_err_addr: "Bitte geben Sie die vollständige Lieferadresse ein",
      co_err_stock: "Eines der Stücke ist ausverkauft – bitte prüfen Sie Ihren Warenkorb", co_err_gone: "Eines der Stücke ist nicht mehr verfügbar", co_err_failed: "Die Bestellung konnte nicht gesendet werden – bitte versuchen Sie es erneut",
      co_err_busy: "Von diesem Gerät oder dieser Nummer kamen viele Bestellungen – bitte versuchen Sie es gleich noch einmal oder schreiben Sie uns auf WhatsApp", co_err_human: "Die Bestellung konnte nicht überprüft werden – bitte versuchen Sie es erneut",
      ok_title: "Ihre Bestellung ist eingegangen", ok_text: "Vielen Dank, {name} – wir melden uns in Kürze, um Ihre Bestellung zu bestätigen.", ok_no: "Ihre Bestellnummer", ok_wa: "Bestelldetails auf WhatsApp senden", ok_continue: "Weiter einkaufen",
      search_results: "{n} Ergebnisse", search_results_one: "{n} Ergebnis", search_none: "Keine Ergebnisse für „{q}“",
      lbl_address: "Adresse", map_link: "Auf der Karte ansehen", lbl_hours: "Öffnungszeiten", lbl_phone: "Telefon", lbl_whatsapp: "WhatsApp", lbl_email: "E-Mail",
      form_name: "Name", form_phone: "Telefonnummer", form_body: "Ihre Nachricht", form_send: "Nachricht senden", form_sending: "Wird gesendet…",
      form_ok: "Ihre Nachricht ist angekommen – vielen Dank", form_err: "Senden fehlgeschlagen – bitte erneut versuchen", form_busy: "Sie haben viele Nachrichten gesendet – bitte versuchen Sie es gleich noch einmal", form_need_name: "Bitte geben Sie Ihren Namen ein", form_need_body: "Bitte schreiben Sie Ihre Nachricht",
      net_down: "Der Shop ist gerade nicht erreichbar. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.", net_retry: "Erneut versuchen", net_retrying: "Wird versucht…",
      footer_departments: "Abteilungen", footer_contact: "Kontakt", footer_shop: "Shop",
      wa_hello: "Assalamu alaikum", wa_inquiry: "Assalamu alaikum, ich habe eine Frage an {brand}", wa_product: "Assalamu alaikum, ich möchte bestellen: {name} — {price}",
      wa_order: "Assalamu alaikum, neue Bestellung über die Website von {brand}", wa_order_no: "Bestellnummer", wa_items: "Produkte", wa_notes: "Anmerkungen",
      pieces_one: "{n} Stück", pieces_other: "{n} Stück", room_count: "{pieces} im Shop", stat_depts_one: "Abteilung", stat_depts_other: "Abteilungen", stat_pieces_one: "Stück im Shop", stat_pieces_other: "Stücke im Shop",
      lang_label: "Sprache", theme_toggle: "Dunkel / hell", a11y_main_nav: "Hauptmenü", a11y_menu: "Menü öffnen", a11y_close: "Schließen", a11y_theme: "Dunkel / hell umschalten", a11y_search: "Suche", a11y_search_input: "Produkte suchen",
      a11y_cart: "Warenkorb", a11y_cart_panel: "Warenkorb", a11y_whatsapp: "Schreiben Sie uns auf WhatsApp", a11y_logo: "Logo von {brand}", a11y_photo: "Bild {n}", a11y_less: "Weniger", a11y_more: "Mehr"
    },
    contact: { address: "Heiliges Kerbela" },
    shop: { currency: "IQD", payment_note: "Barzahlung bei Lieferung", intl_note: "Die Versandkosten ins Ausland richten sich nach dem Land – wir kontaktieren Sie vor dem Versand zur Bestätigung", intl_payment_note: "Die Zahlung internationaler Bestellungen wird über WhatsApp abgestimmt" },
    footer: { text: "Silber, Edelsteine und Geschenke der heiligen Schreine – von Kerbela in den Irak und die ganze Welt.", copyright: "Alle Rechte vorbehalten – Ruqayya Galerie (Friede sei mit ihr)" },
    seo: { title: "Ruqayya Galerie (Friede sei mit ihr) — Silber & Edelsteine · Kerbela", description: "Silberringe für Herren und Damen, Edelsteine, Gebetsketten, Uhren, Parfüms und Räucherwerk, Gebetsteppiche und Geschenke der heiligen Schreine. Lieferung im ganzen Irak und internationaler Versand weltweit." }
  };

  /* ---------- countries and Iraqi governorates (the order keeps the Arabic name) ---------- */
  var PLACES = {
    en: { "العراق": "Iraq", "السعودية": "Saudi Arabia", "الكويت": "Kuwait", "الإمارات": "United Arab Emirates", "قطر": "Qatar", "البحرين": "Bahrain", "عُمان": "Oman", "عمان": "Oman", "الأردن": "Jordan", "لبنان": "Lebanon", "سوريا": "Syria",
      "إيران": "Iran", "تركيا": "Turkey", "مصر": "Egypt", "المملكة المتحدة": "United Kingdom", "بريطانيا": "United Kingdom", "ألمانيا": "Germany", "السويد": "Sweden", "هولندا": "Netherlands", "فرنسا": "France", "الدنمارك": "Denmark",
      "النرويج": "Norway", "بلجيكا": "Belgium", "النمسا": "Austria", "فنلندا": "Finland", "إيطاليا": "Italy", "إسبانيا": "Spain", "الولايات المتحدة": "United States", "أمريكا": "United States", "كندا": "Canada", "أستراليا": "Australia",
      "نيوزيلندا": "New Zealand", "الهند": "India", "باكستان": "Pakistan", "أذربيجان": "Azerbaijan", "روسيا": "Russia", "ماليزيا": "Malaysia",
      "كربلاء": "Karbala", "بغداد": "Baghdad", "النجف": "Najaf", "بابل": "Babylon", "البصرة": "Basra", "ذي قار": "Dhi Qar", "ميسان": "Maysan", "واسط": "Wasit", "الديوانية": "Diwaniyah", "المثنى": "Muthanna",
      "ديالى": "Diyala", "صلاح الدين": "Salah al-Din", "كركوك": "Kirkuk", "نينوى": "Nineveh", "الأنبار": "Anbar", "أربيل": "Erbil", "السليمانية": "Sulaymaniyah", "دهوك": "Duhok" },
    ur: { "العراق": "عراق", "السعودية": "سعودی عرب", "الكويت": "کویت", "الإمارات": "متحدہ عرب امارات", "قطر": "قطر", "البحرين": "بحرین", "عُمان": "عمان", "عمان": "عمان", "الأردن": "اردن", "لبنان": "لبنان", "سوريا": "شام",
      "إيران": "ایران", "تركيا": "ترکی", "مصر": "مصر", "المملكة المتحدة": "برطانیہ", "بريطانيا": "برطانیہ", "ألمانيا": "جرمنی", "السويد": "سویڈن", "هولندا": "نیدرلینڈز", "فرنسا": "فرانس", "الدنمارك": "ڈنمارک",
      "النرويج": "ناروے", "بلجيكا": "بیلجیم", "النمسا": "آسٹریا", "فنلندا": "فن لینڈ", "إيطاليا": "اٹلی", "إسبانيا": "اسپین", "الولايات المتحدة": "امریکہ", "أمريكا": "امریکہ", "كندا": "کینیڈا", "أستراليا": "آسٹریلیا",
      "نيوزيلندا": "نیوزی لینڈ", "الهند": "بھارت", "باكستان": "پاکستان", "أذربيجان": "آذربائیجان", "روسيا": "روس", "ماليزيا": "ملائیشیا",
      "كربلاء": "کربلا", "بغداد": "بغداد", "النجف": "نجف", "بابل": "بابل", "البصرة": "بصرہ", "ذي قار": "ذی قار", "ميسان": "میسان", "واسط": "واسط", "الديوانية": "دیوانیہ", "المثنى": "مثنیٰ",
      "ديالى": "دیالہ", "صلاح الدين": "صلاح الدین", "كركوك": "کرکوک", "نينوى": "نینوا", "الأنبار": "انبار", "أربيل": "اربیل", "السليمانية": "سلیمانیہ", "دهوك": "دہوک" },
    fa: { "العراق": "عراق", "السعودية": "عربستان سعودی", "الكويت": "کویت", "الإمارات": "امارات متحده‌ی عربی", "قطر": "قطر", "البحرين": "بحرین", "عُمان": "عمان", "عمان": "عمان", "الأردن": "اردن", "لبنان": "لبنان", "سوريا": "سوریه",
      "إيران": "ایران", "تركيا": "ترکیه", "مصر": "مصر", "المملكة المتحدة": "بریتانیا", "بريطانيا": "بریتانیا", "ألمانيا": "آلمان", "السويد": "سوئد", "هولندا": "هلند", "فرنسا": "فرانسه", "الدنمارك": "دانمارک",
      "النرويج": "نروژ", "بلجيكا": "بلژیک", "النمسا": "اتریش", "فنلندا": "فنلاند", "إيطاليا": "ایتالیا", "إسبانيا": "اسپانیا", "الولايات المتحدة": "ایالات متحده", "أمريكا": "ایالات متحده", "كندا": "کانادا", "أستراليا": "استرالیا",
      "نيوزيلندا": "نیوزیلند", "الهند": "هند", "باكستان": "پاکستان", "أذربيجان": "جمهوری آذربایجان", "روسيا": "روسیه", "ماليزيا": "مالزی",
      "كربلاء": "کربلا", "بغداد": "بغداد", "النجف": "نجف", "بابل": "بابل", "البصرة": "بصره", "ذي قار": "ذی‌قار", "ميسان": "میسان", "واسط": "واسط", "الديوانية": "دیوانیه", "المثنى": "مثنی",
      "ديالى": "دیاله", "صلاح الدين": "صلاح‌الدین", "كركوك": "کرکوک", "نينوى": "نینوا", "الأنبار": "الانبار", "أربيل": "اربیل", "السليمانية": "سلیمانیه", "دهوك": "دهوک" },
    de: { "العراق": "Irak", "السعودية": "Saudi-Arabien", "الكويت": "Kuwait", "الإمارات": "Vereinigte Arabische Emirate", "قطر": "Katar", "البحرين": "Bahrain", "عُمان": "Oman", "عمان": "Oman", "الأردن": "Jordanien", "لبنان": "Libanon", "سوريا": "Syrien",
      "إيران": "Iran", "تركيا": "Türkei", "مصر": "Ägypten", "المملكة المتحدة": "Vereinigtes Königreich", "بريطانيا": "Vereinigtes Königreich", "ألمانيا": "Deutschland", "السويد": "Schweden", "هولندا": "Niederlande", "فرنسا": "Frankreich", "الدنمارك": "Dänemark",
      "النرويج": "Norwegen", "بلجيكا": "Belgien", "النمسا": "Österreich", "فنلندا": "Finnland", "إيطاليا": "Italien", "إسبانيا": "Spanien", "الولايات المتحدة": "Vereinigte Staaten", "أمريكا": "Vereinigte Staaten", "كندا": "Kanada", "أستراليا": "Australien",
      "نيوزيلندا": "Neuseeland", "الهند": "Indien", "باكستان": "Pakistan", "أذربيجان": "Aserbaidschan", "روسيا": "Russland", "ماليزيا": "Malaysia",
      "كربلاء": "Kerbela", "بغداد": "Bagdad", "النجف": "Nadschaf", "بابل": "Babil", "البصرة": "Basra", "ذي قار": "Dhi Qar", "ميسان": "Maisan", "واسط": "Wasit", "الديوانية": "Diwaniya", "المثنى": "Muthanna",
      "ديالى": "Diyala", "صلاح الدين": "Salah ad-Din", "كركوك": "Kirkuk", "نينوى": "Ninawa", "الأنبار": "Anbar", "أربيل": "Erbil", "السليمانية": "Sulaimaniyya", "دهوك": "Dohuk" }
  };

  /* ---------- stones, metals and badges typed in Arabic in the dashboard ---------- */
  var TERMS = {
    "فضه 925": ["925 sterling silver", "925 اسٹرلنگ چاندی", "925er Sterlingsilber", "نقره‌ی ۹۲۵"],
    "فضه عيار 925": ["925 sterling silver", "925 اسٹرلنگ چاندی", "925er Sterlingsilber", "نقره‌ی عیار ۹۲۵"],
    "فضه": ["Silver", "چاندی", "Silber", "نقره"], "ذهب": ["Gold", "سونا", "Gold", "طلا"], "ذهب عيار 18": ["18 k gold", "18 قیراط سونا", "18-Karat-Gold", "طلای ۱۸ عیار"], "ذهب عيار 21": ["21 k gold", "21 قیراط سونا", "21-Karat-Gold", "طلای ۲۱ عیار"],
    "فضه مطليه بالذهب": ["Gold-plated silver", "سونے کی پالش والی چاندی", "Vergoldetes Silber", "نقره‌ی آب‌طلاکاری‌شده"], "ستيل": ["Stainless steel", "اسٹیل", "Edelstahl", "استیل"], "نحاس": ["Copper", "تانبا", "Kupfer", "مس"],
    "عقيق": ["Agate (Aqeeq)", "عقیق", "Achat (Aqiq)", "عقیق"], "عقيق يماني": ["Yemeni agate (Aqeeq)", "یمنی عقیق", "Jemenitischer Achat (Aqiq)", "عقیق یمنی"], "عقيق احمر": ["Red agate", "سرخ عقیق", "Roter Achat", "عقیق سرخ"],
    "فيروز": ["Turquoise", "فیروزہ", "Türkis", "فیروزه"], "فيروزج": ["Turquoise", "فیروزہ", "Türkis", "فیروزه"], "فيروز نيشابوري": ["Nishapur turquoise", "نیشاپوری فیروزہ", "Nishapur-Türkis", "فیروزه‌ی نیشابوری"],
    "ياقوت": ["Ruby (Yaqoot)", "یاقوت", "Rubin", "یاقوت"], "ياقوت احمر": ["Red ruby", "سرخ یاقوت", "Roter Rubin", "یاقوت سرخ"],
    "در النجف": ["Dur-e-Najaf", "دُرِ نجف", "Dur-e-Najaf", "دُرّ نجف"], "در نجف": ["Dur-e-Najaf", "دُرِ نجف", "Dur-e-Najaf", "دُرّ نجف"],
    "شذر": ["Shathar", "شذر", "Schathar", "شذر"], "شذر اصفر": ["Yellow shathar", "زرد شذر", "Gelber Schathar", "شذر زرد"],
    "زمرد": ["Emerald", "زمرد", "Smaragd", "زمرد"], "زبرجد": ["Peridot", "زبرجد", "Peridot", "زبرجد"], "جزع": ["Onyx (Jaza')", "جزع", "Onyx (Dschaza)", "جزع"], "جزع يماني": ["Yemeni onyx (Jaza')", "یمنی جزع", "Jemenitischer Onyx", "جزع یمنی"],
    "سليماني": ["Sulaimani agate", "سلیمانی", "Sulaimani-Achat", "سلیمانی"], "حديد صيني": ["Hadid Sini (hematite)", "حدید چینی", "Hadid Sini (Hämatit)", "حدید چینی"], "حديد": ["Hadid (hematite)", "حدید", "Hadid (Hämatit)", "حدید"],
    "لؤلؤ": ["Pearl", "موتی", "Perle", "مروارید"], "لولو": ["Pearl", "موتی", "Perle", "مروارید"], "مرجان": ["Coral", "مرجان", "Koralle", "مرجان"], "زركون": ["Zircon", "زرقون", "Zirkon", "زرکن"], "يسر": ["Yusr (black coral)", "یسر", "Yusr (schwarze Koralle)", "یُسر"],
    "يسر اسود": ["Black yusr", "سیاہ یسر", "Schwarzer Yusr", "یُسر سیاه"], "كهرب": ["Amber", "کہربا", "Bernstein", "کهربا"], "كهرمان": ["Amber", "کہربا", "Bernstein", "کهربا"], "اوبال": ["Opal", "اوپل", "Opal", "اوپال"], "ماس": ["Diamond", "ہیرا", "Diamant", "الماس"],
    "الماس": ["Diamond", "ہیرا", "Diamant", "الماس"], "جمشت": ["Amethyst", "جمشت", "Amethyst", "آمتیست (جمشت)"], "جمست": ["Amethyst", "جمشت", "Amethyst", "آمتیست (جمشت)"], "عين النمر": ["Tiger's eye", "ٹائیگر آئی", "Tigerauge", "چشم ببر"], "كريستال": ["Crystal", "کرسٹل", "Kristall", "کریستال"],
    "جديد": ["New", "نیا", "Neu", "جدید"], "الاكثر طلبا": ["Bestseller", "سب سے مقبول", "Bestseller", "پرطرفدار"], "الاكثر مبيعا": ["Bestseller", "سب سے زیادہ فروخت", "Bestseller", "پرفروش"], "قطعه الموسم": ["Piece of the season", "سیزن کا خاص", "Stück der Saison", "قطعه‌ی فصل"],
    "خصم": ["Sale", "رعایت", "Angebot", "تخفیف"], "عرض": ["Offer", "آفر", "Angebot", "پیشنهاد ویژه"], "حصري": ["Exclusive", "خصوصی", "Exklusiv", "انحصاری"], "محدود": ["Limited", "محدود", "Limitiert", "محدود"], "قطعه نادره": ["Rare piece", "نایاب زیور", "Seltenes Stück", "قطعه‌ی کمیاب"],
    "هديه": ["Gift", "تحفہ", "Geschenk", "هدیه"], "صناعه يدويه": ["Handmade", "ہاتھ کا بنا", "Handarbeit", "دست‌ساز"]
  };
  var TERM_COL = { en: 0, ur: 1, de: 2, fa: 3 };
  // the database's private.ar_norm rules (أ/إ/آ → ا, ة → ه, ى → ي, no harakat, Latin digits)
  function norm(t) {
    return String(t == null ? "" : t).replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); }).replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); })
      .replace(/[ً-ٰٟـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
      .toLowerCase().replace(/\s+/g, " ").trim();
  }
  function term(v, lang) {
    if (!v || !(lang in TERM_COL)) return v;
    var hit = TERMS[norm(v)];
    return hit ? hit[TERM_COL[lang]] : v;
  }
  // "١٢ غرام" → "12 g", "١٠٠ مل" → "100 ml"; anything else stays as written
  var UNITS = [[/(غرامات|غرام|غم|جرام|جم|غ)(?=$|\s|[.,،])/g, "g"], [/(ملليلتر|مليلتر|ملل|مل)(?=$|\s|[.,،])/g, "ml"], [/(سنتيمتر|سم)(?=$|\s|[.,،])/g, "cm"], [/(مليمتر|ملم|مم)(?=$|\s|[.,،])/g, "mm"], [/(قيراط)(?=$|\s|[.,،])/g, "ct"], [/(لتر)(?=$|\s|[.,،])/g, "l"]];
  var UNITS_FA = [[/(غرامات|غرام|غم|جرام|جم|غ)(?=$|\s|[.,،])/g, "گرم"], [/(ملليلتر|مليلتر|ملل|مل)(?=$|\s|[.,،])/g, "میلی‌لیتر"], [/(سنتيمتر|سم)(?=$|\s|[.,،])/g, "سانتی‌متر"],
    [/(مليمتر|ملم|مم)(?=$|\s|[.,،])/g, "میلی‌متر"], [/(قيراط)(?=$|\s|[.,،])/g, "قیراط"], [/(لتر)(?=$|\s|[.,،])/g, "لیتر"]];
  function measure(v, lang) {
    if (!v || lang === "ar") return v;
    if (lang === "fa") {
      var fa = String(v).replace(/[٠-٩]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"["٠١٢٣٤٥٦٧٨٩".indexOf(d)]; });
      UNITS_FA.forEach(function (u) { fa = fa.replace(u[0], u[1]); });
      return fa;
    }
    var out = String(v).replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); }).replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); }).replace(/٫/g, ".").replace(/،/g, ",");
    UNITS.forEach(function (u) { out = out.replace(u[0], u[1]); });
    return /[؀-ۿ]/.test(out) ? v : out.replace(/\s+/g, " ").trim();
  }

  /* ---------- settings: built-in translation, the owner's translation, or Arabic ---------- */
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function filled(v) { return typeof v === "string" && v.trim() !== ""; }
  /* base = merged Arabic settings, t = built-in translation, o = owner's translation,
     d = Arabic default, s = what is saved in Arabic (undefined when never saved) */
  function overlay(base, t, o, d, s) {
    if (typeof t === "string" || typeof o === "string" || typeof base === "string") {
      if (filled(o)) return o;
      if (typeof t === "string" && (s === undefined || s === null || s === "" || same(s, d))) return t;
      return base;
    }
    if (Array.isArray(base)) {
      return base.map(function (x, i) {
        return overlay(x, Array.isArray(t) ? t[i] : undefined, Array.isArray(o) ? o[i] : undefined, Array.isArray(d) ? d[i] : undefined, Array.isArray(s) ? s[i] : undefined);
      });
    }
    if (base && typeof base === "object") {
      var out = {};
      Object.keys(base).forEach(function (k) {
        var tk = t && typeof t === "object" ? t[k] : undefined, ok = o && typeof o === "object" ? o[k] : undefined;
        out[k] = tk === undefined && ok === undefined ? base[k]
          : overlay(base[k], tk, ok, d && typeof d === "object" ? d[k] : undefined, s && typeof s === "object" ? s[k] : undefined);
      });
      return out;
    }
    return base;
  }
  function localize(saved, lang) {
    var DEF = window.RQ_DEFAULTS, base = window.rqMerge(DEF, saved || {});
    if (!lang || lang === "ar" || !T[lang]) return base;
    var own = (saved && saved.i18n && saved.i18n[lang]) || {};
    var out = overlay(base, T[lang], own, DEF, saved || {});
    // interface words added later than the saved settings come from the built-in translation
    out.ui = Object.assign({}, T[lang].ui, out.ui);
    Object.keys(T[lang].ui).forEach(function (k) { if (!filled(out.ui[k])) out.ui[k] = T[lang].ui[k]; });
    return out;
  }
  function place(name, lang, saved) {
    if (!name || !lang || lang === "ar") return name;
    var own = saved && saved.i18n && saved.i18n[lang] && saved.i18n[lang].places;
    return (own && filled(own[name]) && own[name]) || (PLACES[lang] && PLACES[lang][name]) || name;
  }
  /* a built-in translation applies only while the Arabic text is still the default one;
     the dashboard uses this to show which texts need the owner's translation */
  function builtIn(path, lang, saved) {
    var get = function (o) { return path.split(".").reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); };
    var t = get(T[lang] || {});
    if (typeof t !== "string") return { text: "", stale: false };
    var s = get(saved || {}), d = get(window.RQ_DEFAULTS);
    return (s === undefined || s === null || s === "" || same(s, d)) ? { text: t, stale: false } : { text: t, stale: true };
  }

  window.RQ_I18N = { langs: LANGS, order: ORDER, text: T, places: PLACES, terms: TERMS, norm: norm, term: term, measure: measure, localize: localize, place: place, builtIn: builtIn };
})();
