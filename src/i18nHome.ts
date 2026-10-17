// Home screen strings (5 languages).
const en = {
  hMorning: "Good morning", hAfternoon: "Good afternoon", hEvening: "Good evening", hSalaam: "السلام عليكم",
  hContinue: "Continue reading", hResume: "Resume", hPageOf: "Page {p} of {n}", hKhatmBar: "{n}% of this khatm",
  hAyahDay: "Ayah of the day", hTapOpen: "Tap to open",
  hGoal: "Daily goal", hGoalOf: "{n} / {g} pages", hGoalDone: "Goal reached", hStreak: "{n}-day streak", hStreakNone: "Start your streak today",
  hKhatm: "Khatm", hKhatmSub: "{k} completed", hPagesLeft: "{n} pages left",
  hQuick: "Quick actions", hStart: "Start tartil", hStartSub: "Recite with the mic", hJump: "Jump to", hPractice: "Practice", hDue: "{n} due", hNoDue: "All caught up",
  hMistakes: "Mistakes", hWeak: "Words: {n}", hNoWeak: "None yet", hHome: "Home", hOpenReader: "Open the reader",
};
type D = typeof en;
const az: D = {
  hMorning: "Sabahınız xeyir", hAfternoon: "Günortanız xeyir", hEvening: "Axşamınız xeyir", hSalaam: "السلام عليكم",
  hContinue: "Oxumağa davam et", hResume: "Davam et", hPageOf: "Səhifə {p} / {n}", hKhatmBar: "Bu xətmin {n}%-i",
  hAyahDay: "Günün ayəsi", hTapOpen: "Açmaq üçün toxunun",
  hGoal: "Gündəlik hədəf", hGoalOf: "{n} / {g} səhifə", hGoalDone: "Hədəfə çatdınız", hStreak: "{n} günlük seriya", hStreakNone: "Bu gün seriyaya başlayın",
  hKhatm: "Xətm", hKhatmSub: "{k} tamamlandı", hPagesLeft: "{n} səhifə qaldı",
  hQuick: "Sürətli əməliyyatlar", hStart: "Tərtilə başla", hStartSub: "Mikrofonla oxu", hJump: "Keç", hPractice: "Təkrar", hDue: "{n} vaxtı çatıb", hNoDue: "Hamısı hazırdır",
  hMistakes: "Səhvlər", hWeak: "{n} söz", hNoWeak: "Hələ yoxdur", hHome: "Ana səhifə", hOpenReader: "Oxuyucunu aç",
};
const tr: D = {
  hMorning: "Günaydın", hAfternoon: "Tünaydın", hEvening: "İyi akşamlar", hSalaam: "السلام عليكم",
  hContinue: "Okumaya devam et", hResume: "Devam et", hPageOf: "Sayfa {p} / {n}", hKhatmBar: "Bu hatmin %{n}'i",
  hAyahDay: "Günün ayeti", hTapOpen: "Açmak için dokunun",
  hGoal: "Günlük hedef", hGoalOf: "{n} / {g} sayfa", hGoalDone: "Hedefe ulaşıldı", hStreak: "{n} günlük seri", hStreakNone: "Seriye bugün başlayın",
  hKhatm: "Hatim", hKhatmSub: "{k} tamamlandı", hPagesLeft: "{n} sayfa kaldı",
  hQuick: "Hızlı işlemler", hStart: "Tertile başla", hStartSub: "Mikrofonla oku", hJump: "Git", hPractice: "Tekrar", hDue: "{n} zamanı geldi", hNoDue: "Hepsi tamam",
  hMistakes: "Hatalar", hWeak: "{n} kelime", hNoWeak: "Henüz yok", hHome: "Ana sayfa", hOpenReader: "Okuyucuyu aç",
};
const ar: D = {
  hMorning: "صباح الخير", hAfternoon: "طاب يومك", hEvening: "مساء الخير", hSalaam: "السلام عليكم",
  hContinue: "تابع القراءة", hResume: "متابعة", hPageOf: "صفحة {p} من {n}", hKhatmBar: "{n}% من هذه الختمة",
  hAyahDay: "آية اليوم", hTapOpen: "المس للفتح",
  hGoal: "الهدف اليومي", hGoalOf: "{n} / {g} صفحات", hGoalDone: "تحقق الهدف", hStreak: "{n} أيام متتالية", hStreakNone: "ابدأ سلسلتك اليوم",
  hKhatm: "الختمة", hKhatmSub: "اكتمل {k}", hPagesLeft: "متبقي {n} صفحة",
  hQuick: "إجراءات سريعة", hStart: "ابدأ التلاوة", hStartSub: "اقرأ بالميكروفون", hJump: "انتقل إلى", hPractice: "مراجعة", hDue: "{n} مستحقة", hNoDue: "لا شيء مستحق",
  hMistakes: "الأخطاء", hWeak: "كلمات: {n}", hNoWeak: "لا شيء بعد", hHome: "الرئيسية", hOpenReader: "افتح القارئ",
};
const ru: D = {
  hMorning: "Доброе утро", hAfternoon: "Добрый день", hEvening: "Добрый вечер", hSalaam: "السلام عليكم",
  hContinue: "Продолжить чтение", hResume: "Продолжить", hPageOf: "Страница {p} из {n}", hKhatmBar: "{n}% этого хатма",
  hAyahDay: "Аят дня", hTapOpen: "Коснитесь, чтобы открыть",
  hGoal: "Дневная цель", hGoalOf: "{n} / {g} стр.", hGoalDone: "Цель достигнута", hStreak: "Серия: {n} дн.", hStreakNone: "Начните серию сегодня",
  hKhatm: "Хатм", hKhatmSub: "завершено: {k}", hPagesLeft: "осталось {n} стр.",
  hQuick: "Быстрые действия", hStart: "Начать тартиль", hStartSub: "Читать с микрофоном", hJump: "Перейти", hPractice: "Повторение", hDue: "к повтору: {n}", hNoDue: "Всё повторено",
  hMistakes: "Ошибки", hWeak: "слов: {n}", hNoWeak: "Пока нет", hHome: "Главная", hOpenReader: "Открыть чтение",
};
export const H: Record<string, D> = { en, az, tr, ar, ru };
