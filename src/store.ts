import { useCallback, useEffect, useState } from "react";
import { load, KEY, type Settings } from "./storeLogic";
export * from "./storeLogic";

export function useSettings() {
  const [st, setSt] = useState<Settings>(load);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(st)); }, [st]);
  const update = useCallback((f: (s: Settings) => Settings) => setSt((s) => f(s)), []);
  return [st, update] as const;
}
