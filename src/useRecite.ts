import { useCallback, useEffect, useRef, useState } from "react";
import { ReciteSession, type AyahTokens } from "./reciteCore";
import { createListener, type Listener } from "./speech";
import { pageItems, PAGES } from "./quran";
import type { Prefs } from "./store";
import { recordSession } from "./Tartil";

export type ReciteMode = "off" | "on" | "paused" | "review";
const tokensOf = (p: number): AyahTokens[] => (pageItems(p).filter((x) => x.k === "ayah") as { k: "ayah"; s: number; a: number; text: string }[]).map((x) => ({ key: x.s + ":" + x.a, tokens: x.text.split(" ").filter(Boolean) }));

/** Live recitation mode on the reader: words are revealed (green/red) as they are recited; the page turns itself when finished. */
export function useRecite(page: number, setPage: (p: number) => void, prefs: Prefs) {
  const [mode, setMode] = useState<ReciteMode>("off");
  const [tick, setTick] = useState(0);
  const [err, setErr] = useState("");
  const sess = useRef<ReciteSession | null>(null);
  const heard = useRef<string[]>([]);
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
    heard.current = words;
    const s = sess.current;
    if (!s || modeRef.current !== "on") return;
    s.feed(words, isFinal);
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
    const next = new ReciteSession(tokensOf(page), prefs.strict);
    if (modeRef.current === "on" && old?.finished) { next.consumed = old.consumed; next.feed(heard.current); } else next.consumed = heard.current.length;
    sess.current = next;
    if (modeRef.current === "review") setMode("off");
    setTick((t) => t + 1);
  }, [page]); // eslint-disable-line

  const begin = useCallback(async () => {
    setErr("");
    sess.current = new ReciteSession(tokensOf(pageRef.current), prefs.strict);
    heard.current = [];
    setMode("on");
    modeRef.current = "on";
    lis.current = createListener({
      lang: prefs.recLang,
      onWords: feed,
      onNewSession: () => { sess.current?.newRecogniser(); heard.current = []; },
      onError: (m) => { setErr(m); setMode("off"); },
      onEnd: () => {},
    });
    await lis.current.start();
    setTick((t) => t + 1);
  }, [feed, prefs.recLang, prefs.strict]);

  const pause = useCallback(async () => { await lis.current?.stop(); setMode("paused"); }, []);
  const resume = useCallback(async () => { sess.current?.newRecogniser(); heard.current = []; setMode("on"); modeRef.current = "on"; await lis.current?.start(); }, []);
  const stop = useCallback(async () => {
    await lis.current?.stop();
    sess.current?.finish();
    save();
    setMode(sess.current && sess.current.res.size ? "review" : "off");
    setTick((t) => t + 1);
  }, [save]);
  const close = useCallback(() => { setMode("off"); sess.current = null; setTick((t) => t + 1); }, []);
  useEffect(() => () => { lis.current?.stop(); }, []);

  // paint the page: green = matched, red = different/skipped, hidden (blurred) = not recited yet
  useEffect(() => {
    document.querySelectorAll<HTMLElement>(".w.ok,.w.bad,.w.skp,.ayah.closed").forEach((el) => el.classList.remove("ok", "bad", "skp", "closed"));
    const s = sess.current;
    if (mode === "off" || !s) return;
    const root = document.querySelector(`.page[data-page="${page}"]`);
    if (!root) return;
    s.res.forEach((r, key) => {
      const [sn, an] = key.split(":");
      root.querySelectorAll<HTMLElement>(`.ayah[data-s="${sn}"][data-a="${an}"]`).forEach((a) => a.classList.toggle("closed", r.closed));
      root.querySelectorAll<HTMLElement>(`.w.ayah[data-s="${sn}"][data-a="${an}"]`).forEach((w, i) => {
        const st = r.states[i];
        if (st === "ok") w.classList.add("ok"); else if (st === "bad" || st === "missing") w.classList.add("bad"); else if (st === "skip") w.classList.add("skp");
      });
    });
  }, [tick, page, mode]);

  const s = sess.current;
  return { held: !!s?.held, mode, err, begin, pause, resume, stop, close, score: s?.score ?? 0, closedAyahs: s ? [...s.res.values()].filter((r) => r.closed).length : 0, totalAyahs: s?.ayahs.length ?? 0 };
}
