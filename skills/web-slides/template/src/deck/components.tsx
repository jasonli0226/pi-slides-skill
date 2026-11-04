import { animate, motion, useInView, type Variants } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { createContext, useContext, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { reportError, useAsyncTask, useIsStatic, useSlide } from "./context";
import type { SlideKind, SourceRef } from "./types";

/* ============================ motion primitives ============================ */

export type AppearVariant = "up" | "fade" | "scale" | "blur" | "left" | "right";
const variants: Record<AppearVariant, Variants> = {
  up: { hidden: { opacity: 0, y: 32 }, shown: { opacity: 1, y: 0 } },
  fade: { hidden: { opacity: 0 }, shown: { opacity: 1 } },
  scale: { hidden: { opacity: 0, scale: 0.92 }, shown: { opacity: 1, scale: 1 } },
  blur: { hidden: { opacity: 0, filter: "blur(12px)" }, shown: { opacity: 1, filter: "blur(0px)" } },
  left: { hidden: { opacity: 0, x: -48 }, shown: { opacity: 1, x: 0 } },
  right: { hidden: { opacity: 0, x: 48 }, shown: { opacity: 1, x: 0 } },
};

/** Reveal children. `at` = click step that shows it (0 = on slide enter). */
export function Appear({ at = 0, variant = "up", delay = 0, className, style, children }: {
  at?: number; variant?: AppearVariant; delay?: number; className?: string; style?: CSSProperties; children: ReactNode;
}) {
  const { step } = useSlide();
  const isStatic = useIsStatic();
  const shown = step >= at;
  return (
    <motion.div className={className} style={style} variants={variants[variant]}
      initial={isStatic ? (shown ? "shown" : "hidden") : "hidden"} animate={shown ? "shown" : "hidden"}
      transition={{ duration: isStatic ? 0 : 0.6, delay: isStatic ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

/** Reveal a list of items: on enter with a stagger, or one per click when `stepwise`. */
export function Stagger({ items, stepwise = false, startAt = 1, gap = 0.08, variant = "up", className, style }: {
  items: ReactNode[]; stepwise?: boolean; startAt?: number; gap?: number; variant?: AppearVariant;
  className?: string; style?: CSSProperties;
}) {
  return (
    <div className={className} style={style}>
      {items.map((item, i) => (
        <Appear key={i} at={stepwise ? startAt + i : 0} delay={stepwise ? 0 : 0.15 + i * gap} variant={variant}>
          {item}
        </Appear>
      ))}
    </div>
  );
}

/* ================================ citations ================================ */

const SourcesContext = createContext<SourceRef[]>([]);

/** Inline citation marker. `id` must be one of the slide's `sources`. */
export function Cite({ id }: { id: string }) {
  const sources = useContext(SourcesContext);
  const n = sources.findIndex((s) => s.id === id);
  return (
    <sup className="cite" data-cite={id} data-cite-missing={n < 0 ? "true" : undefined}>
      [{n < 0 ? "?" : n + 1}]
    </sup>
  );
}

/** Wrap any figure (number, chart, claim) that needs a source. Lint fails if `cite` is missing. */
function FigureMark({ cite, illustrative }: { cite?: string; illustrative?: boolean }) {
  if (illustrative) return <span className="illustrative">Illustrative</span>;
  if (!cite) return <span data-uncited="true" />;
  return <Cite id={cite} />;
}

/* ================================ backgrounds ============================= */

export type BackgroundName = "aurora" | "grid" | "spotlight" | "plain";

export function Background({ name = "grid" }: { name?: BackgroundName }) {
  const isStatic = useIsStatic();
  if (name === "plain") return null;
  return (
    <div className={`bg bg-${name}`} aria-hidden>
      {name === "aurora" && (
        <>
          <motion.div className="blob blob-1" animate={isStatic ? undefined : { x: [0, 80, -40, 0], y: [0, -60, 40, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div className="blob blob-2" animate={isStatic ? undefined : { x: [0, -90, 50, 0], y: [0, 50, -30, 0] }}
            transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div className="blob blob-3" animate={isStatic ? undefined : { x: [0, 40, -60, 0], y: [0, 30, 60, 0] }}
            transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }} />
        </>
      )}
      <div className="bg-grain" />
    </div>
  );
}

/* ================================ slide frame ============================= */

export function SlideFrame({ kind = "content", kicker, title, subtitle, sources = [], background = "grid",
  footer = true, center = false, children }: {
  kind?: SlideKind; kicker?: string; title: string; subtitle?: ReactNode; sources?: SourceRef[];
  background?: BackgroundName; footer?: boolean; center?: boolean; children?: ReactNode;
}) {
  const { index, total } = useSlide();
  return (
    <SourcesContext.Provider value={sources}>
      <section className={`frame frame-${kind} ${center ? "frame-center" : ""}`} data-kind={kind} data-title={title}>
        <Background name={background} />
        <header className="frame-header">
          {kicker && <Appear variant="fade"><div className="kicker">{kicker}</div></Appear>}
          <Appear variant="up" delay={0.05}>
            {kind === "title" ? <h1 className="hero-title">{title}</h1> : <h2 className="slide-title">{title}</h2>}
          </Appear>
          {subtitle && <Appear variant="up" delay={0.15}><p className="subtitle">{subtitle}</p></Appear>}
        </header>
        <div className="frame-body">{children}</div>
        {footer && (
          <footer className="frame-footer">
            <div className="sources">
              {sources.length > 0 && (
                <>
                  <span className="sources-label">Sources</span>
                  {sources.map((s, i) => (
                    <span key={s.id} className="source">[{i + 1}] {s.label}</span>
                  ))}
                </>
              )}
            </div>
            <div className="page-no">{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</div>
          </footer>
        )}
      </section>
    </SourcesContext.Provider>
  );
}

/* ================================ building blocks ========================= */

/** The only way to place an icon: one icon set (lucide), one stroke, sizes from a fixed scale. */
export function Icon({ icon: I, size = "md", tone = "accent" }: {
  icon: LucideIcon; size?: "sm" | "md" | "lg" | "xl"; tone?: "accent" | "accent-2" | "accent-3" | "muted" | "text";
}) {
  const px = { sm: 28, md: 40, lg: 56, xl: 88 }[size];
  return (
    <span className={`icon icon-${size} tone-${tone}`}>
      <I size={px} strokeWidth={1.75} absoluteStrokeWidth />
    </span>
  );
}

export function Card({ icon, title, children, tone = "accent", highlight = false, className = "" }: {
  icon?: LucideIcon; title: ReactNode; children?: ReactNode; tone?: "accent" | "accent-2" | "accent-3";
  highlight?: boolean; className?: string;
}) {
  return (
    <div className={`card ${highlight ? "card-highlight" : ""} ${className}`}>
      {icon && <Icon icon={icon} tone={tone} />}
      <div className="card-title">{title}</div>
      {children && <div className="card-body">{children}</div>}
    </div>
  );
}

export function Pill({ children, tone = "accent" }: { children: ReactNode; tone?: "accent" | "accent-2" | "accent-3" | "warning" | "danger" }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

/** Big animated number. Must carry `cite` (or `illustrative`). */
export function Stat({ value, decimals = 0, prefix = "", suffix = "", label, cite, illustrative, size = "lg" }: {
  value: number; decimals?: number; prefix?: string; suffix?: string; label: ReactNode;
  cite?: string; illustrative?: boolean; size?: "md" | "lg" | "xl";
}) {
  const isStatic = useIsStatic();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [shown, setShown] = useState(isStatic ? value : 0);
  useEffect(() => {
    if (isStatic || !inView) { if (isStatic) setShown(value); return; }
    const c = animate(0, value, { duration: 1.4, ease: [0.22, 1, 0.36, 1], onUpdate: setShown });
    return () => c.stop();
  }, [inView, isStatic, value]);
  return (
    <div className={`stat stat-${size}`} ref={ref} data-figure="stat">
      <div className="stat-value">
        {prefix}{shown.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
        <FigureMark cite={cite} illustrative={illustrative} />
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/** Animated horizontal bar chart in plain SVG + motion, themed by tokens. */
export function BarChart({ data, unit = "", cite, illustrative, max, highlight, decimals = 0 }: {
  data: { label: string; value: number }[]; unit?: string; cite?: string; illustrative?: boolean;
  max?: number; highlight?: number; decimals?: number;
}) {
  const isStatic = useIsStatic();
  const top = max ?? (Math.max(0, ...data.map((d) => d.value)) || 1);
  const rowH = 100, labelW = 440, barW = 900, h = data.length * rowH;
  return (
    <div className="chart" data-figure="chart">
      <svg width="100%" viewBox={`0 0 ${labelW + barW + 200} ${h}`} role="img">
        {data.map((d, i) => {
          const w = (d.value / top) * barW;
          const hi = highlight === i;
          return (
            <g key={d.label} transform={`translate(0, ${i * rowH})`}>
              <text x={labelW - 24} y={rowH / 2} dominantBaseline="middle" textAnchor="end" className="chart-label">{d.label}</text>
              <rect x={labelW} y={18} width={barW} height={rowH - 36} rx={10} className="chart-track" />
              <motion.rect x={labelW} y={18} height={rowH - 36} rx={10}
                className={hi ? "chart-bar chart-bar-hi" : "chart-bar"}
                initial={{ width: isStatic ? w : 0 }} animate={{ width: w }}
                transition={{ duration: isStatic ? 0 : 1.1, delay: isStatic ? 0 : 0.2 + i * 0.08, ease: [0.22, 1, 0.36, 1] }} />
              <text x={labelW + w + 18} y={rowH / 2} dominantBaseline="middle" className="chart-value">
                {d.value.toFixed(decimals)}{unit}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="chart-cite"><FigureMark cite={cite} illustrative={illustrative} /></div>
    </div>
  );
}

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Mermaid diagram rendered with theme tokens. Keep Mermaid diagrams to ≤8 nodes; use LayeredArchitecture / C4Container / Sequence for denser pictures. */
export function Mermaid({ chart, height = 620 }: { chart: string; height?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [svg, setSvg] = useState("");
  const done = useAsyncTask([chart]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await document.fonts.ready;
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          securityLevel: "strict",
          fontFamily: cssVar("--font-body"),
          flowchart: { curve: "basis", padding: 20, nodeSpacing: 60, rankSpacing: 70 },
          themeVariables: {
            fontSize: "28px",
            fontFamily: cssVar("--font-body"),
            background: "transparent",
            primaryColor: cssVar("--surface-2"),
            primaryTextColor: cssVar("--text"),
            primaryBorderColor: cssVar("--accent"),
            secondaryColor: cssVar("--surface"),
            tertiaryColor: cssVar("--bg-elev"),
            lineColor: cssVar("--text-muted"),
            textColor: cssVar("--text"),
            clusterBkg: cssVar("--bg-elev"),
            clusterBorder: cssVar("--border"),
            edgeLabelBackground: cssVar("--bg-elev"),
          },
        });
        const out = await mermaid.render(`m${id}`, chart);
        if (alive) setSvg(out.svg);
      } catch (e) {
        reportError(`mermaid: ${String(e)}`);
      } finally {
        done();
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart]);
  return <div className="mermaid-box" style={{ height }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Syntax-highlighted code with per-step line focus.
 *  `focus` = list of line ranges per step, e.g. ["1-4", "6-9"]; shown from step `at`. */
export function Code({ code, lang = "ts", filename, focus = [], at = 1 }: {
  code: string; lang?: string; filename?: string; focus?: string[]; at?: number;
}) {
  const [html, setHtml] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const { step } = useSlide();
  const done = useAsyncTask([code, lang]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { codeToHtml } = await import("shiki");
        const out = await codeToHtml(code.trim(), { lang, theme: cssVar("--code-theme") || "github-dark-default" });
        if (alive) setHtml(out);
      } catch (e) {
        reportError(`shiki: ${String(e)}`);
      } finally {
        done();
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, lang]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const k = Math.min(step - at, focus.length - 1);
    const spec = k >= 0 && Number.isFinite(step) ? focus[k] : undefined;
    const lines = new Set<number>();
    spec?.split(",").forEach((part) => {
      const [a, b] = part.split("-").map(Number);
      for (let n = a; n <= (b || a); n++) lines.add(n);
    });
    el.querySelectorAll<HTMLElement>(".line").forEach((ln, i) => {
      ln.classList.toggle("is-dim", lines.size > 0 && !lines.has(i + 1));
      ln.classList.toggle("is-focus", lines.has(i + 1));
    });
  }, [html, step, focus, at]);

  return (
    <div className="code-window">
      <div className="code-bar"><i /><i /><i />{filename && <span>{filename}</span>}</div>
      <div className="code-body" ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export function Timeline({ items, stepwise = true }: {
  items: { when: string; title: string; body?: ReactNode }[]; stepwise?: boolean;
}) {
  return (
    <div className="timeline" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      <div className="timeline-line" />
      {items.map((it, i) => (
        <Appear key={i} at={stepwise ? i + 1 : 0} delay={stepwise ? 0 : 0.15 + i * 0.1} className="timeline-item">
          <div className="timeline-dot" />
          <div className="timeline-when">{it.when}</div>
          <div className="timeline-title">{it.title}</div>
          {it.body && <div className="timeline-body">{it.body}</div>}
        </Appear>
      ))}
    </div>
  );
}

export function Quote({ children, by, role, cite }: { children: ReactNode; by: string; role?: string; cite?: string }) {
  return (
    <figure className="quote" data-figure="quote">
      <blockquote>“{children}”</blockquote>
      <figcaption>
        <strong>{by}</strong>{role && <span> · {role}</span>}
        <FigureMark cite={cite} />
      </figcaption>
    </figure>
  );
}

/** Bulleted list with lucide icons as markers (never emoji). */
export function IconList({ items, stepwise = false, startAt = 1 }: {
  items: { icon: LucideIcon; text: ReactNode; tone?: "accent" | "accent-2" | "accent-3" }[]; stepwise?: boolean; startAt?: number;
}) {
  return (
    <Stagger className="icon-list" stepwise={stepwise} startAt={startAt}
      items={items.map((it, i) => (
        <div className="icon-list-item" key={i}><Icon icon={it.icon} tone={it.tone ?? "accent"} size="sm" /><span>{it.text}</span></div>
      ))} />
  );
}

export function Gradient({ children }: { children: ReactNode }) {
  return <span className="text-gradient">{children}</span>;
}



/** Raster/SVG media from public/media or imported assets. Requires alt + cite|illustrative. */
export function Figure({
  src, alt, fit = "contain", caption, cite, illustrative, frame = true, shadow = true,
  maxHeight = 620, className = "",
}: {
  src: string;
  alt: string;
  fit?: "contain" | "cover";
  caption?: ReactNode;
  cite?: string;
  illustrative?: boolean;
  frame?: boolean;
  shadow?: boolean;
  maxHeight?: number | string;
  className?: string;
}) {
  const onError = () => reportError(`figure: failed to load ${src}`);
  const h = typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight;
  return (
    <figure
      className={`deck-figure ${frame ? "is-framed" : ""} ${shadow ? "is-shadow" : ""} ${className}`}
      data-figure="media"
      style={{ ["--figure-max-h" as string]: h }}
    >
      <div className={`deck-figure-stage fit-${fit}`}>
        <img src={src} alt={alt} loading="lazy" decoding="async" onError={onError} />
      </div>
      {(caption || cite || illustrative) && (
        <figcaption className="deck-figure-cap">
          {caption && <span className="deck-figure-caption">{caption}</span>}
          <FigureMark cite={cite} illustrative={illustrative} />
        </figcaption>
      )}
      {!caption && !cite && !illustrative && <span data-uncited="true" />}
    </figure>
  );
}

/* Diagram primitives (React + CSS). Prefer over Mermaid for >8 nodes / swimlanes. */
export {
  LayeredArchitecture, FlowSteps, Sequence, C4Container, DiagramLegend,
  type ArchitectureLayer, type LayerItem, type SideRail,
  type FlowStep, type SequenceActor, type SequenceMessage,
  type C4Node, type C4Relation, type C4Kind, type DiagramTone,
} from "./diagrams";
