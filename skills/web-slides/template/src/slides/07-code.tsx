import { Appear, Code, SlideFrame } from "../deck/components";
import { defineSlide } from "../deck/types";

const sample = `
export default defineSlide({
  id: "contrast-floor",
  notes: "WCAG 2.2 AA thresholds.",
  Component: () => (
    <SlideFrame kind="big-number" sources={[S.wcag]}
      title="Body text needs at least 4.5:1 contrast.">
      <Stat value={4.5} decimals={1} suffix=":1"
        cite="wcag" label="Minimum for normal text" />
    </SlideFrame>
  ),
});`;

export default defineSlide({
  id: "code",
  steps: 3,
  notes: "Step 1: slide metadata. Step 2: the frame carries sources. Step 3: figures must cite.",
  Component: () => (
    <SlideFrame kind="code" kicker="Authoring model" title="Slides are typed React components, so agents reuse layouts instead of hand-placing boxes.">
      <Appear delay={0.15}>
        <Code lang="tsx" filename="src/slides/03-big-number.tsx" code={sample} focus={["2-3", "5-6", "7-8"]} />
      </Appear>
    </SlideFrame>
  ),
});
