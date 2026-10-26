#!/usr/bin/env python3
"""public/tr/quranenc.json + file sizes -> src/data/translations.json (the list the app shows, grouped by language)."""
import datetime, json, os
R = os.path.join(os.path.dirname(__file__), "../../public/tr")
info = json.load(open(R + "/quranenc.json"))
NATIVE = {"en": "English", "ur": "اردو", "de": "Deutsch", "es": "Español", "ha": "Hausa", "ug": "ئۇيغۇرچە", "tr": "Türkçe", "fa": "فارسی", "tg": "Тоҷикӣ",
          "ps": "پښتو", "nl": "Nederlands", "uz": "Oʻzbekcha", "ky": "Кыргызча", "ku": "Kurdî", "hi": "हिन्दी", "ta": "தமிழ்", "so": "Soomaali", "ja": "日本語",
          "fr": "Français", "pt": "Português", "az": "Azərbaycanca", "ru": "Русский"}
BY = {"english_hilali_khan": "Muhammad Taqi-ud-Din al-Hilali, Muhammad Muhsin Khan", "english_saheeh": "Saheeh International", "english_rwwad": "Rowwad Translation Center",
      "urdu_junagarhi": "محمد جوناگڑھی", "german_bubenheim": "Frank Bubenheim, Nadeem Elyas", "spanish_garcia": "Isa García", "hausa_gummi": "Abubakar Mahmoud Gumi",
      "uyghur_saleh": "مۇھەممەد سالىھ", "turkish_shahin": "Ali Özek ve diğerleri", "turkish_rwwad": "Rowwad Tercüme Merkezi", "persian_ih": "مرکز ترجمه رواد",
      "tajik_arifi": "Маркази тарҷумаи Равод", "pashto_rwwad": "د رواد د ژباړې مرکز", "dutch_center": "Rowwad Vertaalcentrum", "uzbek_mansour": "Алоуддин Мансур",
      "kyrgyz_hakimov": "Шамсуддин Хакимов", "kurdish_bamoki": "محمد صالح بامۆکی", "hindi_omari": "अज़ीज़ुल-हक़ उमरी", "tamil_omar": "உமர் ஷரீஃப்",
      "somali_yacob": "Cabdullaahi Xasan Yacquub", "japanese_saeedsato": "サイード佐藤", "french_rashid": "Rachid Maach", "portuguese_nasr": "Helmi Nasr"}
# language order: the two existing ones, then by number of speakers of the app's users (rough), then the rest
ORDER = ["az", "ru", "tr", "en", "ur", "fa", "uz", "tg", "ky", "ug", "ps", "ku", "hi", "ta", "fr", "de", "nl", "es", "pt", "ha", "so", "ja"]
out = [
  {"id": "az.musayev", "lang": "az", "lname": NATIVE["az"], "name": "Əlixan Musayev", "dir": "ltr", "bytes": os.path.getsize(R + "/az.musayev.json"), "src": "Tanzil.net (az.musayev)"},
  {"id": "ru.kuliev", "lang": "ru", "lname": NATIVE["ru"], "name": "Эльмир Кулиев", "dir": "ltr", "bytes": os.path.getsize(R + "/ru.kuliev.json"), "src": "Tanzil.net (ru.kuliev)"},
]
for k, m in info.items():
    b = sum(os.path.getsize(f"{R}/{k}/{s}.json") for s in range(1, 115))
    out.append({"id": k, "lang": m["lang"], "lname": NATIVE[m["lang"]], "name": BY[k], "dir": m["dir"], "bytes": b, "per": True, "ver": m["version"],
                "src": f"QuranEnc.com — {m['title']} (v{m['version']}, {datetime.datetime.fromtimestamp(int(m['last_update']), datetime.timezone.utc):%Y-%m-%d})"})
out.sort(key=lambda x: (ORDER.index(x["lang"]), 0 if x["id"] in ("english_saheeh", "turkish_shahin") else 1, x["id"]))
json.dump(out, open(os.path.join(os.path.dirname(__file__), "../../src/data/translations.json"), "w"), ensure_ascii=False, indent=1)
print(len(out), round(sum(x["bytes"] for x in out) / 1e6, 1), "MB")
