import { SlideFrame } from "../deck/components";
import { defineSlide } from "../deck/types";

export default defineSlide({
  id: "title",
  transition: "blur",
  notes:
    "Open on the promise. Full-bleed photo plate + soft left light scrim (airport-style). Swap the placeholder JPEG for a rights-cleared user photo in public/media via backdrop.src.",
  Component: () => (
    <SlideFrame
      kind="title"
      hero
      footer={false}
      background="plain"
      scrim="light"
      backdrop={{
        src: "/media/title-hero-photo-placeholder.jpg",
        decorative: true,
      }}
      kicker="Web slides · Title hero pattern"
      title="Ship technical talks that look designed, not generated."
      subtitle={"React + Motion scaffold\nEvidence, contrast and motion linted in"}
      heroLabel="Template for discussion"
    />
  ),
});
