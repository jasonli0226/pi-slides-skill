# Chart guide

How to choose and draw a chart for a slide. Read this before you add a `BarChart` or an `EChart`. Every chart still needs `cite="id"` (or `illustrative`), and every number in it must come from a source you opened.

## Principles (with sources)

1. **Pick the chart from the relationship the title states**, not from the data shape: change over time, part-to-whole, ranking, distribution, correlation, flow or a matrix [1].
2. **One message per chart.** The title is the takeaway; the chart is the receipt. Accent the one series (or bar) the title talks about and mute the rest.
3. **Bars start at zero.** A bar's length encodes its value, so a truncated value axis exaggerates differences. If the differences are too small to see, use a line or dot plot instead of cutting the axis [2].
4. **Avoid dual axes.** Two value axes invite readers to compare lines whose crossing points the author chose by scaling. Use two charts, or index both series to the same start [3].
5. **No 3D and no pie.** 3D distorts area and angle; for part-to-whole use a stacked bar (one stack, or a few stacks to compare) [1].

## Story → chart type

| The title says… | Prefer | Component | Avoid |
|---|---|---|---|
| "A vs B vs C" (3–7 items, one value each) | Horizontal bar, highlighted bar | `<BarChart>` | EChart for something BarChart already draws |
| "X rose / fell over time" | Line (≤5 series, one accented) | `<EChart>` `type: line` | Bars for long time series; area stacks with many layers |
| "X is most of the total" (part-to-whole) | Stacked bar (100% stack for shares) | `<EChart>` `type: bar` + `stack` | Pie, donut, 3D anything |
| "Values cluster around…" (distribution) | Histogram (bar of binned counts) or boxplot | `<EChart>` `bar` / `boxplot` | One bar per raw value |
| "A rises with B" (correlation) | Scatter | `<EChart>` `type: scatter` | Two lines on dual axes |
| "Most of the flow goes to…" | Sankey (≤8 nodes) | `<EChart>` `type: sankey` | Flow drawn as a stacked bar |
| "Hot spots are in…" (matrix) | Heatmap, values labelled | `<EChart>` `type: heatmap` | A table of 30 numbers |
| One headline number | Big number | `<Stat>` | A chart with one bar |

**Keep `BarChart` for simple 3–7 bar comparisons.** It is plain SVG with no extra download and animates with the deck. Reach for `EChart` only when the story needs a line, stack, distribution, scatter, flow or matrix.

## Legibility limits (lint-checked where cheap)

| Rule | Limit | Lint |
|---|---|---|
| Series per chart | ≤5 (one accented, the rest muted context) | `chart-legibility` (warn) |
| Several series | name the accented one with `highlight` | `chart-legibility` (warn) |
| Bars per series (EChart) | ≤12 categories; aggregate or switch to a line | `chart-legibility` (warn) |
| Bar value axis | starts at zero (no `min` > 0, no `scale: true`) | `chart-baseline` (warn) |
| Value axes | one; a second needs a reason in the notes | `chart-dual-axis` (warn) |
| Chart types | no pie, donut, radar, gauge or 3D | `chart-type` (warn) |
| Text | ≥18px on the stage (axis labels default to 24px) | `tiny-text` (error) |
| Source | `cite` in the slide's `sources`, or `illustrative` | `source-missing` / `cite-unknown` (error) |

`npm run spec` runs the same checks on `EChart` entries in `content/deck.spec.yaml` as warnings.

## `<EChart>` usage

```tsx
import { EChart, SlideFrame } from "../deck/components";

<EChart cite="opsReport" highlight="EU region" height={520}
  label="Weekly incidents per region, Jan–Jun 2026; EU falls from 14 to 2."
  caption="Incidents per week"
  option={{
    xAxis: { type: "category", data: weeks },
    yAxis: { type: "value", min: 0, name: "Incidents" },
    series: [
      { name: "EU region", type: "line", data: eu },
      { name: "US region", type: "line", data: us },
    ],
  }} />
```

- `option` is a plain [ECharts option](https://echarts.apache.org/en/option.html). Give data, axes and series only. **No colors, fonts or hex values:** the component reads `--accent`, `--text`, `--text-muted`, `--border`, `--font-body` and friends from the theme tokens, so charts follow `tokens.css`, `brand.css` and style packs.
- `highlight` = the `name` of the series the title talks about. It gets the accent and a thicker line; the others are muted. Multi-line charts get direct end labels instead of a legend; stacks and multi-series bars get a legend at the top.
- Keep series names short (about 14 characters or fewer) so the end labels fit.
- `label` describes the chart for screen readers (like `Figure alt`). `caption` names units and timeframe.
- Size: give it about 60% of the stage width or more, and a `height` of 440–600. Lint fails chart text under 18px.
- Motion: it animates on enter in present mode. Static, print, PDF, screenshots and reduced motion render the final state with animation off.
- Rendering uses ECharts' SVG renderer, so the vector PDF keeps chart text selectable and the review lint can measure chart text [4].
- **Bundle:** ECharts is imported on demand (`src/deck/echarts-lib.ts`, tree-shaken from `echarts/core`) the first time a slide with an `EChart` renders [5]. Decks without charts never download it. Registered: line, bar, scatter, boxplot, heatmap, sankey, plus grid, legend, visualMap, markLine, markArea and dataset. Add a module there only if the guide supports it.
- No tooltips, zoom or brushing: slides are presented, not explored.

## Anti-patterns

- Pie or donut charts, 3D bars, radar "skill webs", gauges.
- Rainbow palettes where every series is equally loud.
- Truncated bar axes to make a small change look big [2].
- Two y-axes so two unrelated lines appear to "track" each other [3].
- Twelve lines on one chart. Split it, or accent one and show the rest as a muted band.
- Real-sounding numbers with no source. Example data must be `illustrative`, say so in the notes, and be removed before a real deck ships.

## Sources

1. Financial Times, Visual Vocabulary — https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary  
2. Datawrapper Academy, Why our column and bar charts start at zero — https://www.datawrapper.de/academy/why-our-column-and-bar-charts-start-at-zero  
3. Datawrapper Blog, Why not to use two axes, and what to use instead — https://www.datawrapper.de/blog/dualaxis  
4. Apache ECharts Handbook, Canvas vs. SVG — https://echarts.apache.org/handbook/en/best-practices/canvas-vs-svg/  
5. Apache ECharts Handbook, Import ECharts (shrinking bundle size) — https://echarts.apache.org/handbook/en/basics/import/  
