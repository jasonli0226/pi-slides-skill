import { Appear, SlideFrame, Stat } from "../deck/components";
import { defineSlide } from "../deck/types";
import { S } from "./sources";

export default defineSlide({
  id: "contrast-floor",
  notes: "WCAG 2.2 AA: 4.5:1 for normal text, 3:1 for large text (18pt, or 14pt bold).",
  Component: () => (
    <SlideFrame kind="big-number" kicker="Readability floor" sources={[S.wcag]}
      title="Body text needs at least 4.5:1 contrast, so every theme is checked before it ships.">
      <div className="grid-2" style={{ alignItems: "end" }}>
        <Stat value={4.5} decimals={1} suffix=":1" size="xl" cite="wcag" label="Minimum contrast ratio for normal-size text (WCAG 2.2 AA, SC 1.4.3)." />
        <Appear delay={0.4}>
          <Stat value={3} suffix=":1" size="md" cite="wcag" label="Minimum for large text: at least 18pt, or 14pt bold (about 24px / 18.5px)." />
        </Appear>
      </div>
    </SlideFrame>
  ),
});
