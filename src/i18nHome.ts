// Home screen strings (5 languages).
const en = {
  hMorning: "Good morning", hAfternoon: "Good afternoon", hEvening: "Good evening", hSalaam: "السلام عليكم",
  hContinue: "Continue where you left off", hResume: "Resume", hPageOf: "Page {p} of {n}", hKhatmBar: "{n}% of this khatm",
  hAyahDay: "Ayah of the day", hTapOpen: "Tap to open",
  hGoal: "Daily goal", hGoalOf: "{n} / {g} pages", hGoalDone: "Goal reached", hStreak: "{n}-day streak", hStreakNone: "Start your streak today",
  hKhatm: "Khatm", hKhatmSub: "{k} completed", hPagesLeft: "{n} pages left",
  hQuick: "Quick actions", hStart: "Start tartil", hStartSub: "Recite with the mic", hJump: "Jump to", hPractice: "Practice", hDue: "{n} due", hNoDue: "All caught up",
  hMistakes: "Mistakes", hWeak: "Words: {n}", hNoWeak: "None yet", hHome: "Home", hOpenReader: "Open the reader",
  hDiagT: "Speech diagnostics", hDiagD: "What the speech engine reports. Tap Test and say something in Arabic.", hDiagEngine: "Engine", hDiagLocale: "Locale", hDiagConf: "Confidence", hDiagResults: "Results", hDiagRestarts: "Auto-restarts", hDiagSwaps: "Alternatives chosen by expected text", hDiagHeard: "Last heard", hDiagTest: "Test microphone", hDiagStop: "Stop test", hDiagNone: "–", hDiagNo: "Speech recognition is not available here.", hDiagMic: "Noise suppression", hDiagOn: "on", hDiagOff: "off",
  hMicDenied: "Microphone access is blocked. Allow it in the app or browser settings, then try again.", hNetErr: "Speech recognition needs an internet connection right now.",
};
type D = typeof en;
const az: D = {
  hMorning: "Sabahınız xeyir", hAfternoon: "Günortanız xeyir", hEvening: "Axşamınız xeyir", hSalaam: "السلام عليكم",
  hContinue: "Qaldığınız yerdən davam edin", hResume: "Davam et", hPageOf: "Səhifə {p} / {n}", hKhatmBar: "Bu xətmin {n}%-i",
  hAyahDay: "Günün ayəsi", hTapOpen: "Açmaq üçün toxunun",
  hGoal: "Gündəlik hədəf", hGoalOf: "{n} / {g} səhifə", hGoalDone: "Hədəfə çatdınız", hStreak: "{n} günlük seriya", hStreakNone: "Bu gün seriyaya başlayın",
  hKhatm: "Xətm", hKhatmSub: "{k} tamamlandı", hPagesLeft: "{n} səhifə qaldı",
  hQuick: "Sürətli əməliyyatlar", hStart: "Tərtilə başla", hStartSub: "Mikrofonla oxu", hJump: "Keç", hPractice: "Təkrar", hDue: "{n} vaxtı çatıb", hNoDue: "Hamısı hazırdır",
  hMistakes: "Səhvlər", hWeak: "{n} söz", hNoWeak: "Hələ yoxdur", hHome: "Ana səhifə", hOpenReader: "Oxuyucunu aç",
  hDiagT: "Səs diaqnostikası", hDiagD: "Səs mühərrikinin bildirdikləri. Test düyməsinə basıb ərəbcə nəsə deyin.", hDiagEngine: "Mühərrik", hDiagLocale: "Dil kodu", hDiagConf: "Etibarlılıq", hDiagResults: "Nəticələr", hDiagRestarts: "Avtomatik yenidən başlama", hDiagSwaps: "Gözlənilən mətnə görə seçilən alternativlər", hDiagHeard: "Son eşidilən", hDiagTest: "Mikrofonu yoxla", hDiagStop: "Testi dayandır", hDiagNone: "–", hDiagNo: "Burada səs tanıma yoxdur.", hDiagMic: "Küy azaltma", hDiagOn: "açıq", hDiagOff: "bağlı",
  hMicDenied: "Mikrofon girişi bloklanıb. Tətbiq və ya brauzer ayarlarında icazə verib yenidən cəhd edin.", hNetErr: "Səs tanıma üçün hazırda internet lazımdır.",
};
const tr: D = {
  hMorning: "Günaydın", hAfternoon: "Tünaydın", hEvening: "İyi akşamlar", hSalaam: "السلام عليكم",
  hContinue: "Okumaya devam et", hResume: "Devam et", hPageOf: "Sayfa {p} / {n}", hKhatmBar: "Bu hatmin %{n}'i",
  hAyahDay: "Günün ayeti", hTapOpen: "Açmak için dokunun",
  hGoal: "Günlük hedef", hGoalOf: "{n} / {g} sayfa", hGoalDone: "Hedefe ulaşıldı", hStreak: "{n} günlük seri", hStreakNone: "Seriye bugün başlayın",
  hKhatm: "Hatim", hKhatmSub: "{k} tamamlandı", hPagesLeft: "{n} sayfa kaldı",
  hQuick: "Hızlı işlemler", hStart: "Tertile başla", hStartSub: "Mikrofonla oku", hJump: "Git", hPractice: "Tekrar", hDue: "{n} zamanı geldi", hNoDue: "Hepsi tamam",
  hMistakes: "Hatalar", hWeak: "{n} kelime", hNoWeak: "Henüz yok", hHome: "Ana sayfa", hOpenReader: "Okuyucuyu aç",
  hDiagT: "Ses tanıma tanılama", hDiagD: "Ses motorunun bildirdikleri. Test'e basıp Arapça bir şey söyleyin.", hDiagEngine: "Motor", hDiagLocale: "Dil kodu", hDiagConf: "Güven", hDiagResults: "Sonuçlar", hDiagRestarts: "Otomatik yeniden başlatma", hDiagSwaps: "Beklenen metne göre seçilen alternatifler", hDiagHeard: "Son duyulan", hDiagTest: "Mikrofonu dene", hDiagStop: "Testi durdur", hDiagNone: "–", hDiagNo: "Burada ses tanıma yok.", hDiagMic: "Gürültü bastırma", hDiagOn: "açık", hDiagOff: "kapalı",
  hMicDenied: "Mikrofon erişimi engellendi. Uygulama veya tarayıcı ayarlarından izin verip tekrar deneyin.", hNetErr: "Ses tanıma için şu anda internet bağlantısı gerekiyor.",
};
const ar: D = {
  hMorning: "صباح الخير", hAfternoon: "طاب يومك", hEvening: "مساء الخير", hSalaam: "السلام عليكم",
  hContinue: "تابع من حيث توقفت", hResume: "متابعة", hPageOf: "صفحة {p} من {n}", hKhatmBar: "{n}% من هذه الختمة",
  hAyahDay: "آية اليوم", hTapOpen: "المس للفتح",
  hGoal: "الهدف اليومي", hGoalOf: "{n} / {g} صفحات", hGoalDone: "تحقق الهدف", hStreak: "{n} أيام متتالية", hStreakNone: "ابدأ سلسلتك اليوم",
  hKhatm: "الختمة", hKhatmSub: "اكتمل {k}", hPagesLeft: "متبقي {n} صفحة",
  hQuick: "إجراءات سريعة", hStart: "ابدأ التلاوة", hStartSub: "اقرأ بالميكروفون", hJump: "انتقل إلى", hPractice: "مراجعة", hDue: "{n} مستحقة", hNoDue: "لا شيء مستحق",
  hMistakes: "الأخطاء", hWeak: "كلمات: {n}", hNoWeak: "لا شيء بعد", hHome: "الرئيسية", hOpenReader: "افتح القارئ",
  hDiagT: "تشخيص التعرف على الصوت", hDiagD: "ما يبلغ عنه محرك الصوت. اضغط اختبار وقل شيئاً بالعربية.", hDiagEngine: "المحرك", hDiagLocale: "اللغة", hDiagConf: "الثقة", hDiagResults: "النتائج", hDiagRestarts: "إعادة التشغيل التلقائي", hDiagSwaps: "بدائل اختيرت حسب النص المتوقع", hDiagHeard: "آخر ما سُمع", hDiagTest: "اختبار الميكروفون", hDiagStop: "إيقاف الاختبار", hDiagNone: "–", hDiagNo: "التعرف على الصوت غير متاح هنا.", hDiagMic: "كتم الضوضاء", hDiagOn: "مفعّل", hDiagOff: "معطّل",
  hMicDenied: "تم حظر الوصول إلى الميكروفون. اسمح به من إعدادات التطبيق أو المتصفح ثم حاول مرة أخرى.", hNetErr: "يحتاج التعرف على الصوت إلى اتصال بالإنترنت الآن.",
};
const ru: D = {
  hMorning: "Доброе утро", hAfternoon: "Добрый день", hEvening: "Добрый вечер", hSalaam: "السلام عليكم",
  hContinue: "Продолжить чтение", hResume: "Продолжить", hPageOf: "Страница {p} из {n}", hKhatmBar: "{n}% этого хатма",
  hAyahDay: "Аят дня", hTapOpen: "Коснитесь, чтобы открыть",
  hGoal: "Дневная цель", hGoalOf: "{n} / {g} стр.", hGoalDone: "Цель достигнута", hStreak: "Серия: {n} дн.", hStreakNone: "Начните серию сегодня",
  hKhatm: "Хатм", hKhatmSub: "завершено: {k}", hPagesLeft: "осталось {n} стр.",
  hQuick: "Быстрые действия", hStart: "Начать тартиль", hStartSub: "Читать с микрофоном", hJump: "Перейти", hPractice: "Повторение", hDue: "к повтору: {n}", hNoDue: "Всё повторено",
  hMistakes: "Ошибки", hWeak: "слов: {n}", hNoWeak: "Пока нет", hHome: "Главная", hOpenReader: "Открыть чтение",
  hDiagT: "Диагностика распознавания", hDiagD: "Что сообщает движок речи. Нажмите «Проверка» и скажите что-нибудь по-арабски.", hDiagEngine: "Движок", hDiagLocale: "Язык", hDiagConf: "Уверенность", hDiagResults: "Результаты", hDiagRestarts: "Автоперезапуски", hDiagSwaps: "Варианты, выбранные по ожидаемому тексту", hDiagHeard: "Последнее услышанное", hDiagTest: "Проверка микрофона", hDiagStop: "Остановить", hDiagNone: "–", hDiagNo: "Распознавание речи здесь недоступно.", hDiagMic: "Шумоподавление", hDiagOn: "вкл", hDiagOff: "выкл",
  hMicDenied: "Доступ к микрофону заблокирован. Разрешите его в настройках приложения или браузера и повторите.", hNetErr: "Для распознавания речи сейчас нужен интернет.",
};
export const H: Record<string, D> = { en, az, tr, ar, ru };
