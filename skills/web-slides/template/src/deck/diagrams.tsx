/**
 * Presentation diagrams as React + CSS (+ light SVG). Prefer these over Mermaid when
 * the picture has more than ~8 nodes, needs swimlanes/layers, or needs precise layout.
 * Theme only via CSS variables. See references/diagram-guide.md.
 */
import type { LucideIcon } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Appear, Icon, Stagger } from "./components";
import { useIsStatic, useSlide } from "./context";

export type DiagramTone = "accent" | "accent-2" | "accent-3" | "muted" | "surface";
/** false / omit = all at once; "reveal" (or true) = Appear one lane/step/message per click; "path" = all visible, walk primary_path. */
export type StepwiseMode = boolean | "reveal" | "path";

const toneClass = (t?: DiagramTone) => (t ? `dg-tone-${t}` : "dg-tone-accent");
const iconTone = (t?: DiagramTone): "accent" | "accent-2" | "accent-3" | "muted" | "text" =>
  t === "surface" || !t ? "muted" : t;

export function stepwiseKind(stepwise?: StepwiseMode): "off" | "reveal" | "path" {
  if (stepwise === "path") return "path";
  if (stepwise === true || stepwise === "reveal") return "reveal";
  return "off";
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

/**
 * Path-walk accents for `stepwise: "path"`.
 * Present: step 0 shows every node with no accent; each later click accents the next
 * id on `primary_path` (and the hop into it) and dims the rest — still readable.
 * Static / print / PDF: the complete path is softly accented and nothing is dimmed.
 */
export function usePathWalk(path: Array<string | number> | undefined, stepwise?: StepwiseMode) {
  const { step } = useSlide();
  const isStatic = useIsStatic();
  const kind = stepwiseKind(stepwise);
  const ids = (path ?? []).map((x) => String(x));
  const on = kind === "path" && ids.length > 0;
  const complete = !on || isStatic;
  const cursor = !on ? 0 : complete ? ids.length : Math.max(0, Math.min(step, ids.length));
  const current = cursor > 0 ? ids[cursor - 1] : null;
  const prev = cursor > 1 ? ids[cursor - 2] : null;
  const pathSet = new Set(ids);
  const hop = (from?: string | null, to?: string | null) => {
    if (!from || !to) return false;
    if (complete) {
      for (let i = 0; i < ids.length - 1; i++) if (ids[i] === from && ids[i + 1] === to) return true;
      return false;
    }
    return Boolean(current && prev && from === prev && to === current);
  };
  const nodeState = (id: string): "path" | "dim" | "normal" => {
    if (!on) return "normal";
    if (complete) return pathSet.has(id) ? "path" : "normal";
    if (!current) return "normal";
    return id === current ? "path" : "dim";
  };
  const edgeState = (from: string, to: string): "path" | "dim" | "normal" => {
    if (!on) return "normal";
    if (hop(from, to)) return "path";
    if (complete) return "normal";
    if (!current) return "normal";
    return "dim";
  };
  const mark = (state: "path" | "dim" | "normal") => (state === "normal" ? undefined : `is-${state}`);
  return { kind, on, complete, cursor, current, prev, pathSet, hop, nodeState, edgeState, mark, nodeClass: (id: string, extra?: string) => cx(extra, mark(nodeState(id))), edgeClass: (from: string, to: string, extra?: string) => cx(extra, mark(edgeState(from, to))) };
}

/* ============================ LayeredArchitecture ============================ */

export type LayerItem = {
  id?: string;
  label: string;
  /** optional second line (tech or role), keep ≤ 4 words */
  sub?: string;
  highlight?: boolean;
  icon?: LucideIcon;
};

export type ArchitectureLayer = {
  id: string;
  /** short lane label shown on the left, e.g. "Edge" */
  label: string;
  tone?: DiagramTone;
  items: LayerItem[];
};

export type SideRail = {
  label: string;
  items: string[];
  tone?: DiagramTone;
};

/**
 * Horizontal swimlane / layer map for enterprise stacks.
 * Use 3–6 layers, ≤5 cells per layer. Side rails are optional vertical concerns
 * (security, ops, identity) that span the stack.
 */
export function LayeredArchitecture({
  layers,
  leftRail,
  rightRail,
  caption,
  stepwise = false,
  primary_path,
}: {
  layers: ArchitectureLayer[];
  leftRail?: SideRail;
  rightRail?: SideRail;
  caption?: ReactNode;
  stepwise?: StepwiseMode;
  primary_path?: Array<string | number>;
}) {
  const maxCols = Math.max(...layers.map((l) => l.items.length), 1);
  const kind = stepwiseKind(stepwise);
  const walk = usePathWalk(primary_path, stepwise);
  const reveal = kind === "reveal";
  return (
    <div className="dg-layered" data-figure="layered" data-stepwise={kind} style={{ ["--dg-cols" as string]: maxCols }}>
      {leftRail && (
        <div className={`dg-rail dg-rail-left ${toneClass(leftRail.tone ?? "muted")}`}>
          <div className="dg-rail-label">{leftRail.label}</div>
          <ul>{leftRail.items.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
      <div className="dg-layers">
        {layers.map((layer, i) => (
          <Appear key={layer.id} at={reveal ? i + 1 : 0} delay={reveal ? 0 : 0.08 * i} className={cx("dg-layer", toneClass(layer.tone), walk.nodeState(layer.id) === "path" && "is-path")}>
            <div className="dg-layer-label">{layer.label}</div>
            <div className="dg-layer-cells" style={{ gridTemplateColumns: `repeat(${layer.items.length}, minmax(0, 1fr))` }}>
              {layer.items.map((it, j) => {
                const id = it.id ?? `${layer.id}-${j}`;
                return (
                  <div key={id} className={cx("dg-cell", it.highlight && "is-hi", walk.mark(walk.nodeState(id)))}>
                    {it.icon && <Icon icon={it.icon} size="sm" tone={iconTone(layer.tone === "muted" ? "muted" : (layer.tone ?? "accent"))} />}
                    <div className="dg-cell-label">{it.label}</div>
                    {it.sub && <div className="dg-cell-sub">{it.sub}</div>}
                  </div>
                );
              })}
            </div>
          </Appear>
        ))}
      </div>
      {rightRail && (
        <div className={`dg-rail dg-rail-right ${toneClass(rightRail.tone ?? "accent-2")}`}>
          <div className="dg-rail-label">{rightRail.label}</div>
          <ul>{rightRail.items.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
      {caption && <div className="dg-caption">{caption}</div>}
    </div>
  );
}

/* ============================ FlowSteps ==================================== */

export type FlowStep = {
  id?: string;
  title: string;
  body?: string;
  icon?: LucideIcon;
  tone?: DiagramTone;
};

/** Left-to-right process or request path. Prefer 3–6 steps. */
export function FlowSteps({
  steps,
  stepwise = false,
  primary_path,
}: {
  steps: FlowStep[];
  stepwise?: StepwiseMode;
  primary_path?: Array<string | number>;
}) {
  const kind = stepwiseKind(stepwise);
  const ids = primary_path ?? steps.map((s, i) => s.id ?? String(i));
  const walk = usePathWalk(kind === "path" ? ids : primary_path, stepwise);
  const reveal = kind === "reveal";
  return (
    <div className="dg-flow" data-figure="flow" data-stepwise={kind}>
      {steps.map((s, i) => {
        const id = s.id ?? String(i);
        const next = steps[i + 1];
        const nextId = next ? (next.id ?? String(i + 1)) : null;
        return (
          <Appear key={id} at={reveal ? i + 1 : 0} delay={reveal ? 0 : 0.1 * i} className="dg-flow-item">
            <div className={cx("dg-flow-card", toneClass(s.tone), walk.mark(walk.nodeState(id)))}>
              <div className="dg-flow-num">{String(i + 1).padStart(2, "0")}</div>
              {s.icon && <Icon icon={s.icon} size="md" tone={iconTone(s.tone ?? "accent")} />}
              <div className="dg-flow-title">{s.title}</div>
              {s.body && <div className="dg-flow-body">{s.body}</div>}
            </div>
            {i < steps.length - 1 && (
              <svg className={cx("dg-flow-arrow", nextId ? walk.mark(walk.edgeState(id, nextId)) : undefined)} viewBox="0 0 48 24" aria-hidden>
                <path d="M2 12h36M30 4l12 8-12 8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </Appear>
        );
      })}
    </div>
  );
}

/* ============================ Sequence ===================================== */

export type SequenceActor = { id: string; label: string; tone?: DiagramTone };
export type SequenceMessage = {
  from: string;
  to: string;
  label: string;
  /** dashed = async / return / optional */
  dashed?: boolean;
  note?: string;
};

/** Resolve primary_path as message indices (numeric) or an actor-id walk along messages. */
export function sequencePathIndices(
  messages: SequenceMessage[],
  primary_path?: Array<string | number>,
): number[] {
  if (!primary_path?.length) return [];
  const allNumeric = primary_path.every((x) => typeof x === "number" || /^-?\d+$/.test(String(x)));
  if (allNumeric) return primary_path.map(Number).filter((i) => i >= 0 && i < messages.length);
  const hops: number[] = [];
  for (let i = 0; i < primary_path.length - 1; i++) {
    const from = String(primary_path[i]);
    const to = String(primary_path[i + 1]);
    const idx = messages.findIndex((m, k) => !hops.includes(k) && m.from === from && m.to === to);
    if (idx >= 0) hops.push(idx);
  }
  return hops;
}

/**
 * Simple sequence / lifeline diagram. Prefer ≤6 actors and ≤8 messages.
 * Rows are messages; columns are actors. No third-party graph library.
 */
export function Sequence({
  actors,
  messages,
  stepwise = false,
  primary_path,
}: {
  actors: SequenceActor[];
  messages: SequenceMessage[];
  stepwise?: StepwiseMode;
  primary_path?: Array<string | number>;
}) {
  const idx = Object.fromEntries(actors.map((a, i) => [a.id, i]));
  const kind = stepwiseKind(stepwise);
  const numericPath = !primary_path?.length || primary_path.every((x) => typeof x === "number" || /^-?\d+$/.test(String(x)));
  const pathForWalk = kind === "path"
    ? (primary_path?.length ? primary_path : messages.map((_, i) => i))
    : undefined;
  const pathIdx = kind === "path"
    ? (primary_path?.length ? sequencePathIndices(messages, primary_path) : messages.map((_, i) => i))
    : [];
  const walk = usePathWalk(pathForWalk, stepwise);
  const reveal = kind === "reveal";
  const messageState = (i: number): "path" | "dim" | "normal" => {
    if (!walk.on) return "normal";
    if (numericPath) return walk.nodeState(String(i));
    const m = messages[i];
    return m ? walk.edgeState(m.from, m.to) : "normal";
  };
  const actorState = (id: string): "path" | "dim" | "normal" => {
    if (!walk.on) return "normal";
    if (!numericPath) return walk.nodeState(id);
    const involved = new Set<string>();
    if (walk.complete) {
      for (const i of pathIdx) {
        involved.add(messages[i].from);
        involved.add(messages[i].to);
      }
      return involved.has(id) ? "path" : "normal";
    }
    if (walk.current == null) return "normal";
    const mi = Number(walk.current);
    const m = Number.isInteger(mi) ? messages[mi] : undefined;
    if (!m) return "normal";
    return m.from === id || m.to === id ? "path" : "dim";
  };
  return (
    <div className="dg-seq" data-figure="sequence" data-stepwise={kind} style={{ ["--dg-actors" as string]: actors.length }}>
      <div className="dg-seq-heads">
        {actors.map((a) => (
          <div key={a.id} className={cx("dg-seq-actor", toneClass(a.tone), walk.mark(actorState(a.id)))}>{a.label}</div>
        ))}
      </div>
      <div className="dg-seq-body">
        {actors.map((a) => <div key={a.id} className="dg-seq-life" />)}
        <div className="dg-seq-msgs">
          {messages.map((m, i) => {
            const a = idx[m.from];
            const b = idx[m.to];
            if (a == null || b == null) return null;
            const left = Math.min(a, b);
            const right = Math.max(a, b);
            const span = Math.max(1, right - left);
            const reverse = b < a;
            const hop = walk.mark(messageState(i));
            return (
              <Appear key={`${m.from}-${m.to}-${i}`} at={reveal ? i + 1 : 0} delay={reveal ? 0 : 0.06 * i}
                className={cx("dg-seq-msg", hop)} style={{ gridColumn: `${left + 1} / span ${span + 1}`, gridRow: i + 1, ["--dg-span" as string]: span + 1 }}>
                {m.note && <div className="dg-seq-note">{m.note}</div>}
                <div className={cx("dg-seq-line", m.dashed && "is-dashed", reverse && "is-rev", hop)}>
                  <span className="dg-seq-label">{m.label}</span>
                </div>
              </Appear>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================ C4Container ================================== */

export type C4Kind = "person" | "system" | "container" | "external";
export type C4Level = "context" | "container";
export type C4Node = {
  id: string;
  label: string;
  kind: C4Kind;
  /** short responsibility, ≤ 12 words */
  description?: string;
  /** technology tag, e.g. "React · Vite" */
  tech?: string;
  /** 1-based grid placement */
  row: number;
  col: number;
  /** optional grid span (system often spans 1×1 but visually heavier via CSS) */
  rowSpan?: number;
  colSpan?: number;
  highlight?: boolean;
};

export type C4Relation = {
  from: string;
  to: string;
  /** specific verb, not just "uses" */
  label: string;
  dashed?: boolean;
};

/** Orthogonal (elbow) path in viewBox units; returns { d, labelX, labelY }. */
function elbow(
  p: { x: number; y: number },
  q: { x: number; y: number },
  inset = 11,
): { d: string; labelX: number; labelY: number } {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  const x1 = p.x + (dx / len) * inset;
  const y1 = p.y + (dy / len) * inset;
  const x2 = q.x - (dx / len) * inset;
  const y2 = q.y - (dy / len) * inset;
  // Prefer a clean H-V-H or V-H-V elbow through the midpoints.
  if (Math.abs(dx) >= Math.abs(dy)) {
    const mx = (x1 + x2) / 2;
    return {
      d: `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${mx.toFixed(2)} ${y1.toFixed(2)} L ${mx.toFixed(2)} ${y2.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      labelX: mx,
      labelY: (y1 + y2) / 2,
    };
  }
  const my = (y1 + y2) / 2;
  return {
    d: `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x1.toFixed(2)} ${my.toFixed(2)} L ${x2.toFixed(2)} ${my.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    labelX: (x1 + x2) / 2,
    labelY: my,
  };
}

/**
 * C4-style boxes + labeled orthogonal relations (SVG elbows, no graph lib).
 * Prefer ≤8 boxes on a ≤3×4 grid. One zoom level per slide.
 * Nodes fade in (no translate) so Appear never fights the grid layout.
 * `stepwise: "path"` walks `primary_path` with a stroke accent; print shows the final path.
 */
export function C4Container({
  nodes,
  relations = [],
  cols = 3,
  rows,
  legend = true,
  showRelationList = false,
  caption,
  level,
  stepwise = false,
  primary_path,
}: {
  nodes: C4Node[];
  relations?: C4Relation[];
  cols?: number;
  rows?: number;
  /** Compact kind key under the stage. Default on — kinds are also on each box. */
  legend?: boolean;
  /** Bottom chip list of relations — off by default (edge labels cover this). */
  showRelationList?: boolean;
  caption?: ReactNode;
  level?: C4Level;
  stepwise?: StepwiseMode;
  primary_path?: Array<string | number>;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const rMax = rows ?? Math.max(...nodes.map((n) => n.row + (n.rowSpan ?? 1) - 1), 1);
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const walk = usePathWalk(primary_path, stepwise);
  const kind = stepwiseKind(stepwise);
  const center = (n: C4Node) => {
    const rs = n.rowSpan ?? 1;
    const cs = n.colSpan ?? 1;
    return {
      x: ((n.col - 1 + cs / 2) / cols) * 100,
      y: ((n.row - 1 + rs / 2) / rMax) * 100,
    };
  };

  const edges = relations.flatMap((rel, i) => {
    const a = byId[rel.from];
    const b = byId[rel.to];
    if (!a || !b) return [];
    const e = elbow(center(a), center(b));
    return [{ ...e, rel, i }];
  });

  return (
    <div className="dg-c4" data-figure="c4" data-c4-level={level} data-stepwise={kind} style={{ ["--dg-c4-cols" as string]: cols, ["--dg-c4-rows" as string]: rMax }}>
      <div className="dg-c4-stage">
        <svg className="dg-c4-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <defs>
            <marker id={`dg-arrow-${uid}`} markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto">
              <path d="M0,0 L5,2.5 L0,5 Z" fill="var(--text-muted)" />
            </marker>
            <marker id={`dg-arrow-hi-${uid}`} markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto">
              <path d="M0,0 L5,2.5 L0,5 Z" fill="var(--accent)" />
            </marker>
          </defs>
          {edges.map(({ d, rel, i }) => {
            const state = walk.edgeState(rel.from, rel.to);
            const toSystem = byId[rel.to]?.kind === "system" || byId[rel.from]?.kind === "system";
            const accent = state === "path" || (state === "normal" && toSystem);
            return (
              <path key={i} d={d} fill="none" className={walk.mark(state)}
                stroke={accent ? "var(--accent)" : "var(--text-muted)"}
                strokeWidth={accent ? 0.55 : 0.4}
                strokeOpacity={state === "dim" ? 0.45 : (accent ? 0.85 : 0.55)}
                strokeDasharray={rel.dashed ? "1.4 1.1" : undefined}
                markerEnd={`url(#${accent ? `dg-arrow-hi-${uid}` : `dg-arrow-${uid}`})`}
                vectorEffect="non-scaling-stroke" />
            );
          })}
        </svg>
        <div className="dg-c4-grid">
          {nodes.map((n, i) => (
            <Appear key={n.id} variant="fade" delay={0.06 * i}
              className={cx("dg-c4-node", `kind-${n.kind}`, (n.highlight || n.kind === "system") && "is-hi", walk.mark(walk.nodeState(n.id)))}
              style={{
                gridRow: `${n.row} / span ${n.rowSpan ?? 1}`,
                gridColumn: `${n.col} / span ${n.colSpan ?? 1}`,
              }}>
              <div className="dg-c4-kind">{n.kind}</div>
              <div className="dg-c4-label">{n.label}</div>
              {n.description && <div className="dg-c4-desc">{n.description}</div>}
              {n.tech && <div className="dg-c4-tech">{n.tech}</div>}
            </Appear>
          ))}
        </div>
        {edges.map(({ labelX, labelY, rel, i }) => (
          rel.label ? (
            <div key={`lbl-${i}`} className={cx("dg-c4-edge-label", rel.dashed && "is-dashed", walk.mark(walk.edgeState(rel.from, rel.to)))}
              style={{ left: `${labelX}%`, top: `${labelY}%` }}>
              {rel.label}
            </div>
          ) : null
        ))}
        {legend && (
          <div className="dg-c4-legend" aria-hidden>
            <span className="kind-person">Person</span>
            <span className="kind-system">System</span>
            <span className="kind-container">Container</span>
            <span className="kind-external">External</span>
          </div>
        )}
      </div>
      {showRelationList && relations.length > 0 && (
        <ul className="dg-c4-rels">
          {relations.map((rel, i) => (
            <li key={i}><span className="dg-c4-rel-from">{byId[rel.from]?.label ?? rel.from}</span>
              <span className="dg-c4-rel-arrow">{rel.dashed ? "-->" : "->"}</span>
              <span className="dg-c4-rel-to">{byId[rel.to]?.label ?? rel.to}</span>
              <span className="dg-c4-rel-label">{rel.label}</span></li>
          ))}
        </ul>
      )}
      {caption && <div className="dg-caption">{caption}</div>}
    </div>
  );
}

/** Convenience: staggered list of small diagram callouts (legend chips, callouts). */
export function DiagramLegend({ items }: { items: { tone?: DiagramTone; label: string }[] }) {
  return (
    <Stagger className="dg-legend" gap={0.05}
      items={items.map((it) => (
        <span key={it.label} className={`dg-legend-chip ${toneClass(it.tone)}`}>{it.label}</span>
      ))} />
  );
}
