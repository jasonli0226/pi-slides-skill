# Slide-type catalog

Every type has a working example in `template/src/slides/` (in the skill dir). Copy the closest one, then change the content. Every slide must be wrapped in `<SlideFrame kind="..." title="<full-sentence takeaway>" sources={[...]}>`.

| Type (`kind`) | Use it for | Example file | Core components |
|---|---|---|---|
| `title` | Opening promise of the talk | `01-title.tsx` | `SlideFrame hero` + photo `backdrop` + `scrim="light"`, `kicker`, `subtitle`, `heroLabel` — **not** `center` |
| `agenda` | 3 to 5 parts, revealed per click | `02-agenda.tsx` | `Stagger stepwise` + `Card icon` in `.grid-4` / `.grid-3` |
| `big-number` | One headline metric (+ one supporting metric) | `03-big-number.tsx` | `Stat size="xl" cite`, second `Stat size="md"` |
| `comparison` | Options side by side, recommended column highlighted | `04-comparison.tsx` | `table.compare`, `.col-hi`, `<Cite>` inside cells |
| `architecture` | System or data flow | `05-architecture.tsx`, `13-layered-platform.tsx`, `14-c4-context.tsx`, `15-chat-sequence.tsx` | `Mermaid` (≤8 nodes) **or** `LayeredArchitecture` / `C4Container` / `Sequence` / `FlowSteps` — see `diagram-guide.md` |
| `timeline` | Phases, roadmap, process steps | `06-timeline.tsx` | `Timeline items` (stepwise by default) |
| `code` | Show a config or snippet and walk through it | `07-code.tsx` | `Code lang filename focus={["2-3","5-6"]}` + `steps` |
| `results` | Measured outcome, before/after, KPIs | `08-results.tsx` | `Stat` + `BarChart cite highlight` |
| `quote` | Voice of a user, expert or standard | `09-quote.tsx` | `Quote by role cite`, `background="spotlight"`, `center` |
| `governance` | Risks, controls, owners, compliance | `10-governance.tsx` | `Stagger` of `Card icon` (4 at most), `highlight` the human gate |
| `lessons` | What we learned / would do differently | `11-lessons.tsx` | `IconList stepwise` |
| `closing` | The ask or next step, plus references | `12-closing.tsx` | `background="aurora"`, references from `allSources` |
| `section` | Divider between parts (title may be short) | (use `title` pattern) | `SlideFrame kind="section" center` |
| `content` | Anything else; media showcase | `16-media-figure.tsx` | `.grid-2/3/4`, `Card`, `IconList`, `Figure` |
| `results` (trend) | Change over time, part-to-whole, distribution, correlation, flow, matrix | `17-trend-chart.tsx` | `EChart highlight cite` — see `chart-guide.md` |

A technical deck must include `architecture`, `results`, `governance` and `lessons`.

## Component reference (`src/deck/components.tsx`)

- **SlideFrame** `{ kind, title, kicker?, subtitle?, sources?: SourceRef[], background?: "grid"|"aurora"|"spotlight"|"plain", footer?: boolean, center?: boolean, hero?: boolean, backdrop?: { src, alt?, decorative?, fit? }, scrim?: "light"|"dark"|"auto", heroLabel? }`
  - Renders the kicker and title, then a footer with numbered sources and the page number.
  - **Title hero (photo pattern):** `backdrop` full-bleed photo + `scrim="light"` (soft white left ~45–55%, dark type) + `kicker` / takeaway title / org `subtitle` / `heroLabel` bottom-left. Auto `scrim` is light when backdrop is set. Prefer this over `center` or orb-only plates.
  - `<Cite id>` and figure `cite` props number themselves against `sources`.
- **Appear** `{ at?: step, variant?: "up"|"fade"|"scale"|"blur"|"left"|"right", delay? }`
  - Without `at`, it animates on enter. With `at={k}`, it appears on click step k.
- **Stagger** `{ items: ReactNode[], stepwise?, startAt?, className? }`
  - Without `stepwise`, the items cascade in. With it, one item appears per click; set `steps = items.length`.
- **Card** `{ icon?, title, tone?: "accent"|"accent-2"|"accent-3", highlight? }`
- **Icon** `{ icon: LucideIcon, size?: "sm"|"md"|"lg"|"xl", tone? }`. Use lucide icons only.
- **Pill** `{ tone?: "accent"|"accent-2"|"accent-3"|"warning"|"danger" }`
- **Stat** `{ value: number, decimals?, prefix?, suffix?, label, cite | illustrative, size?: "md"|"lg"|"xl" }`
  - Counts up live and shows its final value in static or print mode.
- **BarChart** `{ data: {label, value}[], unit?, decimals?, max?, highlight?: index, cite | illustrative }`
  - Keep it to 3 to 7 bars. Give it at least about 60% of the width or the lint will flag tiny text. For lines, stacks, distributions, scatter, flows or matrices use `EChart` (`chart-guide.md`).
- **EChart** `{ option: EChartsOption, label, highlight?: seriesName, height?, caption?, cite | illustrative }`
  - Lazy-loaded ECharts (SVG) for lines, stacked bars, histograms/boxplots, scatter, heatmaps and sankey. Theme colors and fonts come from the tokens; never put colors in `option`. Read `chart-guide.md` first. Example `17-trend-chart.tsx`.
- **Mermaid** `{ chart: string, height?, nodes?, edges?, illustrative?, cite? }`
  - Colors come from the theme tokens. Keep it to 8 nodes or fewer, use `<br/>` for 2-line labels, and use `-.->` for feedback loops. If the brief is a real repo, add a nodes/edges IR or set `illustrative: true`. A slide-level `mermaid:` string must match `chart` when both exist.
- **Code** `{ code, lang, filename?, focus?: string[], at? }`
  - Highlighted with Shiki. `focus[i]` is the line range highlighted on step `at + i`.
- **Timeline** `{ items: {when, title, body?}[], stepwise? }`. Use 3 to 6 items.
- **Quote** `{ by, role?, cite }`. Quote the source verbatim.
- **IconList** `{ items: {icon, text, tone?}[], stepwise? }`. Use 5 items or fewer.
- **Gradient** wraps one or two key words in the title or hero in accent gradient text. Use it at most once per slide.
- **Cite** `{ id }` is an inline citation marker for text claims and table cells.
- **Figure** `{ src, alt, fit?: "contain"|"cover", caption?, cite | illustrative, frame?, shadow?, maxHeight?, decorative? }`. Use `decorative` for imported SVG backgrounds or ornaments: empty alt, hidden from assistive tech, no cite.
  - User-provided media from `public/media/` (URL `/media/…`). Requires `alt` and `cite` or `illustrative`. See `media-guide.md` and example `16-media-figure.tsx`.


## Diagram components (`src/deck/diagrams.tsx`)

Re-exported from `components.tsx`. Read `diagram-guide.md` before picking one.

- **LayeredArchitecture** `{ layers: {id, label, tone?, items: {id?, label, sub?, highlight?, icon?}[]}[], leftRail?, rightRail?, caption?, stepwise?, primary_path?, cite?, illustrative?, evidence? }`
  - Swimlanes for dense stacks. Soft limit: 3–6 layers, ≤5 cells per layer. Give cells a stable `id` when you declare a path. `stepwise`: `false` | `"reveal"` (or `true`) | `"path"`.
- **FlowSteps** `{ steps: {id?, title, body?, icon?, tone?}[], stepwise?, primary_path?, cite?, illustrative? }` — 3–6 memorable steps.
- **Sequence** `{ actors: {id, label, tone?}[], messages: {from, to, label, dashed?, note?}[], stepwise?, primary_path?, cite?, illustrative? }` — ≤6 actors, ≤8 messages. `primary_path` is a message-index list or an actor-id walk that follows declared messages.
- **C4Container** `{ level: "context"|"container", nodes: {id, label, kind: "person"|"system"|"container"|"external", description?, tech?, highlight?, row, col, rowSpan?, colSpan?, evidence?, illustrative?}[], relations?: {from, to, label, dashed?, evidence?}[], cols?, rows?, legend?, showRelationList?, caption?, stepwise?, primary_path?, cite?, illustrative? }`
  - Orthogonal SVG elbows + pill edge labels. Nodes fade in (`Appear variant="fade"`) so motion does not shift the grid. `legend` overlays the stage (default on). Keep `showRelationList` false unless there is spare footer space. Set `level` (one zoom level per slide). `stepwise: "path"` walks `primary_path`; print shows the complete final state.
- **DiagramLegend** `{ items: {tone?, label}[] }` — tone/kind key chips.
- **Evidence and honesty.** On a real-repo brief, each node needs `evidence: [{ cite, path, start, end?, commit? }]` unless the diagram or that node is `illustrative`. `cite` must be a bibliography id from the slide `sources` list. Pins live in the spec / notes / footer — not as tiny `file:line` labels on the stage. Official example architecture slides are illustrative and must stay that way.

## Layout helpers (deck.css)

- `.grid-2`, `.grid-3`, `.grid-4` are equal columns. Override `gridTemplateColumns` inline for asymmetric layouts.
- `.row` is a horizontal flex row with gap. `.muted` is secondary text.

## Slide file skeleton

```tsx
import { Rocket } from "lucide-react";
import { Appear, Card, SlideFrame } from "../deck/components";
import { defineSlide } from "../deck/types";
import { S } from "./sources";

export default defineSlide({
  id: "pilot-results",          // stable, kebab-case
  steps: 0,                     // number of click steps
  notes: "What to say. Detail lives here, not on the slide.",
  transition: "fade",           // optional per-slide override
  Component: () => (
    <SlideFrame kind="results" kicker="Results" sources={[S.pilotReport]}
      title="The pilot cut median triage time from 40 to 21 minutes.">
      {/* ... */}
    </SlideFrame>
  ),
});
```

(The figures in the skeleton are illustrative. Never copy them into a real deck.)
