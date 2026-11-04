import { Sparkles } from "lucide-react";
import { Appear, Icon, Pill, SlideFrame } from "../deck/components";
import { defineSlide } from "../deck/types";

export default defineSlide({
  id: "title",
  transition: "blur",
  notes: "Open with the promise: decks that look designed, built by an agent, with every number traceable.",
  Component: () => (
    <SlideFrame kind="title" background="aurora" center kicker="pi skill · web-slides"
      title="Agent-authored web decks can look keynote-grade and stay fully sourced."
      subtitle="A React + Motion slide scaffold, a design system, and an automated review loop for the pi coding agent.">
      <Appear delay={0.35} variant="fade">
        <div className="row">
          <Icon icon={Sparkles} size="lg" tone="accent-2" />
          <Pill>React 19</Pill><Pill tone="accent-2">Motion</Pill><Pill tone="accent-3">Playwright review</Pill>
        </div>
      </Appear>
    </SlideFrame>
  ),
});
