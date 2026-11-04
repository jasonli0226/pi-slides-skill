import { Eye, Layers, Palette, Timer } from "lucide-react";
import { IconList, SlideFrame } from "../deck/components";
import { defineSlide } from "../deck/types";

export default defineSlide({
  id: "lessons",
  steps: 4,
  notes: "Practical guidance for anyone extending the skill.",
  Component: () => (
    <SlideFrame kind="lessons" kicker="Lessons" title="Design the review loop first, then add the sparkle.">
      <IconList stepwise items={[
        { icon: Eye, text: "Agents fix what they can see: screenshot every slide, every time." },
        { icon: Layers, tone: "accent-2", text: "A small component catalog beats free-form layout for consistency." },
        { icon: Palette, tone: "accent-3", text: "Keep every color in tokens so a brand swap is one file." },
        { icon: Timer, text: "One idea per slide, one motion per idea; static exports must still read well." },
      ]} />
    </SlideFrame>
  ),
});
