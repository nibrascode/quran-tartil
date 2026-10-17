export type Lang = "az" | "en" | "tr" | "ar" | "ru";
export const LANGS: { id: Lang; label: string }[] = [
  { id: "az", label: "Azərbaycanca" }, { id: "en", label: "English" }, { id: "tr", label: "Türkçe" }, { id: "ar", label: "العربية" }, { id: "ru", label: "Русский" },
];
const en = {
  app: "Quran Tartil", surah: "Surah", juz: "Juz", page: "Page", menu: "Menu", settings: "Settings", about: "About", close: "Close",
  goPage: "Go to page", go: "Go", language: "Language", theme: "Theme", light: "Light", dark: "Dark", sepia: "Sepia",
  ayahs: "ayahs", search: "Search surah", hint: "Swipe right or tap the left edge for the next page. Tap the middle for the menu.",
  tartil: "Tartil check", tartilTitle: "Recitation check (experimental)", start: "Start", stop: "Stop", listening: "Listening…",
  tartilNote: "Experimental. Speech recognition for Arabic is imperfect and cannot judge tajweed. Use it as a hint, not as a teacher.",
  tartilUnsupported: "Speech recognition is not available in this browser.", mistakeWarn: "Check this word", correct: "Correct", resume: "Resume",
  aboutText: "Offline Quran reader. Arabic text only, as published by the Tanzil Project.",
  source: "Quran text", sourceBody: "Tanzil Quran Text (Uthmani, version 1.1), © 2007–2026 Tanzil Project, license Creative Commons Attribution 3.0. Copied verbatim, unchanged. Source: tanzil.net.",
  terms: "Terms of use (from Tanzil)", font: "Font", fontBody: "Amiri Quran by The Amiri Project Authors, SIL Open Font License 1.1.",
  layout: "Page layout", layoutBody: "604-page Madinah mushaf pagination from Tanzil metadata. Text is scaled to fill each page; line breaks are not identical to the printed mushaf.",
  by: "Made by Nibras Code", openTanzil: "Open tanzil.net",
};
type Dict = typeof en;
const az: Dict = {
  app: "Quran Tartil", surah: "Surə", juz: "Cüz", page: "Səhifə", menu: "Menyu", settings: "Ayarlar", about: "Haqqında", close: "Bağla",
  goPage: "Səhifəyə keç", go: "Keç", language: "Dil", theme: "Mövzu", light: "Açıq", dark: "Tünd", sepia: "Sepiya",
  ayahs: "ayə", search: "Surə axtar", hint: "Növbəti səhifə üçün sağa çəkin və ya sol kənara toxunun. Menyu üçün ortaya toxunun.",
  tartil: "Tərtil yoxlaması", tartilTitle: "Tilavət yoxlaması (eksperimental)", start: "Başla", stop: "Dayandır", listening: "Dinləyirəm…",
  tartilNote: "Eksperimentaldır. Ərəbcə səs tanıma qüsursuz deyil və təcvidi qiymətləndirə bilmir. Bunu ipucu kimi istifadə edin, müəllim kimi yox.",
  tartilUnsupported: "Bu brauzerdə səs tanıma yoxdur.", mistakeWarn: "Bu sözü yoxlayın", correct: "Düzgün", resume: "Davam et",
  aboutText: "Oflayn Quran oxuyucusu. Yalnız ərəbcə mətn, Tanzil Layihəsinin nəşri ilə.",
  source: "Quran mətni", sourceBody: "Tanzil Quran Text (Uthmani, versiya 1.1), © 2007–2026 Tanzil Project, lisenziya Creative Commons Attribution 3.0. Dəyişdirilmədən, olduğu kimi köçürülüb. Mənbə: tanzil.net.",
  terms: "İstifadə şərtləri (Tanzil)", font: "Şrift", fontBody: "Amiri Quran, The Amiri Project Authors, SIL Open Font License 1.1.",
  layout: "Səhifə düzülüşü", layoutBody: "Tanzil metadatasından 604 səhifəlik Mədinə mushafı bölgüsü. Mətn hər səhifəni dolduracaq şəkildə ölçüləndirilir; sətir bölgüsü çap mushafı ilə eyni deyil.",
  by: "Nibras Code tərəfindən", openTanzil: "tanzil.net-i aç",
};
const tr: Dict = {
  app: "Quran Tartil", surah: "Sure", juz: "Cüz", page: "Sayfa", menu: "Menü", settings: "Ayarlar", about: "Hakkında", close: "Kapat",
  goPage: "Sayfaya git", go: "Git", language: "Dil", theme: "Tema", light: "Açık", dark: "Koyu", sepia: "Sepya",
  ayahs: "ayet", search: "Sure ara", hint: "Sonraki sayfa için sağa kaydırın veya sol kenara dokunun. Menü için ortaya dokunun.",
  tartil: "Tertil kontrolü", tartilTitle: "Tilavet kontrolü (deneysel)", start: "Başlat", stop: "Durdur", listening: "Dinliyorum…",
  tartilNote: "Deneyseldir. Arapça ses tanıma kusursuz değildir ve tecvidi değerlendiremez. İpucu olarak kullanın, öğretmen yerine değil.",
  tartilUnsupported: "Bu tarayıcıda ses tanıma yok.", mistakeWarn: "Bu kelimeyi kontrol edin", correct: "Doğru", resume: "Devam et",
  aboutText: "Çevrimdışı Kur'an okuyucusu. Yalnızca Arapça metin, Tanzil Projesi yayını.",
  source: "Kur'an metni", sourceBody: "Tanzil Quran Text (Uthmani, sürüm 1.1), © 2007–2026 Tanzil Project, lisans Creative Commons Attribution 3.0. Değiştirilmeden olduğu gibi kopyalanmıştır. Kaynak: tanzil.net.",
  terms: "Kullanım şartları (Tanzil)", font: "Yazı tipi", fontBody: "Amiri Quran, The Amiri Project Authors, SIL Open Font License 1.1.",
  layout: "Sayfa düzeni", layoutBody: "Tanzil meta verisinden 604 sayfalık Medine mushafı bölümlemesi. Metin her sayfayı dolduracak şekilde ölçeklenir; satır sonları basılı mushafla aynı değildir.",
  by: "Nibras Code tarafından", openTanzil: "tanzil.net'i aç",
};
const ar: Dict = {
  app: "ترتيل القرآن", surah: "سورة", juz: "جزء", page: "صفحة", menu: "القائمة", settings: "الإعدادات", about: "حول", close: "إغلاق",
  goPage: "اذهب إلى صفحة", go: "اذهب", language: "اللغة", theme: "المظهر", light: "فاتح", dark: "داكن", sepia: "بني",
  ayahs: "آية", search: "ابحث عن سورة", hint: "اسحب إلى اليمين أو المس الحافة اليسرى للصفحة التالية. المس الوسط للقائمة.",
  tartil: "فحص الترتيل", tartilTitle: "فحص التلاوة (تجريبي)", start: "ابدأ", stop: "أوقف", listening: "أستمع…",
  tartilNote: "تجريبي. التعرف على الكلام العربي غير مثالي ولا يحكم التجويد. استخدمه كتلميح لا كمعلّم.",
  tartilUnsupported: "التعرف على الكلام غير متوفر في هذا المتصفح.", mistakeWarn: "راجع هذه الكلمة", correct: "صحيح", resume: "متابعة",
  aboutText: "قارئ قرآن دون اتصال. النص العربي فقط كما نشره مشروع تنزيل.",
  source: "نص القرآن", sourceBody: "Tanzil Quran Text (Uthmani، الإصدار 1.1)، © 2007–2026 Tanzil Project، الرخصة Creative Commons Attribution 3.0. منسوخ كما هو دون تغيير. المصدر: tanzil.net.",
  terms: "شروط الاستخدام (من تنزيل)", font: "الخط", fontBody: "Amiri Quran، The Amiri Project Authors، رخصة SIL Open Font License 1.1.",
  layout: "تخطيط الصفحات", layoutBody: "ترقيم مصحف المدينة (٦٠٤ صفحة) من بيانات تنزيل. يُكبَّر النص ليملأ الصفحة؛ وتقسيم الأسطر لا يطابق المصحف المطبوع.",
  by: "من Nibras Code", openTanzil: "افتح tanzil.net",
};
const ru: Dict = {
  app: "Коран Тартиль", surah: "Сура", juz: "Джуз", page: "Страница", menu: "Меню", settings: "Настройки", about: "О приложении", close: "Закрыть",
  goPage: "Перейти к странице", go: "Перейти", language: "Язык", theme: "Тема", light: "Светлая", dark: "Тёмная", sepia: "Сепия",
  ayahs: "аятов", search: "Найти суру", hint: "Проведите вправо или коснитесь левого края для следующей страницы. Коснитесь центра для меню.",
  tartil: "Проверка тартиля", tartilTitle: "Проверка чтения (экспериментально)", start: "Старт", stop: "Стоп", listening: "Слушаю…",
  tartilNote: "Экспериментально. Распознавание арабской речи несовершенно и не оценивает таджвид. Это подсказка, а не учитель.",
  tartilUnsupported: "Распознавание речи недоступно в этом браузере.", mistakeWarn: "Проверьте это слово", correct: "Верно", resume: "Продолжить",
  aboutText: "Офлайн-читалка Корана. Только арабский текст, опубликованный проектом Tanzil.",
  source: "Текст Корана", sourceBody: "Tanzil Quran Text (Uthmani, версия 1.1), © 2007–2026 Tanzil Project, лицензия Creative Commons Attribution 3.0. Скопирован дословно, без изменений. Источник: tanzil.net.",
  terms: "Условия использования (Tanzil)", font: "Шрифт", fontBody: "Amiri Quran, The Amiri Project Authors, SIL Open Font License 1.1.",
  layout: "Вёрстка страниц", layoutBody: "Разбивка на 604 страницы мединского мусхафа по метаданным Tanzil. Текст масштабируется под страницу; переносы строк не совпадают с печатным мусхафом.",
  by: "Сделано Nibras Code", openTanzil: "Открыть tanzil.net",
};
export const T: Record<Lang, Dict> = { az, en, tr, ar, ru };
export type Key = keyof Dict;
export function detectLang(): Lang {
  const saved = localStorage.getItem("lang") as Lang | null;
  if (saved && T[saved]) return saved;
  const n = (navigator.language || "en").slice(0, 2).toLowerCase();
  return (["az", "en", "tr", "ar", "ru"].includes(n) ? n : "en") as Lang;
}
