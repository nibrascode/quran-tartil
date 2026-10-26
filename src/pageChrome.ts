import { createContext } from "react";
import { suras } from "./quran";

/** UI hooks for the in-page mushaf chrome (top bar / bottom band). Pages render without it too (defaults). */
export type Chrome = { tajweed?: boolean; lang: string; juzLabel: string; onBack?: () => void; onSettings?: () => void; backLabel?: string; settingsLabel?: string; onList?: () => void; listLabel?: string; onHifz?: () => void; hifzOn?: boolean; hifzLabel?: string; onNight?: () => void; nightOn?: boolean; nightLabel?: string };
export const PageChrome = createContext<Chrome>({ lang: "ar", juzLabel: "جزء" });

/** Azerbaijani surah names (UI label only; the Quran text itself is never touched) */
const AZ = "Fatihə,Bəqərə,Ali-İmran,Nisa,Maidə,Ənam,Əraf,Ənfal,Tövbə,Yunus,Hud,Yusuf,Rəd,İbrahim,Hicr,Nəhl,İsra,Kəhf,Məryəm,Taha,Ənbiya,Həcc,Muminun,Nur,Furqan,Şuəra,Nəml,Qəsəs,Ankəbut,Rum,Loğman,Səcdə,Əhzab,Səba,Fatir,Yasin,Saffat,Sad,Zumər,Ğafir,Fussilət,Şura,Zuxruf,Duxan,Casiyə,Əhqaf,Muhəmməd,Fəth,Hucurat,Qaf,Zariyat,Tur,Nəcm,Qəmər,Rəhman,Vaqiə,Hədid,Mucadələ,Həşr,Mumtəhinə,Saff,Cumə,Munafiqun,Təğabun,Talaq,Təhrim,Mulk,Qələm,Haqqə,Məaric,Nuh,Cin,Muzzəmmil,Muddəssir,Qiyamə,İnsan,Mursəlat,Nəbə,Naziat,Əbəsə,Təkvir,İnfitar,Mutəffifin,İnşiqaq,Buruc,Tariq,Əla,Ğaşiyə,Fəcr,Bələd,Şəms,Leyl,Duha,İnşirah,Tin,Ələq,Qədr,Bəyyinə,Zəlzələ,Adiyat,Qariə,Təkasur,Əsr,Huməzə,Fil,Qureyş,Maun,Kövsər,Kafirun,Nəsr,Məsəd,İxlas,Fələq,Nas".split(",");
export const AZ_NAMES = AZ;

export function suraTitle(i: number, lang: string): string {
  const s = suras[i - 1];
  switch (lang) {
    case "az": return `${AZ[i - 1]} surəsi`;
    case "tr": return `${s.tname} Suresi`;
    case "ru": return `Сура ${s.tname}`;
    case "en": return `Surah ${s.tname}`;
    default: return `سورة ${s.name}`;
  }
}
