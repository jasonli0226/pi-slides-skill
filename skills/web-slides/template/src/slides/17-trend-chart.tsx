import { Appear, EChart, IconList, SlideFrame } from "../deck/components";
import { defineSlide } from "../deck/types";
import { Highlighter, LineChart, Ruler } from "lucide-react";

const weeks = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"];

export default defineSlide({
  id: "trend-chart",
  notes:
    "Illustrative only: invented numbers that show how <EChart> draws a trend. One series carries the title, so it gets the accent; the others stay muted context. Replace with a sourced dataset and cite it, or delete this slide.",
  Component: () => (
    <SlideFrame kind="results" kicker="Charts • EChart"
      title="Trend charts accent the one series the title is about and mute the rest.">
      <div className="grid-2" style={{ gridTemplateColumns: "1.6fr 0.9fr", alignItems: "center", gap: 64 }}>
        <Appear variant="fade">
          <EChart illustrative highlight="Team A" height={520}
            label="Illustrative line chart: lint errors per deck over eight weeks for three teams. Team A falls from 14 to 2; teams B and C stay between 9 and 15."
            caption="Lint errors per deck, weekly review runs"
            option={{
              xAxis: { type: "category", data: weeks, boundaryGap: false },
              yAxis: { type: "value", min: 0 },
              series: [
                { name: "Team A", type: "line", data: [14, 12, 9, 7, 5, 4, 3, 2] },
                { name: "Team B", type: "line", data: [12, 13, 11, 12, 10, 11, 10, 9] },
                { name: "Team C", type: "line", data: [15, 14, 15, 13, 14, 12, 12, 11] },
              ],
            }} />
        </Appear>
        <Appear delay={0.15}>
          <IconList items={[
            { icon: LineChart, text: "Line for change over time; stacked bar for part-to-whole" },
            { icon: Highlighter, text: "Accent the series the title names" },
            { icon: Ruler, text: "Label units; start bars at zero" },
          ]} />
        </Appear>
      </div>
    </SlideFrame>
  ),
});
