import { Appear, Mermaid, SlideFrame } from "../deck/components";
import { defineSlide } from "../deck/types";
import { S } from "./sources";

const chart = `flowchart LR
  U([Presenter]) -->|approves outline| A[pi agent<br/>+ SKILL.md]
  A -->|writes TSX| D[React deck<br/>Vite + Motion]
  D --> R[Playwright<br/>review]
  R -.->|fix loop| A
  R --> X[PDF + PNG]
`;

export default defineSlide({
  id: "architecture",
  notes: "pi only loads the skill body when the task matches; the review loop is what makes output reliable.",
  Component: () => (
    <SlideFrame kind="architecture" kicker="Architecture" sources={[S.piSkills, S.playwright]}
      title="The skill is a thin loop around a React deck, a headless browser and a review gate.">
      <Appear variant="scale" delay={0.2}><Mermaid chart={chart} height={560} /></Appear>
    </SlideFrame>
  ),
});
