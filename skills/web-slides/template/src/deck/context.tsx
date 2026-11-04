import { createContext, useContext, useEffect, useRef } from "react";

export type Mode = "present" | "static" | "print";

export interface SlideCtx {
  step: number;
  mode: Mode;
  index: number;
  total: number;
}

export const SlideContext = createContext<SlideCtx>({ step: 0, mode: "present", index: 0, total: 1 });
export const useSlide = () => useContext(SlideContext);
export const useIsStatic = () => useContext(SlideContext).mode !== "present";

/* ---- readiness tracking: async renderers (mermaid, shiki) register here so
   screenshot/export scripts wait until everything is painted ---- */
let pending = 0;
const w = window as unknown as { __DECK_READY__?: boolean; __DECK_ERRORS__?: string[] };
w.__DECK_ERRORS__ = [];

function settle() {
  if (pending === 0) {
    document.fonts.ready.then(() =>
      requestAnimationFrame(() => requestAnimationFrame(() => { if (pending === 0) w.__DECK_READY__ = true; })),
    );
  }
}

export function markReadyCheck() { w.__DECK_READY__ = false; setTimeout(settle, 50); }

export function reportError(msg: string) { w.__DECK_ERRORS__!.push(msg); }

/** Call inside an async renderer; returns a `done` callback. */
export function useAsyncTask(deps: unknown[]) {
  const doneRef = useRef<() => void>(() => {});
  useEffect(() => {
    pending++;
    w.__DECK_READY__ = false;
    let finished = false;
    doneRef.current = () => { if (!finished) { finished = true; pending--; settle(); } };
    return () => doneRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return () => doneRef.current();
}
