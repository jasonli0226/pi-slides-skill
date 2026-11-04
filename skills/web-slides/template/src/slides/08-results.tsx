import { Appear, BarChart, SlideFrame, Stat } from "../deck/components";
import { defineSlide } from "../deck/types";
import { measured } from "./measured";
import { S } from "./sources";

export default defineSlide({
  id: "results",
  notes: "Timings measured on the build box; they vary with hardware.",
  Component: () => (
    <SlideFrame kind="results" kicker="Results" sources={[S.verifyRun]}
      title="The scaffold builds, reviews and exports this 15-slide deck end to end on a headless box.">
      <div className="grid-2" style={{ gridTemplateColumns: "0.55fr 1.45fr", alignItems: "center" }}>
        <Stat value={measured.reviewErrors} size="xl" cite="verifyRun" label="Blocking lint errors in the final review run." />
        <Appear delay={0.2}>
          <BarChart unit=" s" decimals={1} cite="verifyRun" highlight={1} data={[
            { label: "Vite build", value: measured.buildSec },
            { label: "Review (15 shots)", value: measured.reviewSec },
            { label: "PDF export", value: measured.pdfSec },
          ]} />
        </Appear>
      </div>
    </SlideFrame>
  ),
});
