import { SlideFrame, Timeline } from "../deck/components";
import { defineSlide } from "../deck/types";

export default defineSlide({
  id: "workflow",
  steps: 5,
  notes: "The human gate is step 2: no building before the outline is approved.",
  Component: () => (
    <SlideFrame kind="timeline" kicker="Workflow" title="Every deck moves through five gates, and a human approves the outline before any pixels.">
      <Timeline items={[
        { when: "01", title: "Outline", body: "Research, sources, one takeaway sentence per slide." },
        { when: "02", title: "Approve", body: "Presenter signs off on story, slide types and theme." },
        { when: "03", title: "Build", body: "Agent writes TSX slides from the catalog." },
        { when: "04", title: "Review", body: "Screenshots, lint report, visual self-critique, fix." },
        { when: "05", title: "Export", body: "PDF and PNG handout; live site for presenting." },
      ]} />
    </SlideFrame>
  ),
});
