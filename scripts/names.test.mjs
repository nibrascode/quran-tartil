import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const meta = JSON.parse(readFileSync(new URL("../src/data/meta.json", import.meta.url), "utf8"));
const src = readFileSync(new URL("../src/quran.ts", import.meta.url), "utf8");
const fix = Object.fromEntries([...src.match(/NAME_FIX[^=]*=\s*\{([^}]*)\}/)[1].matchAll(/(\d+):\s*"([^"]+)"/g)].map((m) => [+m[1], m[2]]));
const names = meta.suras.map((x) => fix[x.i] || x.name);
const VERIFIED = "الفاتحة البقرة آل عمران النساء المائدة الأنعام الأعراف الأنفال التوبة يونس هود يوسف الرعد إبراهيم الحجر النحل الإسراء الكهف مريم طه الأنبياء الحج المؤمنون النور الفرقان الشعراء النمل القصص العنكبوت الروم لقمان السجدة الأحزاب سبأ فاطر يس الصافات ص الزمر غافر فصلت الشورى الزخرف الدخان الجاثية الأحقاف محمد الفتح الحجرات ق الذاريات الطور النجم القمر الرحمن الواقعة الحديد المجادلة الحشر الممتحنة الصف الجمعة المنافقون التغابن الطلاق التحريم الملك القلم الحاقة المعارج نوح الجن المزمل المدثر القيامة الإنسان المرسلات النبأ النازعات عبس التكوير الانفطار المطففين الانشقاق البروج الطارق الأعلى الغاشية الفجر البلد الشمس الليل الضحى الشرح التين العلق القدر البينة الزلزلة العاديات القارعة التكاثر العصر الهمزة الفيل قريش الماعون الكوثر الكافرون النصر المسد الإخلاص الفلق الناس".split(" ");
// "آل عمران" is two words
const list = [...VERIFIED.slice(0, 2), "آل عمران", ...VERIFIED.slice(4)];
const norm = (s) => s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه");
test("114 surah names, all plain Arabic letters", () => {
  assert.equal(names.length, 114);
  for (const [i, n] of names.entries()) assert.match(n, /^[\u0621-\u064A\u0670\u0671 ]+$/, `sura ${i + 1}: ${n}`);
});
test("names match the verified list (hamza-insensitive) and fixed names have hamza", () => {
  assert.equal(list.length, 114);
  names.forEach((n, i) => assert.equal(norm(n), norm(list[i]), `sura ${i + 1}: ${n} vs ${list[i]}`));
  for (const k of [14, 34, 76, 78, 82, 84]) assert.equal(names[k - 1], list[k - 1]);
});
