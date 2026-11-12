/**
 * Tree-shaken ECharts build, loaded on demand by <EChart> (dynamic import), so decks
 * without charts never download it. Register only what the chart guide recommends:
 * line (trend), bar (comparison, stacked part-to-whole, histogram), scatter (correlation),
 * boxplot (distribution), heatmap (matrix), sankey (flow). SVG renderer: crisp vector PDF,
 * selectable text, and chart text the review lint can measure.
 * Pie, 3D (echarts-gl) and maps are deliberately not registered — see references/chart-guide.md.
 */
import { use } from "echarts/core";
import { BarChart, BoxplotChart, HeatmapChart, LineChart, SankeyChart, ScatterChart } from "echarts/charts";
import {
  AriaComponent, DatasetComponent, GridComponent, LegendComponent, MarkAreaComponent,
  MarkLineComponent, TransformComponent, VisualMapComponent,
} from "echarts/components";
import { LabelLayout } from "echarts/features";
import { SVGRenderer } from "echarts/renderers";

use([
  LineChart, BarChart, ScatterChart, BoxplotChart, HeatmapChart, SankeyChart,
  GridComponent, LegendComponent, VisualMapComponent, MarkLineComponent, MarkAreaComponent,
  DatasetComponent, TransformComponent, AriaComponent, LabelLayout, SVGRenderer,
]);

export { init, type EChartsType } from "echarts/core";
