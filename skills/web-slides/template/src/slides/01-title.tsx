import { Layers, ShieldCheck, Sparkles } from "lucide-react";
import { Appear, Icon, Pill, SlideFrame } from "../deck/components";
import { defineSlide } from "../deck/types";

export default defineSlide({
  id: "title",
  transition: "blur",
  notes: "Open on the promise. Full-bleed plate + left scrim keeps the headline readable; pills land the three pillars.",
  Component: () => (
    <SlideFrame
      kind="title"
      hero
      footer={false}
      background="plain"
      backdrop={{ src: "/media/title-hero-plate.svg", decorative: true }}
      title="Ship technical talks that look designed, not generated."
      subtitle="React + Motion on a 1920×1080 stage, with evidence, contrast and motion linted in."
    >
      <Appear delay={0.25} variant="up">
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <Pill tone="accent"><Icon icon={Sparkles} size="sm" /> Evidence-backed</Pill>
          <Pill tone="accent-2"><Icon icon={ShieldCheck} size="sm" /> Contrast-safe</Pill>
          <Pill tone="accent-3"><Icon icon={Layers} size="sm" /> One idea / slide</Pill>
        </div>
      </Appear>
    </SlideFrame>
  ),
});
