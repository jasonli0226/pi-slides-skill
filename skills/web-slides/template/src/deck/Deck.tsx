import { AnimatePresence, MotionConfig, motion, type TargetAndTransition } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { SlideContext, markReadyCheck, type Mode } from "./context";
import type { DeckConfig, TransitionName } from "./types";

export const STAGE_W = 1920;
export const STAGE_H = 1080;

const params = new URLSearchParams(location.search);
const MODE: Mode = params.has("print") ? "print" : params.has("static") ? "static" : "present";

const transitions: Record<TransitionName, { initial: TargetAndTransition; animate: TargetAndTransition; exit: TargetAndTransition }> = {
  fade: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
  slide: { initial: { opacity: 0, x: 120 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -120 } },
  zoom: { initial: { opacity: 0, scale: 0.94 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.04 } },
  blur: {
    initial: { opacity: 0, filter: "blur(18px)" },
    animate: { opacity: 1, filter: "blur(0px)" },
    exit: { opacity: 0, filter: "blur(18px)" },
  },
  none: { initial: {}, animate: {}, exit: {} },
};

function parseHash(total: number) {
  const m = location.hash.match(/^#\/(\d+)(?:\/(\d+))?/);
  const index = m ? Math.min(Math.max(parseInt(m[1], 10) - 1, 0), total - 1) : 0;
  return { index, step: m && m[2] ? parseInt(m[2], 10) : 0 };
}

function useStageScale(enabled: boolean) {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    if (!enabled) return;
    const fit = () => setScale(Math.min(innerWidth / STAGE_W, innerHeight / STAGE_H));
    fit();
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, [enabled]);
  return scale;
}

export function Deck({ config }: { config: DeckConfig }) {
  const { slides } = config;
  const total = slides.length;

  useEffect(() => {
    document.title = config.title;
    document.documentElement.dataset.theme = config.theme;
    document.documentElement.dataset.mode = MODE;
    (window as unknown as { __DECK__: unknown }).__DECK__ = {
      title: config.title,
      theme: config.theme,
      slides: slides.map((s) => ({ id: s.id, steps: s.steps ?? 0, notes: s.notes ?? "" })),
    };
    markReadyCheck();
  }, [config, slides]);

  if (MODE === "print") return <PrintDeck config={config} />;
  if (MODE === "static") return <StaticSlide config={config} />;
  return <PresentDeck config={config} />;
}

/* ---------- print: every slide stacked, final state, no motion ---------- */
function PrintDeck({ config }: { config: DeckConfig }) {
  return (
    <MotionConfig transition={{ duration: 0 }} reducedMotion="always">
      {config.slides.map((s, i) => (
        <div className="print-page" key={s.id}>
          <SlideContext.Provider value={{ step: Infinity, mode: "print", index: i, total: config.slides.length }}>
            <div className="stage" data-slide-id={s.id}>
              <s.Component />
            </div>
          </SlideContext.Provider>
        </div>
      ))}
    </MotionConfig>
  );
}

/* ---------- static: one slide at a given step, for screenshots ---------- */
function StaticSlide({ config }: { config: DeckConfig }) {
  const index = Math.max(0, Math.min(parseInt(params.get("slide") ?? "1", 10) - 1, config.slides.length - 1));
  const s = config.slides[index];
  const stepParam = params.get("step");
  const step = stepParam === null || stepParam === "final" ? Infinity : parseInt(stepParam, 10);
  return (
    <MotionConfig transition={{ duration: 0 }} reducedMotion="always">
      <SlideContext.Provider value={{ step, mode: "static", index, total: config.slides.length }}>
        <div className="stage" data-slide-id={s.id}>
          <s.Component />
        </div>
      </SlideContext.Provider>
    </MotionConfig>
  );
}

/* ---------- present: keyboard/click navigation, transitions, notes, overview ---------- */
function PresentDeck({ config }: { config: DeckConfig }) {
  const { slides } = config;
  const total = slides.length;
  const [{ index, step }, setPos] = useState(() => parseHash(total));
  const [showNotes, setShowNotes] = useState(false);
  const [overview, setOverview] = useState(false);
  const scale = useStageScale(true);
  const slide = slides[index];
  const maxStep = slide.steps ?? 0;

  useEffect(() => {
    history.replaceState(null, "", `#/${index + 1}${step ? `/${step}` : ""}`);
  }, [index, step]);

  const next = useCallback(() => {
    setPos((p) => {
      const max = slides[p.index].steps ?? 0;
      if (p.step < max) return { index: p.index, step: p.step + 1 };
      if (p.index < total - 1) return { index: p.index + 1, step: 0 };
      return p;
    });
  }, [slides, total]);

  const prev = useCallback(() => {
    setPos((p) => {
      if (p.step > 0) return { index: p.index, step: p.step - 1 };
      if (p.index > 0) return { index: p.index - 1, step: slides[p.index - 1].steps ?? 0 };
      return p;
    });
  }, [slides]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); next(); }
      else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) { e.preventDefault(); prev(); }
      else if (e.key === "Home") setPos({ index: 0, step: 0 });
      else if (e.key === "End") setPos({ index: total - 1, step: 0 });
      else if (e.key.toLowerCase() === "n") setShowNotes((v) => !v);
      else if (e.key.toLowerCase() === "o" || e.key === "Escape") setOverview((v) => !v);
      else if (e.key.toLowerCase() === "f") document.documentElement.requestFullscreen?.();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [next, prev, total]);

  const t = transitions[slide.transition ?? config.transition ?? "fade"];
  const ctx = useMemo(() => ({ step, mode: "present" as const, index, total }), [step, index, total]);

  if (overview) {
    return (
      <div className="overview">
        {slides.map((s, i) => (
          <button key={s.id} className={`overview-item ${i === index ? "is-current" : ""}`}
            onClick={() => { setPos({ index: i, step: 0 }); setOverview(false); }}>
            <div className="overview-thumb">
              <MotionConfig transition={{ duration: 0 }}>
                <SlideContext.Provider value={{ step: Infinity, mode: "static", index: i, total }}>
                  <div className="stage"><s.Component /></div>
                </SlideContext.Provider>
              </MotionConfig>
            </div>
            <span>{i + 1}. {s.id}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="viewport" onClick={(e) => (e.clientX > innerWidth / 3 ? next() : prev())}>
        <div className="stage-scaler" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={slide.id} className="stage" data-slide-id={slide.id}
              initial={t.initial} animate={t.animate} exit={t.exit}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
              <SlideContext.Provider value={ctx}>
                <slide.Component />
              </SlideContext.Provider>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="progress" style={{ width: `${((index + (maxStep ? step / (maxStep + 1) : 0) + 1) / total) * 100}%` }} />
        {showNotes && (
          <aside className="notes" onClick={(e) => e.stopPropagation()}>
            <strong>{index + 1}/{total} · {slide.id}{maxStep ? ` · step ${step}/${maxStep}` : ""}</strong>
            <p>{slide.notes || "No notes."}</p>
            <small>←/→ navigate · O overview · N notes · F fullscreen</small>
          </aside>
        )}
      </div>
    </MotionConfig>
  );
}
