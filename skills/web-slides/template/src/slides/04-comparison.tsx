import { Appear, Cite, SlideFrame } from "../deck/components";
import { defineSlide } from "../deck/types";
import { S } from "./sources";

const cols = ["Slidev", "reveal.js", "Spectacle", "React + Motion (this skill)"];
const rows: [string, ...React.ReactNode[]][] = [
  ["Authoring", "Markdown + Vue components", "HTML or Markdown sections", "React JSX or Markdown", "Typed React components"],
  ["Motion", <>v-click, v-motion, slide transitions<Cite id="slidevAnim" /></>, <>Auto-Animate, fragments<Cite id="reveal" /></>, <>Slide transitions, react-spring Appear<Cite id="spectacleApi" /></>, "Full Motion API, layout animations"],
  ["Export", <>PDF, PNG, PPTX via Playwright<Cite id="slidevExport" /></>, <>Print to PDF, Chrome only<Cite id="reveal" /></>, <>Print-to-PDF mode, best in Chrome<Cite id="spectacleApi" /></>, "Scripted PDF + PNG via Playwright"],
  ["React fit", "Vue, not React", "Framework-agnostic", <>React-based<Cite id="spectacle" /></>, "Native React, any npm library"],
];

export default defineSlide({
  id: "stack-comparison",
  notes: "Slidev is the strongest Markdown-first option; we pick React + Motion because the brief asked for React and maximum visual freedom.",
  Component: () => (
    <SlideFrame kind="comparison" kicker="Stack choice" sources={[S.slidevAnim, S.slidevExport, S.reveal, S.spectacle, S.spectacleApi]}
      title="A React + Motion scaffold gives agents the most design freedom with the least lock-in.">
      <Appear delay={0.2}>
        <table className="compare">
          <thead><tr><th />{cols.map((c, i) => <th key={c} className={i === 3 ? "col-hi" : ""}>{c}</th>)}</tr></thead>
          <tbody>
            {rows.map(([k, ...cells]) => (
              <tr key={k}><td>{k}</td>{cells.map((c, i) => <td key={i} className={i === 3 ? "col-hi" : ""}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </Appear>
    </SlideFrame>
  ),
});
