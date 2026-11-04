import { SlideFrame, Quote } from "../deck/components";
import { defineSlide } from "../deck/types";
import { S } from "./sources";

export default defineSlide({
  id: "quote",
  transition: "blur",
  notes: "This is why every motion component honours prefers-reduced-motion.",
  Component: () => (
    <SlideFrame kind="quote" background="spotlight" center kicker="Motion with restraint" sources={[S.motionA11y]}
      title="Motion should guide attention, and the scaffold turns it down for viewers who ask.">
      <Quote by="Motion documentation" role="Accessibility guide" cite="motionA11y">
        Animations can have serious usability implications, even inducing motion sickness in some people.
      </Quote>
    </SlideFrame>
  ),
});
