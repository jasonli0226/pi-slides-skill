/**
 * Presentation diagrams as React + CSS (+ light SVG). Prefer these over Mermaid when
 * the picture has more than ~8 nodes, needs swimlanes/layers, or needs precise layout.
 * Theme only via CSS variables. See references/diagram-guide.md.
 */
import type { LucideIcon } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Appear, Icon, Stagger } from "./components";

export type DiagramTone = "accent" | "accent-2" | "accent-3" | "muted" | "surface";

const toneClass = (t?: DiagramTone) => (t ? `dg-tone-${t}` : "dg-tone-accent");
const iconTone = (t?: DiagramTone): "accent" | "accent-2" | "accent-3" | "muted" | "text" =>
  t === "surface" || !t ? "muted" : t;

/* ============================ LayeredArchitecture ============================ */

export type LayerItem = {
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
}: {
  layers: ArchitectureLayer[];
  leftRail?: SideRail;
  rightRail?: SideRail;
  caption?: ReactNode;
  stepwise?: boolean;
}) {
  const maxCols = Math.max(...layers.map((l) => l.items.length), 1);
  return (
    <div className="dg-layered" data-figure="layered" style={{ ["--dg-cols" as string]: maxCols }}>
      {leftRail && (
        <div className={`dg-rail dg-rail-left ${toneClass(leftRail.tone ?? "muted")}`}>
          <div className="dg-rail-label">{leftRail.label}</div>
          <ul>{leftRail.items.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
      <div className="dg-layers">
        {layers.map((layer, i) => (
          <Appear key={layer.id} at={stepwise ? i + 1 : 0} delay={stepwise ? 0 : 0.08 * i} className={`dg-layer ${toneClass(layer.tone)}`}>
            <div className="dg-layer-label">{layer.label}</div>
            <div className="dg-layer-cells" style={{ gridTemplateColumns: `repeat(${layer.items.length}, minmax(0, 1fr))` }}>
              {layer.items.map((it) => (
                <div key={it.label} className={`dg-cell${it.highlight ? " is-hi" : ""}`}>
                  {it.icon && <Icon icon={it.icon} size="sm" tone={iconTone(layer.tone === "muted" ? "muted" : (layer.tone ?? "accent"))} />}
                  <div className="dg-cell-label">{it.label}</div>
                  {it.sub && <div className="dg-cell-sub">{it.sub}</div>}
                </div>
              ))}
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
  title: string;
  body?: string;
  icon?: LucideIcon;
  tone?: DiagramTone;
};

/** Left-to-right process or request path. Prefer 3–6 steps. */
export function FlowSteps({
  steps,
  stepwise = false,
}: {
  steps: FlowStep[];
  stepwise?: boolean;
}) {
  return (
    <div className="dg-flow" data-figure="flow">
      {steps.map((s, i) => (
        <Appear key={s.title} at={stepwise ? i + 1 : 0} delay={stepwise ? 0 : 0.1 * i} className="dg-flow-item">
          <div className={`dg-flow-card ${toneClass(s.tone)}`}>
            <div className="dg-flow-num">{String(i + 1).padStart(2, "0")}</div>
            {s.icon && <Icon icon={s.icon} size="md" tone={iconTone(s.tone ?? "accent")} />}
            <div className="dg-flow-title">{s.title}</div>
            {s.body && <div className="dg-flow-body">{s.body}</div>}
          </div>
          {i < steps.length - 1 && (
            <svg className="dg-flow-arrow" viewBox="0 0 48 24" aria-hidden>
              <path d="M2 12h36M30 4l12 8-12 8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </Appear>
      ))}
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

/**
 * Simple sequence / lifeline diagram. Prefer ≤6 actors and ≤8 messages.
 * Rows are messages; columns are actors. No third-party graph library.
 */
export function Sequence({
  actors,
  messages,
  stepwise = false,
}: {
  actors: SequenceActor[];
  messages: SequenceMessage[];
  stepwise?: boolean;
}) {
  const idx = Object.fromEntries(actors.map((a, i) => [a.id, i]));
  return (
    <div className="dg-seq" data-figure="sequence" style={{ ["--dg-actors" as string]: actors.length }}>
      <div className="dg-seq-heads">
        {actors.map((a) => (
          <div key={a.id} className={`dg-seq-actor ${toneClass(a.tone)}`}>{a.label}</div>
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
            return (
              <Appear key={`${m.from}-${m.to}-${i}`} at={stepwise ? i + 1 : 0} delay={stepwise ? 0 : 0.06 * i}
                className="dg-seq-msg" style={{ gridColumn: `${left + 1} / span ${span + 1}` }}>
                {m.note && <div className="dg-seq-note">{m.note}</div>}
                <div className={`dg-seq-line${m.dashed ? " is-dashed" : ""}${reverse ? " is-rev" : ""}`}>
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
  highlight?: boolean;
};

export type C4Relation = {
  from: string;
  to: string;
  /** specific verb, not just "uses" */
  label: string;
  dashed?: boolean;
};

/**
 * C4-style boxes + labeled relations drawn with SVG overlays.
 * Prefer ≤8 boxes. Place nodes with row/col on a small grid (max ~3×4).
 * For dense layered stacks use LayeredArchitecture instead.
 */
export function C4Container({
  nodes,
  relations = [],
  cols = 3,
  rows,
  legend = false,
  showRelationList = false,
}: {
  nodes: C4Node[];
  relations?: C4Relation[];
  cols?: number;
  rows?: number;
  legend?: boolean;
  /** Bottom chip list of relations — off by default (use edge labels + notes). */
  showRelationList?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const rMax = rows ?? Math.max(...nodes.map((n) => n.row), 1);
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const center = (n: C4Node) => ({
    x: ((n.col - 0.5) / cols) * 100,
    y: ((n.row - 0.5) / rMax) * 100,
  });

  return (
    <div className="dg-c4" data-figure="c4" style={{ ["--dg-c4-cols" as string]: cols, ["--dg-c4-rows" as string]: rMax }}>
      <div className="dg-c4-stage">
        <svg className="dg-c4-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <defs>
            <marker id={`dg-arrow-${uid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="var(--text-muted)" />
            </marker>
          </defs>
          {relations.map((rel, i) => {
            const a = byId[rel.from];
            const b = byId[rel.to];
            if (!a || !b) return null;
            const p = center(a);
            const q = center(b);
            const dx = q.x - p.x;
            const dy = q.y - p.y;
            const len = Math.hypot(dx, dy) || 1;
            const inset = 10;
            return (
              <line key={i}
                x1={p.x + (dx / len) * inset} y1={p.y + (dy / len) * inset}
                x2={q.x - (dx / len) * inset} y2={q.y - (dy / len) * inset}
                stroke="var(--text-muted)" strokeWidth="0.4"
                strokeDasharray={rel.dashed ? "1.2 1" : undefined}
                markerEnd={`url(#dg-arrow-${uid})`} vectorEffect="non-scaling-stroke" />
            );
          })}
        </svg>
        <div className="dg-c4-grid">
          {nodes.map((n) => (
            <Appear key={n.id} delay={0.05 * (n.row + n.col)} className={`dg-c4-node kind-${n.kind}${n.highlight ? " is-hi" : ""}`}
              style={{ gridRow: n.row, gridColumn: n.col }}>
              <div className="dg-c4-kind">{n.kind}</div>
              <div className="dg-c4-label">{n.label}</div>
              {n.description && <div className="dg-c4-desc">{n.description}</div>}
              {n.tech && <div className="dg-c4-tech">{n.tech}</div>}
            </Appear>
          ))}
        </div>
        {relations.map((rel, i) => {
          const a = byId[rel.from];
          const b = byId[rel.to];
          if (!a || !b || !rel.label) return null;
          const p = center(a);
          const q = center(b);
          return (
            <div key={`lbl-${i}`} className="dg-c4-edge-label" style={{ left: `${(p.x + q.x) / 2}%`, top: `${(p.y + q.y) / 2}%` }}>
              {rel.label}
            </div>
          );
        })}
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
      {legend && (
        <div className="dg-c4-legend" aria-hidden>
          <span className="kind-person">Person</span>
          <span className="kind-system">System</span>
          <span className="kind-container">Container</span>
          <span className="kind-external">External</span>
        </div>
      )}
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
