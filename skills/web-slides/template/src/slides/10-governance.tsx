import { Contrast, FileSearch, ScanLine, UserCheck } from "lucide-react";
import { Card, SlideFrame, Stagger } from "../deck/components";
import { defineSlide } from "../deck/types";

export default defineSlide({
  id: "governance",
  notes: "All four automated gates run in `npm run review`; the human gate is outline approval.",
  Component: () => (
    <SlideFrame kind="governance" kicker="Governance" title="Four automated gates and one human gate stop unsourced or unreadable slides from shipping.">
      <Stagger className="grid-4" items={[
        <Card icon={FileSearch} title="Sources">Every Stat, chart and quote must cite a source listed on its slide.</Card>,
        <Card icon={Contrast} title="Contrast" tone="accent-2">Text is measured in the browser against WCAG AA thresholds.</Card>,
        <Card icon={ScanLine} title="Leftovers" tone="accent-3">Template leftovers, emoji icons and off-stage overflow fail the run.</Card>,
        <Card icon={UserCheck} title="Approval" highlight>A human approves the outline and the final screenshots.</Card>,
      ]} />
    </SlideFrame>
  ),
});
