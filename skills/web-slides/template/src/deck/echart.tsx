/**
 * <EChart>: ECharts for chart types BarChart can't draw (trend lines, stacked part-to-whole,
 * distributions, scatter, heatmaps, sankey flows). ECharts itself is loaded lazily from
 * ./echarts-lib, so decks without an EChart never download it. Read references/chart-guide.md first.
 *
 * Theme: colors and fonts come from the CSS tokens (tokens.css / brand.css), so charts follow
 * the deck theme and style packs. Never put hex colors in `option`.
 * Motion: animates on enter in present mode; static, print, export and reduced-motion render
 * the final state with animation off.
 */
import type { EChartsOption } from "echarts";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { FigureMark } from "./components";
import { reportError, useAsyncTask, useIsStatic } from "./context";

/** Shape facts the review lint checks (written as data-* attributes). */
export interface ChartFacts {
  types: string[];
  series: number;
  /** most data points in one series (or dataset rows) */
  points: number;
  dualAxis: boolean;
  /** a bar series is drawn on a value axis that does not start at zero */
  barBaselineNonZero: boolean;
  /** "none" when more than one series and no highlight, "unknown" when it names no series */
  highlight: "ok" | "none" | "unknown" | "n/a";
}

type AnyObj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const arr = <T,>(v: T | T[] | undefined | null): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);

export function chartFacts(option: EChartsOption, highlight?: string): ChartFacts {
  const o = option as AnyObj;
  const series = arr<AnyObj>(o.series);
  const types = [...new Set(series.map((s) => String(s.type ?? "unknown")))];
  const datasetRows = arr<AnyObj>(o.dataset).reduce((n, d) => Math.max(n, Array.isArray(d.source) ? d.source.length - 1 : 0), 0);
  const points = Math.max(datasetRows, ...series.map((s) => (Array.isArray(s.data) ? s.data.length : 0)), 0);
  const xs = arr<AnyObj>(o.xAxis), ys = arr<AnyObj>(o.yAxis);
  // ECharts defaults: xAxis is a category axis, yAxis a value axis.
  const valueAxes = [...xs.filter((a) => a.type === "value"), ...ys.filter((a) => (a.type ?? "value") === "value")];
  const offZero = (a: AnyObj) => a.scale === true || (a.min !== undefined && a.min !== 0);
  const names = series.map((s) => s.name).filter(Boolean);
  const multi = series.length > 1;
  return {
    types,
    series: series.length,
    points,
    dualAxis: xs.length > 1 || ys.length > 1,
    barBaselineNonZero: types.includes("bar") && valueAxes.some(offZero),
    highlight: highlight ? (names.includes(highlight) ? "ok" : "unknown") : multi ? "none" : "n/a",
  };
}

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** ECharts theme built from the deck tokens. Font sizes respect the 18px floor on the 1920 stage. */
function tokenTheme() {
  const text = cssVar("--text"), muted = cssVar("--text-muted"), border = cssVar("--border");
  const font = cssVar("--font-body");
  const axis = {
    axisLine: { show: true, lineStyle: { color: border, width: 2 } },
    axisTick: { show: false },
    axisLabel: { color: muted, fontSize: 24, fontFamily: font, margin: 16 },
    splitLine: { show: true, lineStyle: { color: border, width: 1 } },
    nameTextStyle: { color: muted, fontSize: 22, fontFamily: font },
  };
  return {
    color: [cssVar("--accent"), cssVar("--accent-2"), cssVar("--accent-3"), cssVar("--warning"), muted],
    backgroundColor: "transparent",
    textStyle: { color: text, fontFamily: font, fontSize: 24 },
    legend: { textStyle: { color: muted, fontSize: 22, fontFamily: font }, itemGap: 32, itemWidth: 28, itemHeight: 14 },
    categoryAxis: { ...axis, splitLine: { show: false } },
    valueAxis: { ...axis, axisLine: { show: false } },
    timeAxis: axis,
    logAxis: axis,
    line: { lineStyle: { width: 4 }, symbolSize: 10, symbol: "circle", label: { fontSize: 22, color: text } },
    bar: { label: { fontSize: 22, color: text }, barMaxWidth: 96 },
    scatter: { symbolSize: 16, label: { fontSize: 22, color: text } },
    heatmap: { label: { fontSize: 22, color: text }, itemStyle: { borderColor: cssVar("--bg"), borderWidth: 2 } },
    sankey: { label: { fontSize: 24, color: text }, lineStyle: { color: "gradient", opacity: 0.35 },
      itemStyle: { borderWidth: 0 }, nodeWidth: 24, nodeGap: 24 },
    visualMap: { textStyle: { color: muted, fontSize: 22 }, inRange: { color: [cssVar("--surface-2"), cssVar("--accent")] } },
  };
}

/** Accent the series the title talks about; mute the rest (opacity steps keep them apart). */
function applyHighlight(option: AnyObj, highlight?: string): AnyObj {
  const series = arr<AnyObj>(option.series);
  if (!highlight || series.length < 2) return option;
  const accent = cssVar("--accent"), muted = cssVar("--text-muted");
  let k = 0;
  return {
    ...option,
    series: series.map((s) => {
      if (s.name === highlight) {
        return { ...s, z: 3, itemStyle: { color: accent, ...s.itemStyle }, lineStyle: { color: accent, width: 6, ...s.lineStyle },
          endLabel: s.endLabel && { ...s.endLabel, color: accent, fontWeight: 600 } };
      }
      const opacity = [0.85, 0.6, 0.42, 0.3][Math.min(k++, 3)];
      return { ...s, z: 2, itemStyle: { color: muted, opacity, ...s.itemStyle }, lineStyle: { color: muted, opacity, width: 3, ...s.lineStyle },
        endLabel: s.endLabel && { color: muted, ...s.endLabel } };
    }),
  };
}

/** Defaults the chart guide asks for: direct end labels on multi-line charts, a legend for stacks. */
function withDefaults(option: AnyObj, animate: boolean): AnyObj {
  const series = arr<AnyObj>(option.series);
  const lines = series.filter((s) => s.type === "line");
  const directLabels = lines.length > 1 && option.legend === undefined;
  const legend = option.legend ?? (series.length > 1 && !directLabels && ["bar", "scatter"].some((t) => series.some((s) => s.type === t))
    ? { top: 0, left: 0 } : undefined);
  const muted = cssVar("--text-muted");
  const out: AnyObj = {
    animation: animate,
    animationDuration: animate ? 1100 * motionScale() : 0,
    animationEasing: "cubicOut",
    ...option,
    series: directLabels
      ? series.map((s) => (s.type === "line" && s.endLabel === undefined
        ? { ...s, endLabel: { show: true, formatter: "{a}", fontSize: 24, color: muted, distance: 12 } } : s))
      : series,
  };
  if (legend) out.legend = legend;
  if (option.grid === undefined) out.grid = { left: 8, right: directLabels ? 200 : 24, top: legend ? 112 : 48, bottom: 8 };
  if (!animate) out.animation = false;
  return out;
}

let _scale: number | undefined;
function motionScale() {
  if (_scale !== undefined) return _scale;
  const v = parseFloat(cssVar("--motion-scale"));
  return (_scale = Number.isFinite(v) ? Math.min(1.4, Math.max(0.4, v)) : 1);
}

/**
 * Themed, lazy-loaded ECharts figure. `option` is a plain ECharts option (JSON-like; no hex colors).
 * `highlight` = name of the series the slide title talks about (accented; others muted).
 * `label` = what the chart shows, for screen readers (like Figure alt). Needs `cite` or `illustrative`.
 */
export function EChart({ option, highlight, label, height = 560, caption, cite, illustrative }: {
  option: EChartsOption; highlight?: string; label: string; height?: number;
  caption?: ReactNode; cite?: string; illustrative?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isStatic = useIsStatic();
  const reduced = useReducedMotion();
  const animate = !isStatic && !reduced;
  const key = `${JSON.stringify(option)}|${highlight ?? ""}|${animate}`;
  const done = useAsyncTask([key]);
  const facts = chartFacts(option, highlight);

  useEffect(() => {
    let alive = true;
    let chart: import("./echarts-lib").EChartsType | undefined;
    let ro: ResizeObserver | undefined;
    (async () => {
      try {
        await document.fonts.ready;
        const { init } = await import("./echarts-lib");
        if (!alive || !ref.current) return;
        chart = init(ref.current, tokenTheme(), { renderer: "svg" });
        const finished = () => { chart?.off("finished", finished); done(); };
        chart.on("finished", finished);
        chart.setOption(applyHighlight(withDefaults(option as AnyObj, animate), highlight), { notMerge: true });
        ro = new ResizeObserver(() => chart?.resize());
        ro.observe(ref.current);
        setTimeout(done, 4000); // never block screenshots on a missed "finished" event
      } catch (e) {
        reportError(`echart: ${String(e)}`);
        done();
      }
    })();
    return () => { alive = false; ro?.disconnect(); chart?.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <figure className="echart" data-figure="echart"
      data-chart-types={facts.types.join(",")} data-chart-series={facts.series} data-chart-points={facts.points}
      data-chart-dual-axis={facts.dualAxis ? "true" : undefined}
      data-chart-bar-baseline={facts.barBaselineNonZero ? "nonzero" : undefined}
      data-chart-highlight={facts.highlight}>
      <div className="echart-canvas" ref={ref} role="img" aria-label={label} style={{ height }} />
      <figcaption className="chart-cite">
        {caption && <span className="echart-caption">{caption}</span>}
        <FigureMark cite={cite} illustrative={illustrative} />
      </figcaption>
    </figure>
  );
}
