import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { surah as surahMeta, type SurahMeta } from "@/lib/quran";

export const LANGS = ["az", "tr", "en", "ar", "ru"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_META: { id: Lang; native: string }[] = [
  { id: "az", native: "Azərbaycan" },
  { id: "tr", native: "Türkçe" },
  { id: "en", native: "English" },
  { id: "ar", native: "العربية" },
  { id: "ru", native: "Русский" },
];

const TR = [
  "Fatiha", "Bakara", "Âl-i İmrân", "Nisâ", "Mâide", "En'âm", "A'râf", "Enfâl", "Tevbe", "Yûnus",
  "Hûd", "Yûsuf", "Ra'd", "İbrâhîm", "Hicr", "Nahl", "İsrâ", "Kehf", "Meryem", "Tâhâ",
  "Enbiyâ", "Hac", "Mü'minûn", "Nûr", "Furkân", "Şuarâ", "Neml", "Kasas", "Ankebût", "Rûm",
  "Lokmân", "Secde", "Ahzâb", "Sebe", "Fâtır", "Yâsîn", "Sâffât", "Sâd", "Zümer", "Mü'min",
  "Fussilet", "Şûrâ", "Zuhruf", "Duhân", "Câsiye", "Ahkâf", "Muhammed", "Fetih", "Hucurât", "Kâf",
  "Zâriyât", "Tûr", "Necm", "Kamer", "Rahmân", "Vâkıa", "Hadîd", "Mücâdele", "Haşr", "Mümtehine",
  "Saf", "Cuma", "Münâfikûn", "Teğâbün", "Talâk", "Tahrîm", "Mülk", "Kalem", "Hâkka", "Meâric",
  "Nûh", "Cin", "Müzzemmil", "Müddessir", "Kıyâmet", "İnsan", "Mürselât", "Nebe", "Nâziât", "Abese",
  "Tekvîr", "İnfitâr", "Mutaffifîn", "İnşikâk", "Bürûc", "Târık", "A'lâ", "Gâşiye", "Fecr", "Beled",
  "Şems", "Leyl", "Duhâ", "İnşirâh", "Tîn", "Alak", "Kadr", "Beyyine", "Zilzâl", "Âdiyât",
  "Kâria", "Tekâsür", "Asr", "Hümeze", "Fîl", "Kureyş", "Mâûn", "Kevser", "Kâfirûn", "Nasr",
  "Tebbet", "İhlâs", "Felak", "Nâs",
];

const EN = [
  "Al-Fatihah", "Al-Baqarah", "Ali 'Imran", "An-Nisa", "Al-Ma'idah", "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus",
  "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Ta-Ha",
  "Al-Anbiya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan", "Ash-Shu'ara", "An-Naml", "Al-Qasas", "Al-Ankabut", "Ar-Rum",
  "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir", "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir",
  "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf",
  "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", "Al-Mujadila", "Al-Hashr", "Al-Mumtahanah",
  "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij",
  "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba", "An-Nazi'at", "Abasa",
  "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad",
  "Ash-Shams", "Al-Layl", "Ad-Duha", "Ash-Sharh", "At-Tin", "Al-Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-Adiyat",
  "Al-Qari'ah", "At-Takathur", "Al-Asr", "Al-Humazah", "Al-Fil", "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr",
  "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas",
];

const RU = [
  "Аль-Фатиха", "Аль-Бакара", "Аль Имран", "Ан-Ниса", "Аль-Маида", "Аль-Анам", "Аль-Араф", "Аль-Анфаль", "Ат-Тауба", "Юнус",
  "Худ", "Юсуф", "Ар-Рад", "Ибрахим", "Аль-Хиджр", "Ан-Нахль", "Аль-Исра", "Аль-Кахф", "Марьям", "Та Ха",
  "Аль-Анбия", "Аль-Хадж", "Аль-Муминун", "Ан-Нур", "Аль-Фуркан", "Аш-Шуара", "Ан-Намль", "Аль-Касас", "Аль-Анкабут", "Ар-Рум",
  "Лукман", "Ас-Саджда", "Аль-Ахзаб", "Саба", "Фатир", "Йа Син", "Ас-Саффат", "Сад", "Аз-Зумар", "Гафир",
  "Фуссилат", "Аш-Шура", "Аз-Зухруф", "Ад-Духан", "Аль-Джасия", "Аль-Ахкаф", "Мухаммад", "Аль-Фатх", "Аль-Худжурат", "Каф",
  "Аз-Зарият", "Ат-Тур", "Ан-Наджм", "Аль-Камар", "Ар-Рахман", "Аль-Вакиа", "Аль-Хадид", "Аль-Муджадила", "Аль-Хашр", "Аль-Мумтахана",
  "Ас-Сафф", "Аль-Джумуа", "Аль-Мунафикун", "Ат-Тагабун", "Ат-Таляк", "Ат-Тахрим", "Аль-Мульк", "Аль-Калям", "Аль-Хакка", "Аль-Мааридж",
  "Нух", "Аль-Джинн", "Аль-Муззаммиль", "Аль-Муддассир", "Аль-Кияма", "Аль-Инсан", "Аль-Мурсалят", "Ан-Наба", "Ан-Назиат", "Абаса",
  "Ат-Таквир", "Аль-Инфитар", "Аль-Мутаффифин", "Аль-Иншикак", "Аль-Бурудж", "Ат-Тарик", "Аль-Аля", "Аль-Гашия", "Аль-Фаджр", "Аль-Балад",
  "Аш-Шамс", "Аль-Лейль", "Ад-Духа", "Аш-Шарх", "Ат-Тин", "Аль-Аляк", "Аль-Кадр", "Аль-Баййина", "Аз-Залзала", "Аль-Адият",
  "Аль-Кариа", "Ат-Такасур", "Аль-Аср", "Аль-Хумаза", "Аль-Филь", "Курайш", "Аль-Маун", "Аль-Каусар", "Аль-Кафирун", "Ан-Наср",
  "Аль-Масад", "Аль-Ихлас", "Аль-Фаляк", "Ан-Нас",
];

const EXTRA: Record<Exclude<Lang, "az" | "ar">, string[]> = { tr: TR, en: EN, ru: RU };

type Copy = {
  title: string;
  sub: string;
  search: string;
  settings: string;
  langTitle: string;
  close: string;
  empty: string;
  juz: (n: number) => string;
  meccan: string;
  medinan: string;
  ayah: (n: number) => string;
};

export const UI: Record<Lang, Copy> = {
  az: {
    title: "Qurani-Kərim",
    sub: "Mədinə məshəfi",
    search: "Surə adı və ya nömrəsi",
    settings: "Ayarlar",
    langTitle: "Dil",
    close: "Bağla",
    empty: "Uyğun surə yoxdur",
    juz: (n) => `Cüz ${n}`,
    meccan: "Məkkə",
    medinan: "Mədinə",
    ayah: (n) => `${n} ayə`,
  },
  tr: {
    title: "Kur'an-ı Kerim",
    sub: "Medine mushafı",
    search: "Sure adı veya numarası",
    settings: "Ayarlar",
    langTitle: "Dil",
    close: "Kapat",
    empty: "Sure bulunamadı",
    juz: (n) => `Cüz ${n}`,
    meccan: "Mekkî",
    medinan: "Medenî",
    ayah: (n) => `${n} ayet`,
  },
  en: {
    title: "The Holy Qur'an",
    sub: "Madinah mushaf",
    search: "Surah name or number",
    settings: "Settings",
    langTitle: "Language",
    close: "Close",
    empty: "No surah found",
    juz: (n) => `Juz ${n}`,
    meccan: "Meccan",
    medinan: "Medinan",
    ayah: (n) => `${n} verses`,
  },
  ar: {
    title: "القرآن الكريم",
    sub: "مصحف المدينة",
    search: "اسم السورة أو رقمها",
    settings: "الإعدادات",
    langTitle: "اللغة",
    close: "إغلاق",
    empty: "لا توجد سورة",
    juz: (n) => `الجزء ${n}`,
    meccan: "مكية",
    medinan: "مدنية",
    ayah: (n) => `${n} آية`,
  },
  ru: {
    title: "Священный Коран",
    sub: "Мединский мусхаф",
    search: "Название или номер",
    settings: "Настройки",
    langTitle: "Язык",
    close: "Закрыть",
    empty: "Сура не найдена",
    juz: (n) => `Джуз ${n}`,
    meccan: "Мекканская",
    medinan: "Мединская",
    ayah: (n) => `${n} аятов`,
  },
};

export function arabicName(s: SurahMeta): string {
  return s.ar.replace(/^سُورَةُ\s+/, "");
}

export function surahLabel(n: number, lang: Lang): string {
  const s = surahMeta(n);
  if (lang === "az") return s.az;
  if (lang === "ar") return arabicName(s);
  return EXTRA[lang][n - 1] ?? s.az;
}

export function surahSearchBlob(s: SurahMeta): string {
  return [s.az, s.ar, arabicName(s), TR[s.n - 1], EN[s.n - 1], RU[s.n - 1], String(s.n)].join(" ");
}

const KEY = "meshef-lang";

type Ctx = { lang: Lang; setLang: (l: Lang) => void };

const LocaleCtx = createContext<Ctx | null>(null);

function isLang(v: string | null): v is Lang {
  return v === "az" || v === "tr" || v === "en" || v === "ar" || v === "ru";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("az");

  useEffect(() => {
    const saved = window.localStorage.getItem(KEY);
    if (isLang(saved)) setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(KEY, l);
    } catch {
      /* private mode */
    }
  };

  const value = useMemo(() => ({ lang, setLang }), [lang]);
  return <LocaleCtx.Provider value={value}>{children}</LocaleCtx.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleCtx);
  if (!ctx) throw new Error("Locale missing");
  return ctx;
}
