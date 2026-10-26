/** labels for notes, translation search, goal units, hifz view, night mode, image share (az / en / ar; other UI languages use English) */
const en = {
  note: "Note", noteAdd: "Add note", noteEdit: "Edit note", notePh: "Your note for this ayah…", save: "Save", cancel: "Cancel", del: "Delete",
  notesTab: "Bookmarks & notes", trHits: "In translations", trSearching: "Searching translations…",
  goalUnit: "Daily goal", pagesU: "pages", juzU: "juz",
  hifzView: "Hifz view", hifzOn: "Hifz view on: only the first word of each ayah is shown, tap an ayah to reveal it", hifzOff: "Hifz view off",
  night: "Night mode", shareImg: "Share as image", shareText: "Share as text", imgSaved: "Image saved",
  cont: "Continue where you left off",
};
const az: typeof en = {
  note: "Qeyd", noteAdd: "Qeyd əlavə et", noteEdit: "Qeydi dəyiş", notePh: "Bu ayə üçün qeydiniz…", save: "Saxla", cancel: "Ləğv et", del: "Sil",
  notesTab: "Əlfəcinlər və qeydlər", trHits: "Tərcümələrdə", trSearching: "Tərcümələrdə axtarılır…",
  goalUnit: "Gündəlik hədəf", pagesU: "səhifə", juzU: "cüz",
  hifzView: "Hifz görünüşü", hifzOn: "Hifz görünüşü açıqdır: hər ayənin yalnız ilk sözü görünür, açmaq üçün ayəyə toxunun", hifzOff: "Hifz görünüşü bağlıdır",
  night: "Gecə rejimi", shareImg: "Şəkil kimi paylaş", shareText: "Mətn kimi paylaş", imgSaved: "Şəkil saxlanıldı",
  cont: "Qaldığınız yerdən davam edin",
};
const ar: typeof en = {
  note: "ملاحظة", noteAdd: "إضافة ملاحظة", noteEdit: "تعديل الملاحظة", notePh: "ملاحظتك على هذه الآية…", save: "حفظ", cancel: "إلغاء", del: "حذف",
  notesTab: "العلامات والملاحظات", trHits: "في الترجمات", trSearching: "جارٍ البحث في الترجمات…",
  goalUnit: "الهدف اليومي", pagesU: "صفحات", juzU: "جزء",
  hifzView: "وضع الحفظ", hifzOn: "وضع الحفظ مفعّل: تظهر الكلمة الأولى من كل آية فقط، المس الآية لإظهارها", hifzOff: "وضع الحفظ متوقف",
  night: "الوضع الليلي", shareImg: "مشاركة كصورة", shareText: "مشاركة كنص", imgSaved: "حُفظت الصورة",
  cont: "تابع من حيث توقفت",
};
export const X: Record<string, typeof en> = { en, az, ar };
export const xt = (lang: string) => X[lang] || en;
