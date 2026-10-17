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
const xen = {
  searchTab: "Search", searchPh: "Search in Arabic (no marks needed) or 2:255", noResults: "Nothing found", bookmarks: "Bookmarks", bookmarkAdd: "Bookmark", bookmarkRemove: "Remove bookmark", noBookmarks: "No bookmarks yet. Tap an ayah, then the bookmark button.",
  progress: "Progress", khatm: "Khatm progress", khatmsDone: "Completed khatms", todayGoal: "Today", goalPages: "Daily goal (pages)", streak: "Day streak", days: "days", pagesRead: "pages",
  reminder: "Daily reminder", reminderOn: "Remind me to read", reminderTime: "Time", reminderApp: "Reminders work in the Android app.", reminderDenied: "Notification permission was denied.", reminderTitle: "Time for your Quran wird", reminderBody: "A few pages today keep the habit alive.",
  copy: "Copy", share: "Share", copied: "Copied", retry: "Retry", summary: "Session summary", score: "Score", noMistakes: "No mistakes found so far.", weakWords: "Words to review", tapRetry: "Tap an ayah score to retry it.",
  ob1t: "Read like a real mushaf", ob1b: "604 pages, one page per screen. Swipe left-to-right or tap the left edge for the next page, like an Arabic book.",
  ob2t: "Tap an ayah", ob2b: "Highlight, copy, share or bookmark it. Search Arabic without typing marks. Your place and daily goal are saved.",
  ob3t: "Check your tartil", ob3b: "Experimental: recite an ayah and see which words differ. It is a hint, not a teacher.",
  next: "Next", skip: "Skip", begin: "Begin", intro: "Show introduction", continueFrom: "Continue from page", ayahWord: "Ayah", textSize: "Reading",
  pageOf: "Page {n} of {t}", selectedAyah: "Selected ayah",
};
type X = typeof xen;
const xaz: X = {
  searchTab: "Axtarış", searchPh: "Ərəbcə axtar (hərəkə lazım deyil) və ya 2:255", noResults: "Heç nə tapılmadı", bookmarks: "Əlfəcinlər", bookmarkAdd: "Əlfəcin", bookmarkRemove: "Əlfəcini sil", noBookmarks: "Hələ əlfəcin yoxdur. Ayəyə toxunun, sonra əlfəcin düyməsini basın.",
  progress: "İrəliləyiş", khatm: "Xətm irəliləyişi", khatmsDone: "Tamamlanan xətmlər", todayGoal: "Bu gün", goalPages: "Gündəlik hədəf (səhifə)", streak: "Ardıcıl gün", days: "gün", pagesRead: "səhifə",
  reminder: "Gündəlik xatırlatma", reminderOn: "Oxumağı xatırlat", reminderTime: "Vaxt", reminderApp: "Xatırlatmalar Android tətbiqində işləyir.", reminderDenied: "Bildiriş icazəsi verilmədi.", reminderTitle: "Quran vird vaxtıdır", reminderBody: "Bu gün bir neçə səhifə vərdişi saxlayır.",
  copy: "Kopyala", share: "Paylaş", copied: "Kopyalandı", retry: "Təkrar", summary: "Seans xülasəsi", score: "Nəticə", noMistakes: "İndiyə qədər səhv tapılmadı.", weakWords: "Təkrar ediləcək sözlər", tapRetry: "Təkrar üçün ayənin nəticəsinə toxunun.",
  ob1t: "Əsl mushaf kimi oxu", ob1b: "604 səhifə, ekranda bir səhifə. Növbəti səhifə üçün soldan sağa çəkin və ya sol kənara toxunun, ərəb kitabı kimi.",
  ob2t: "Ayəyə toxun", ob2b: "Vurğula, kopyala, paylaş və ya əlfəcinlə. Ərəbcə hərəkəsiz axtar. Yeriniz və gündəlik hədəf saxlanır.",
  ob3t: "Tərtilini yoxla", ob3b: "Eksperimental: ayəni oxuyun və hansı sözlərin fərqləndiyini görün. Bu ipucudur, müəllim deyil.",
  next: "Növbəti", skip: "Keç", begin: "Başla", intro: "Təqdimatı göstər", continueFrom: "Davam: səhifə", ayahWord: "Ayə", textSize: "Oxu",
  pageOf: "Səhifə {n} / {t}", selectedAyah: "Seçilmiş ayə",
};
const xtr: X = {
  searchTab: "Ara", searchPh: "Arapça ara (hareke gerekmez) veya 2:255", noResults: "Bir şey bulunamadı", bookmarks: "Yer imleri", bookmarkAdd: "Yer imi", bookmarkRemove: "Yer imini sil", noBookmarks: "Henüz yer imi yok. Bir ayete dokunun, sonra yer imi düğmesine basın.",
  progress: "İlerleme", khatm: "Hatim ilerlemesi", khatmsDone: "Tamamlanan hatimler", todayGoal: "Bugün", goalPages: "Günlük hedef (sayfa)", streak: "Gün serisi", days: "gün", pagesRead: "sayfa",
  reminder: "Günlük hatırlatma", reminderOn: "Okumayı hatırlat", reminderTime: "Saat", reminderApp: "Hatırlatmalar Android uygulamasında çalışır.", reminderDenied: "Bildirim izni reddedildi.", reminderTitle: "Kur'an vird vakti", reminderBody: "Bugün birkaç sayfa alışkanlığı canlı tutar.",
  copy: "Kopyala", share: "Paylaş", copied: "Kopyalandı", retry: "Tekrar", summary: "Oturum özeti", score: "Skor", noMistakes: "Şimdiye kadar hata bulunmadı.", weakWords: "Gözden geçirilecek kelimeler", tapRetry: "Tekrar için ayetin skoruna dokunun.",
  ob1t: "Gerçek mushaf gibi oku", ob1b: "604 sayfa, ekranda tek sayfa. Sonraki sayfa için soldan sağa kaydırın veya sol kenara dokunun, Arapça kitap gibi.",
  ob2t: "Bir ayete dokun", ob2b: "Vurgula, kopyala, paylaş veya yer imi koy. Arapçayı harekesiz ara. Yeriniz ve günlük hedef kaydedilir.",
  ob3t: "Tertilini kontrol et", ob3b: "Deneysel: bir ayeti okuyun, hangi kelimelerin farklı olduğunu görün. Bu bir ipucudur, öğretmen değil.",
  next: "İleri", skip: "Geç", begin: "Başla", intro: "Tanıtımı göster", continueFrom: "Devam: sayfa", ayahWord: "Ayet", textSize: "Okuma",
  pageOf: "Sayfa {n} / {t}", selectedAyah: "Seçili ayet",
};
const xar: X = {
  searchTab: "بحث", searchPh: "ابحث بالعربية (بلا تشكيل) أو 2:255", noResults: "لا نتائج", bookmarks: "العلامات", bookmarkAdd: "علامة", bookmarkRemove: "إزالة العلامة", noBookmarks: "لا علامات بعد. المس آية ثم زر العلامة.",
  progress: "التقدم", khatm: "تقدم الختمة", khatmsDone: "الختمات المكتملة", todayGoal: "اليوم", goalPages: "الهدف اليومي (صفحات)", streak: "أيام متتالية", days: "يوم", pagesRead: "صفحة",
  reminder: "تذكير يومي", reminderOn: "ذكّرني بالقراءة", reminderTime: "الوقت", reminderApp: "التذكيرات تعمل في تطبيق أندرويد.", reminderDenied: "تم رفض إذن الإشعارات.", reminderTitle: "حان وقت وردك من القرآن", reminderBody: "بضع صفحات اليوم تحفظ العادة.",
  copy: "نسخ", share: "مشاركة", copied: "تم النسخ", retry: "إعادة", summary: "ملخص الجلسة", score: "النتيجة", noMistakes: "لم تُرصد أخطاء حتى الآن.", weakWords: "كلمات للمراجعة", tapRetry: "المس نتيجة الآية لإعادتها.",
  ob1t: "اقرأ كالمصحف الحقيقي", ob1b: "٦٠٤ صفحات، صفحة واحدة في الشاشة. اسحب من اليسار إلى اليمين أو المس الحافة اليسرى للصفحة التالية كالكتاب العربي.",
  ob2t: "المس آية", ob2b: "ظلّلها أو انسخها أو شاركها أو ضع علامة. ابحث بالعربية دون تشكيل. يُحفظ موضعك وهدفك اليومي.",
  ob3t: "افحص ترتيلك", ob3b: "تجريبي: اقرأ آية وانظر أي الكلمات تختلف. هو تلميح وليس معلّماً.",
  next: "التالي", skip: "تخطي", begin: "ابدأ", intro: "عرض المقدمة", continueFrom: "تابع من صفحة", ayahWord: "آية", textSize: "القراءة",
  pageOf: "صفحة {n} من {t}", selectedAyah: "الآية المحددة",
};
const xru: X = {
  searchTab: "Поиск", searchPh: "Поиск по-арабски (без огласовок) или 2:255", noResults: "Ничего не найдено", bookmarks: "Закладки", bookmarkAdd: "Закладка", bookmarkRemove: "Убрать закладку", noBookmarks: "Закладок пока нет. Коснитесь аята и нажмите кнопку закладки.",
  progress: "Прогресс", khatm: "Прогресс хатма", khatmsDone: "Завершённые хатмы", todayGoal: "Сегодня", goalPages: "Дневная цель (страниц)", streak: "Дней подряд", days: "дн.", pagesRead: "стр.",
  reminder: "Ежедневное напоминание", reminderOn: "Напоминать о чтении", reminderTime: "Время", reminderApp: "Напоминания работают в Android-приложении.", reminderDenied: "Разрешение на уведомления отклонено.", reminderTitle: "Время вашего вирда", reminderBody: "Несколько страниц сегодня поддерживают привычку.",
  copy: "Копировать", share: "Поделиться", copied: "Скопировано", retry: "Повторить", summary: "Итоги сеанса", score: "Результат", noMistakes: "Ошибок пока нет.", weakWords: "Слова для повторения", tapRetry: "Коснитесь результата аята, чтобы повторить.",
  ob1t: "Читайте как настоящий мусхаф", ob1b: "604 страницы, одна страница на экран. Проведите слева направо или коснитесь левого края для следующей страницы, как в арабской книге.",
  ob2t: "Коснитесь аята", ob2b: "Выделите, скопируйте, поделитесь или добавьте закладку. Ищите по-арабски без огласовок. Место и дневная цель сохраняются.",
  ob3t: "Проверьте тартиль", ob3b: "Экспериментально: прочтите аят и увидите, какие слова отличаются. Это подсказка, а не учитель.",
  next: "Далее", skip: "Пропустить", begin: "Начать", intro: "Показать введение", continueFrom: "Продолжить со страницы", ayahWord: "Аят", textSize: "Чтение",
  pageOf: "Страница {n} из {t}", selectedAyah: "Выбранный аят",
};
const XT: Record<Lang, X> = { az: xaz, en: xen, tr: xtr, ar: xar, ru: xru };
import { S } from "./i18nSettings";
import { D } from "./i18nDock";
type SS = (typeof S)["en"] & (typeof D)["en"];
export const T: Record<Lang, Dict & X & SS> = { az: { ...az, ...xaz, ...S.az, ...D.az }, en: { ...en, ...xen, ...S.en, ...D.en }, tr: { ...tr, ...xtr, ...S.tr, ...D.tr }, ar: { ...ar, ...xar, ...S.ar, ...D.ar }, ru: { ...ru, ...xru, ...S.ru, ...D.ru } };
void XT;
export type Key = keyof Dict | keyof X;
export function detectLang(): Lang {
  const saved = localStorage.getItem("lang") as Lang | null;
  if (saved && T[saved]) return saved;
  const n = (navigator.language || "en").slice(0, 2).toLowerCase();
  return (["az", "en", "tr", "ar", "ru"].includes(n) ? n : "en") as Lang;
}
