import { Boxes, GitBranch, ShieldCheck, Workflow } from "lucide-react";
import { Card, SlideFrame, Stagger } from "../deck/components";
import { defineSlide } from "../deck/types";

export default defineSlide({
  id: "agenda",
  steps: 4,
  notes: "Four parts. Click to reveal each.",
  Component: () => (
    <SlideFrame kind="agenda" kicker="Agenda" title="We cover the stack choice, the build loop, and the guardrails that keep decks honest.">
      <Stagger className="grid-4" stepwise items={[
        <Card icon={Boxes} title="Stack">Why React + Motion over Slidev, reveal.js and Spectacle.</Card>,
        <Card icon={Workflow} title="Architecture" tone="accent-2">How the agent, the deck and the browser fit together.</Card>,
        <Card icon={GitBranch} title="Workflow" tone="accent-3">Outline, approval, build, review, export.</Card>,
        <Card icon={ShieldCheck} title="Governance">Automated gates for sources, contrast and leftovers.</Card>,
      ]} />
    </SlideFrame>
  ),
});
