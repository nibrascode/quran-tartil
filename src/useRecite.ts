import { useCallback, useEffect, useRef, useState } from "react";
import { Stabilizer, CONFIRM_MS } from "./stabilize";
import { ReciteSession, type AyahTokens } from "./reciteCore";
import { createListener, type Listener } from "./speech";
import { pageItems, PAGES } from "./quran";
import type { Prefs } from "./store";
import { recordSession } from "./Tartil";

export type ReciteMode = "off" | "on" | "paused" | "review";
const mergeEvents = (ev: { key: string; word: string; n: number }[]) => {
  const m = new Map<string, { key: string; word: string; n: number }>();
  for (const e of ev) { const id = e.key + "|" + e.word; const x = m.get(id); if (x) x.n += e.n; else m.set(id, { ...e }); }
  return [...m.values()];
};
const tokensOf = (p: number): AyahTokens[] => (pageItems(p).filter((x) => x.k === "ayah") as { k: "ayah"; s: number; a: number; text: string }[]).map((x) => ({ key: x.s + ":" + x.a, tokens: x.text.split(" ").filter(Boolean) }));

/** Live recitation mode on the reader: words are revealed (green/red) as they are recited; the page turns itself when finished. */
export function useRecite(page: number, setPage: (p: number) => void, prefs: Prefs) {
  const [mode, setMode] = useState<ReciteMode>("off");
  const [tick, setTick] = useState(0);
  const [err, setErr] = useState("");
  const sess = useRef<ReciteSession | null>(null);
  const heard = useRef<string[]>([]);
  const stabRef = useRef(new Stabilizer(CONFIRM_MS[prefs.strict]));
  const archive = useRef<{ key: string; word: string; n: number }[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lis = useRef<Listener | null>(null);
  const modeRef = useRef<ReciteMode>("off");
  const pageRef = useRef(page);
  const turning = useRef(false);
  modeRef.current = mode;
  pageRef.current = page;

  const save = useCallback(() => {
    sess.current?.res.forEach((r, key) => { if (r.closed) recordSession(key, { score: r.score, wrong: [] }); });
  }, []);

  const feed = useCallback((words: string[], isFinal = false) => {
    const s = sess.current;
    if (!s || modeRef.current !== "on") return;
    const stab = stabRef.current;
    const stable = stab.push(words, isFinal, Date.now());
    apply(stable, true); // released words are already confirmed
    if (stab.waiting) {
      // nothing new is released until the word is confirmed: check again shortly (no flicker from interim guesses)
      clearTimeout(timer.current);
      timer.current = setTimeout(() => { if (modeRef.current === "on") apply(stab.poll(Date.now()), true); }, stab.ms + 30);
    }
  }, [setPage]); // eslint-disable-line
  const apply = useCallback((stable: string[], isFinal: boolean) => {
    heard.current = stable;
    const s = sess.current;
    if (!s) return;
    s.feed(stable, isFinal);
    setTick((t) => t + 1);
    if (s.finished && !turning.current) {
      turning.current = true;
      setTimeout(() => {
        turning.current = false;
        if (modeRef.current !== "on") return;
        if (pageRef.current < PAGES) setPage(pageRef.current + 1); else stop();
      }, 900);
    }
  }, [setPage]); // eslint-disable-line

  // page changed (auto-turn or manual): new session; words already heard before the turn are not reused except the leftover
  useEffect(() => {
    if (modeRef.current === "off") return;
    const old = sess.current;
    if (old) archive.current.push(...old.events);
    const next = new ReciteSession(tokensOf(page), prefs.strict);
    if (modeRef.current === "on" && old?.finished) { next.consumed = old.consumed; next.feed(heard.current); } else next.consumed = heard.current.length;
    sess.current = next;
    if (modeRef.current === "review") setMode("off");
    setTick((t) => t + 1);
  }, [page]); // eslint-disable-line

  const begin = useCallback(async (from?: { s: number; a: number } | null) => {
    setErr("");
    archive.current = [];
    const ns = new ReciteSession(tokensOf(pageRef.current), prefs.strict);
    const k = from ? ns.ayahs.findIndex((x) => x.key === from.s + ":" + from.a) : -1;
    if (k > 0) { ns.cursor = k; ns.start = k; }
    sess.current = ns;
    heard.current = [];
    stabRef.current = new Stabilizer(CONFIRM_MS[prefs.strict]);
    setMode("on");
    modeRef.current = "on";
    lis.current = createListener({
      lang: prefs.recLang,
      onWords: feed,
      onNewSession: () => { sess.current?.newRecogniser(); heard.current = []; stabRef.current.reset(); },
      onError: (m) => { setErr(m); setMode("off"); },
      onEnd: () => {},
    });
    await lis.current.start();
    setTick((t) => t + 1);
  }, [feed, prefs.recLang, prefs.strict]);

  const pause = useCallback(async () => { clearTimeout(timer.current); await lis.current?.stop(); setMode("paused"); }, []);
  const resume = useCallback(async () => { sess.current?.newRecogniser(); heard.current = []; stabRef.current.reset(); setMode("on"); modeRef.current = "on"; await lis.current?.start(); }, []);
  const stop = useCallback(async () => {
    clearTimeout(timer.current);
    await lis.current?.stop();
    sess.current?.finish();
    save();
    setMode(sess.current && sess.current.res.size ? "review" : "off");
    setTick((t) => t + 1);
  }, [save]);
  /** one ayah back (the current one if it already has progress), to re-recite it */
  const back = useCallback(() => {
    const s = sess.current; if (!s) return;
    const cur = s.ayahs[s.cursor];
    const k = cur && s.res.has(cur.key) ? s.cursor : s.cursor - 1;
    s.seek(Math.max(s.start, k), heard.current.length);
    setTick((t) => t + 1);
  }, []);
  const restart = useCallback(() => { const s = sess.current; if (!s) return; s.seek(s.start, heard.current.length); setTick((t) => t + 1); }, []);
  const close = useCallback(() => { setMode("off"); sess.current = null; setTick((t) => t + 1); }, []);
  useEffect(() => () => { lis.current?.stop(); }, []);

  // paint the page: green = matched, red = different/skipped, hidden (blurred) = not recited yet
  useEffect(() => {
    document.querySelectorAll<HTMLElement>(".w.ok,.w.bad,.w.skp,.ayah.closed").forEach((el) => el.classList.remove("ok", "bad", "skp", "closed"));
    const s = sess.current;
    if (mode === "off" || !s) return;
    const root = document.querySelector(`.page[data-page="${page}"]`);
    if (!root) return;
    for (let i = 0; i < s.start; i++) { const [sn, an] = s.ayahs[i].key.split(":"); root.querySelectorAll<HTMLElement>(`.mtext .w.ayah[data-s="${sn}"][data-a="${an}"]`).forEach((w) => w.classList.add("skp")); }
    s.res.forEach((r, key) => {
      const [sn, an] = key.split(":");
      root.querySelectorAll<HTMLElement>(`.ayah[data-s="${sn}"][data-a="${an}"]`).forEach((a) => a.classList.toggle("closed", r.closed));
      root.querySelectorAll<HTMLElement>(`.mtext .w.ayah[data-s="${sn}"][data-a="${an}"]`).forEach((w, i) => {
        const st = r.states[i];
        if (st === "ok") w.classList.add("ok"); else if (st === "bad" || st === "missing") w.classList.add("bad"); else if (st === "skip") w.classList.add("skp");
      });
    });
  }, [tick, page, mode]);

  const s = sess.current;
  return { held: !!s?.held, mode, err, begin, pause, resume, stop, close, back, restart, mistakes: mergeEvents([...archive.current, ...(s?.events ?? [])]), score: s?.score ?? 0, closedAyahs: s ? [...s.res.values()].filter((r) => r.closed).length : 0, totalAyahs: s?.ayahs.length ?? 0 };
}
