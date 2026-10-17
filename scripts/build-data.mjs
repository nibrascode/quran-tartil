// Tanzil metadata (suras, 604 Madinah-mushaf pages, juz) -> src/data/meta.json. The Quran text itself is NOT modified.
import { readFileSync, writeFileSync } from "node:fs";
const xml = readFileSync(new URL("../src/data/tanzil-quran-data.xml", import.meta.url), "utf8");
const attr = (tag, re = new RegExp(`<${tag} ([^>]*)/>`, "g")) => [...xml.matchAll(re)].map((m) => Object.fromEntries([...m[1].matchAll(/(\w+)="([^"]*)"/g)].map((a) => [a[1], a[2]])));
const suras = attr("sura").map((s) => ({ i: +s.index, ayas: +s.ayas, name: s.name, tname: s.tname, ename: s.ename, type: s.type }));
const pages = attr("page").sort((a, b) => a.index - b.index).map((p) => [+p.sura, +p.aya]);
const juz = attr("juz").sort((a, b) => a.index - b.index).map((p) => [+p.sura, +p.aya]);
if (suras.length !== 114 || pages.length !== 604 || juz.length !== 30) throw new Error("unexpected metadata sizes " + [suras.length, pages.length, juz.length]);
writeFileSync(new URL("../src/data/meta.json", import.meta.url), JSON.stringify({ suras, pages, juz }));
console.log("ok", suras.length, pages.length, juz.length);
