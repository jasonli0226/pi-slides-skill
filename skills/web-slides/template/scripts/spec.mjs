#!/usr/bin/env node
/**
 * Validate content/deck.spec.yaml and generate stub slides for status:stub entries.
 * Usage:
 *   node scripts/spec.mjs              # validate + write from-spec.tsx + spec-manifest.json
 *   node scripts/spec.mjs --check      # validate only
 *   node scripts/spec.mjs --watch      # rebuild on change
 *   node scripts/spec.mjs --sync-outline  # also write a light content/deck.outline.md
 *
 * Promote / merge: status "locked" slides are never written into from-spec.tsx.
 * See references/deck-spec.md.
 */
import { mkdirSync, readFileSync, watch, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const specPath = join(root, "content", "deck.spec.yaml");
const outDir = join(root, "src", "slides", "generated");
const outFile = join(outDir, "from-spec.tsx");
const manifestFile = join(outDir, "spec-manifest.json");
const outlinePath = join(root, "content", "deck.outline.md");
const slidesDir = join(root, "src", "slides");

const checkOnly = process.argv.includes("--check");
const watching = process.argv.includes("--watch");
const syncOutline = process.argv.includes("--sync-outline");

const THEMES = new Set(["midnight", "aurora", "paper", "tech-dark", "bento-minimal", "navy-pitch", "brand"]);
const TYPES = new Set([
  "title", "agenda", "big-number", "comparison", "architecture", "timeline",
  "code", "results", "quote", "governance", "lessons", "closing", "section", "content",
]);
const LAYOUTS = new Set([
  "layout-stack", "layout-kpi", "layout-compare", "layout-media", "layout-hero",
  "layout-hero-flip", "layout-bento", "layout-bento-4", "layout-section",
  "layout-timeline-strip",
  "grid-2", "grid-3", "grid-4", "row",
]);
const STATUSES = new Set(["stub", "locked"]);
const KNOWN_COMPONENTS = new Set([
  "Stat", "BarChart", "Mermaid", "LayeredArchitecture", "FlowSteps", "Sequence",
  "C4Container", "Figure", "Code", "Timeline", "Pill", "Card", "IconList", "Quote",
  "Icon", "Stagger", "Appear", "Gradient", "Cite", "DiagramLegend", "EChart",
]);
const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

/** Cheap chart-guide checks on an EChart spec entry (same thresholds as the review lint). */
function echartWarnings(props) {
  const out = [];
  if (!props || typeof props !== "object") return ["EChart needs a mapping with option, label and cite|illustrative"];
  const option = props.option;
  if (!option || typeof option !== "object") return ["EChart needs an `option` mapping (ECharts option: xAxis, yAxis, series)"];
  if (!props.cite && !props.illustrative) out.push("EChart needs `cite` (a source id) or `illustrative: true`");
  if (!props.label) out.push("EChart needs a `label` describing the chart for screen readers");
  const series = arr(option.series);
  if (!series.length) out.push("EChart option has no series");
  const types = [...new Set(series.map((x) => String(x?.type ?? "unknown")))];
  const odd = types.filter((t) => t === "pie" || /3D$/.test(t) || t === "radar" || t === "gauge");
  if (odd.length) out.push(`EChart type ${odd.join(", ")} is off the chart guide (use a stacked bar for part-to-whole; no 3D)`);
  if (series.length > 5) out.push(`EChart has ${series.length} series; keep it to 5 or fewer`);
  const names = series.map((x) => x?.name).filter(Boolean);
  if (series.length > 1 && !props.highlight) out.push("EChart has several series but no `highlight` (the series the title talks about)");
  if (props.highlight && !names.includes(props.highlight)) out.push(`EChart highlight "${props.highlight}" names no series`);
  const points = Math.max(0, ...series.map((x) => (Array.isArray(x?.data) ? x.data.length : 0)));
  if (types.includes("bar") && points > 12) out.push(`EChart has ${points} bars per series; keep it to 12 or fewer`);
  const xs = arr(option.xAxis), ys = arr(option.yAxis);
  const valueAxes = [...xs.filter((a) => a?.type === "value"), ...ys.filter((a) => (a?.type ?? "value") === "value")];
  if (types.includes("bar") && valueAxes.some((a) => a?.scale === true || (a?.min !== undefined && a.min !== 0)))
    out.push("EChart bar chart value axis must start at zero");
  if (xs.length > 1 || ys.length > 1) out.push("EChart has two value axes; split it unless the notes justify the dual axis");
  return out;
}

const DIAGRAM_COMPONENTS = new Set(["Mermaid", "LayeredArchitecture", "FlowSteps", "Sequence", "C4Container"]);
const C4_LEVELS = new Set(["context", "container"]);
const C4_KINDS = new Set(["person", "system", "container", "external"]);
const BARE_EDGE_LABELS = new Set(["", "uses", "use", "using"]);
const MERMAID_KEYWORDS = new Set([
  "flowchart", "graph", "sequencediagram", "classdiagram", "statediagram", "statediagram-v2",
  "erdiagram", "gantt", "pie", "gitgraph", "mindmap", "timeline", "quadrantchart",
  "participant", "actor", "boundary", "control", "entity", "database", "collections",
  "queue", "subgraph", "end", "classdef", "click", "style", "linkstyle", "direction",
  "lr", "tb", "td", "rl", "bt",
]);
const LUCIDE_ALLOW = new Set([
  "Bot", "Database", "Network", "Server", "Search", "FilePen", "Sparkles", "ShieldCheck",
  "Shield", "Check", "Rocket", "Globe", "Cloud", "Lock", "Users", "User", "Workflow",
  "Boxes", "Box", "Layers", "GitBranch", "MessageSquare", "FileText", "Settings", "Cpu",
  "HardDrive", "Waypoints", "Share2",
]);
const STUB_STRIP = new Set(["evidence", "cite", "illustrative"]);

function stepwiseKind(stepwise) {
  if (stepwise === "path") return "path";
  if (stepwise === true || stepwise === "reveal") return "reveal";
  return "off";
}

function mermaidNodeCount(chart) {
  const text = String(chart || "");
  const ids = new Set();
  for (const m of text.matchAll(/\b([A-Za-z][\w-]*)\s*(?:\[|\(\(|\(|\{|>)/g)) {
    if (!MERMAID_KEYWORDS.has(m[1].toLowerCase())) ids.add(m[1]);
  }
  for (const m of text.matchAll(/^\s*participant\s+(\S+)/gim)) ids.add(m[1].replace(/["']/g, ""));
  return ids.size;
}

function normalizeMermaid(s) {
  return String(s || "").replace(/\r\n/g, "\n").split("\n").map((l) => l.trimEnd()).join("\n").trim();
}

function looksLikeRepoChart(chart) {
  return /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|rb)\b/.test(chart || "") || /\bsrc\//.test(chart || "");
}

function hasPin(entry) {
  return Boolean(entry && typeof entry.path === "string" && entry.path.trim() && entry.start != null && entry.start !== "");
}

function evidenceList(node) {
  return arr(node?.evidence).filter((e) => e && typeof e === "object");
}

function nodeHasEvidence(node) {
  return evidenceList(node).some(hasPin);
}

function collectPins(props) {
  const pins = [];
  const walk = (x) => {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) { x.forEach(walk); return; }
    if (Array.isArray(x.evidence)) pins.push(...evidenceList(x));
    for (const v of Object.values(x)) {
      if (v && typeof v === "object") walk(v);
    }
  };
  walk(props);
  return pins;
}

function diagramNodes(name, props) {
  if (!props || typeof props !== "object") return [];
  if (name === "C4Container") return arr(props.nodes).filter((n) => n && n.id);
  if (name === "Sequence") return arr(props.actors).filter((n) => n && n.id);
  if (name === "FlowSteps") return arr(props.steps).map((s, i) => ({ ...s, id: s?.id || String(i) }));
  if (name === "LayeredArchitecture") {
    const nodes = [];
    for (const layer of arr(props.layers)) {
      if (layer?.id) nodes.push({ ...layer, _kind: "layer" });
      arr(layer?.items).forEach((it, i) => nodes.push({ ...it, id: it?.id || (layer?.id ? `${layer.id}-${i}` : undefined), _kind: "cell", _layer: layer?.id }));
    }
    return nodes;
  }
  if (name === "Mermaid") return arr(props.nodes).filter((n) => n && (n.id || n.label));
  return [];
}

function diagramEdges(name, props) {
  if (!props || typeof props !== "object") return [];
  if (name === "C4Container") return arr(props.relations);
  if (name === "Sequence") return arr(props.messages);
  if (name === "Mermaid") return arr(props.edges);
  if (name === "LayeredArchitecture") return arr(props.edges || props.relations);
  if (name === "FlowSteps") {
    const steps = arr(props.steps);
    return steps.slice(0, -1).map((s, i) => {
      const next = steps[i + 1];
      return { from: s?.id || String(i), to: next?.id || String(i + 1), label: s?.title || "then" };
    });
  }
  return [];
}

function nodeIdSet(name, props) {
  const ids = new Set();
  if (name === "C4Container") for (const n of arr(props.nodes)) if (n?.id) ids.add(String(n.id));
  if (name === "Sequence") {
    for (const a of arr(props.actors)) if (a?.id) ids.add(String(a.id));
    arr(props.messages).forEach((_, i) => ids.add(String(i)));
  }
  if (name === "FlowSteps") arr(props.steps).forEach((s, i) => ids.add(String(s?.id ?? i)));
  if (name === "LayeredArchitecture") {
    for (const layer of arr(props.layers)) {
      if (layer?.id) ids.add(String(layer.id));
      arr(layer?.items).forEach((it, i) => ids.add(String(it?.id ?? `${layer?.id}-${i}`)));
    }
  }
  if (name === "Mermaid") for (const n of arr(props.nodes)) if (n?.id) ids.add(String(n.id));
  return ids;
}

function expectedStepCount(name, props) {
  const kind = stepwiseKind(props?.stepwise);
  if (kind === "path") {
    if (arr(props.primary_path).length) {
      if (name === "Sequence") {
        const path = arr(props.primary_path);
        const numeric = path.every((x) => typeof x === "number" || /^-?\d+$/.test(String(x)));
        return numeric ? path.length : Math.max(0, path.length);
      }
      return arr(props.primary_path).length;
    }
    if (name === "FlowSteps") return arr(props.steps).length;
    if (name === "Sequence") return arr(props.messages).length;
    return null;
  }
  if (kind === "reveal") {
    if (name === "LayeredArchitecture") return arr(props.layers).length;
    if (name === "FlowSteps") return arr(props.steps).length;
    if (name === "Sequence") return arr(props.messages).length;
  }
  return null;
}

function pathFollowsEdges(name, props, path) {
  if (name === "C4Container") {
    const rels = arr(props.relations);
    for (let i = 0; i < path.length - 1; i++) {
      const from = String(path[i]), to = String(path[i + 1]);
      if (!rels.some((r) => String(r?.from) === from && String(r?.to) === to)) {
        return `primary_path hop "${from}" → "${to}" does not follow a declared relation`;
      }
    }
  } else if (name === "Sequence") {
    const messages = arr(props.messages);
    const numeric = path.every((x) => typeof x === "number" || /^-?\d+$/.test(String(x)));
    if (numeric) {
      for (const i of path) {
        const n = Number(i);
        if (!Number.isInteger(n) || n < 0 || n >= messages.length) {
          return `primary_path message index ${i} does not exist`;
        }
      }
    } else {
      for (let i = 0; i < path.length - 1; i++) {
        const from = String(path[i]), to = String(path[i + 1]);
        if (!messages.some((m) => String(m?.from) === from && String(m?.to) === to)) {
          return `primary_path hop "${from}" → "${to}" does not follow a declared message`;
        }
      }
    }
  }
  return null;
}

/** Hard rules are errors; soft caps and honesty hints are warnings (same style as echartWarnings). */
function diagramIssues(name, props, slide) {
  const errors = [];
  const warnings = [];
  if (!props || typeof props !== "object") {
    return { errors: [`${name} needs a mapping of diagram properties`], warnings };
  }
  const locName = name;
  const edges = diagramEdges(name, props);
  const explicitEdges = name === "FlowSteps" ? [] : edges;
  for (const e of explicitEdges) {
    const label = String(e?.label ?? "").trim();
    if (BARE_EDGE_LABELS.has(label.toLowerCase())) {
      const pair = e?.from && e?.to ? ` ${e.from} → ${e.to}` : "";
      errors.push(`${locName} edge${pair} needs a specific verb label (not empty or a bare "uses")`);
    }
  }
  if (name !== "Sequence" && name !== "FlowSteps") {
    const seen = new Set();
    for (const e of explicitEdges) {
      if (!e?.from || !e?.to) continue;
      const fwd = `${e.from}\0${e.to}`;
      const rev = `${e.to}\0${e.from}`;
      if (seen.has(rev)) errors.push(`${locName} has a bidirectional pair ${e.to} ⇄ ${e.from}; use two specifically labelled unidirectional hops on a sequence, not a two-way line`);
      seen.add(fwd);
    }
  }
  if (name === "C4Container") {
    const level = props.level;
    if (!C4_LEVELS.has(level)) errors.push("C4Container needs level: context|container (one zoom level per slide)");
    const kinds = arr(props.nodes).map((n) => n?.kind);
    const odd = kinds.filter((k) => k && !C4_KINDS.has(k));
    if (odd.length) errors.push(`C4Container has unknown kind(s) ${[...new Set(odd)].join(", ")}`);
    if (level === "context" && kinds.includes("container")) {
      errors.push("C4Container mixes container boxes onto a context-level figure");
    }
  }
  const ids = nodeIdSet(name, props);
  const path = arr(props.primary_path);
  if (path.length) {
    for (const raw of path) {
      const id = String(raw);
      if (!ids.has(id)) errors.push(`${locName} primary_path id "${id}" does not exist`);
    }
    if (name === "C4Container" || name === "Sequence") {
      const hopErr = pathFollowsEdges(name, props, path);
      if (hopErr) errors.push(`${locName} ${hopErr}`);
    }
  }
  const illustrative = props.illustrative === true;
  if (!illustrative && ["C4Container", "LayeredArchitecture", "Sequence", "FlowSteps", "Mermaid"].includes(name)) {
    const nodes = diagramNodes(name, props).filter((n) => n && (n.id || n.label) && n._kind !== "layer");
    const needsEvidence = name !== "Mermaid" || nodes.length > 0;
    if (needsEvidence && nodes.length) {
      const missing = nodes.filter((n) => !n.illustrative && !nodeHasEvidence(n));
      if (missing.length) {
        errors.push(`${locName} is not illustrative but ${missing.length} node(s) lack evidence with path+start`);
      }
    }
  }
  const sources = new Set(arr(slide?.sources).map(String));
  if (props.cite && !sources.has(String(props.cite))) {
    errors.push(`${locName} cite "${props.cite}" is not in the slide sources list`);
  }
  for (const pin of collectPins(props)) {
    if (pin.cite && !sources.has(String(pin.cite))) {
      errors.push(`${locName} evidence cite "${pin.cite}" is not in the slide sources list`);
    }
  }
  // Soft size caps (diagram-guide.md)
  if (name === "Mermaid") {
    const n = mermaidNodeCount(props.chart);
    if (n > 8) warnings.push(`Mermaid has ${n} nodes; keep it to 8 or fewer`);
    const hasIr = arr(props.nodes).length > 0 || arr(props.edges).length > 0;
    if (!hasIr && !illustrative && looksLikeRepoChart(props.chart)) {
      warnings.push("Mermaid describes a real-repo diagram but has no nodes/edges IR; add IR or set illustrative: true");
    }
  }
  if (name === "FlowSteps" && arr(props.steps).length > 6) {
    warnings.push(`FlowSteps has ${arr(props.steps).length} steps; keep it to 6 or fewer`);
  }
  if (name === "LayeredArchitecture") {
    const layers = arr(props.layers);
    if (layers.length && (layers.length < 3 || layers.length > 6)) {
      warnings.push(`LayeredArchitecture has ${layers.length} layers; use 3–6`);
    }
    for (const layer of layers) {
      const c = arr(layer?.items).length;
      if (c > 5) warnings.push(`LayeredArchitecture layer "${layer?.id || layer?.label}" has ${c} cells; keep it to 5 or fewer`);
    }
  }
  if (name === "Sequence") {
    const ac = arr(props.actors).length;
    const mc = arr(props.messages).length;
    if (ac > 6) warnings.push(`Sequence has ${ac} actors; keep it to 6 or fewer`);
    if (mc > 8) warnings.push(`Sequence has ${mc} messages; keep it to 8 or fewer`);
  }
  if (name === "C4Container") {
    const nodes = arr(props.nodes);
    if (nodes.length > 8) warnings.push(`C4Container has ${nodes.length} boxes; keep it to 8 or fewer`);
    const cols = Number(props.cols) || 3;
    const maxCol = Math.max(cols, ...nodes.map((n) => (n?.col || 1) + (n?.colSpan || 1) - 1), 1);
    const maxRow = Math.max(Number(props.rows) || 0, ...nodes.map((n) => (n?.row || 1) + (n?.rowSpan || 1) - 1), 1);
    if (maxCol > 4 || maxRow > 3) warnings.push(`C4Container grid is ${maxRow}×${maxCol}; keep it to a ≤3×4 grid`);
  }
  const pins = collectPins(props);
  if (pins.some((p) => /^foo\.\w+$/i.test(String(p.path || "").trim()) || /(^|\/)foo\.ts$/i.test(String(p.path || "")))) {
    warnings.push(`${locName} evidence looks invented (foo.ts); use a path you opened or mark illustrative`);
  }
  const evidenced = diagramNodes(name, props).filter((n) => n._kind !== "layer" && nodeHasEvidence(n));
  if (evidenced.length >= 2 && evidenced.every((n) => evidenceList(n).every((e) => Number(e.start) === 1))) {
    warnings.push(`${locName} evidence uses line 1 on every node; confirm the ranges were opened, not guessed`);
  }
  if (stepwiseKind(props.stepwise) === "path" && !arr(props.primary_path).length && name !== "FlowSteps" && name !== "Sequence") {
    warnings.push(`${locName} stepwise is path but primary_path is empty`);
  }
  return { errors, warnings };
}

function jsx(s) {
  return `{${JSON.stringify(s ?? "")}}`;
}

function applyStylePackOverlay(raw) {
  const packPath = join(root, "content", "style-pack.json");
  if (!existsSync(packPath)) return raw;
  let pack;
  try {
    pack = JSON.parse(readFileSync(packPath, "utf8"));
  } catch {
    return raw;
  }
  if (!raw || typeof raw !== "object") return raw;
  const out = { ...raw };
  if (pack.id && !out.style_pack) out.style_pack = pack.id;
  if (pack.themeFile && !out.theme) out.theme = "brand";
  out.slides = (out.slides || []).map((s) => {
    const slide = { ...s };
    for (const [pid, wire] of Object.entries(pack.patterns || {})) {
      if (!(wire.slideTypes || []).includes(slide.type)) continue;
      if (!slide.pattern) slide.pattern = pid;
      if (wire.layout && slide.layout == null) slide.layout = wire.layout;
      if (wire.scrim && slide.scrim == null) slide.scrim = wire.scrim;
      if (wire.background && slide.background == null) slide.background = wire.background;
      if (wire.hero && slide.hero == null) slide.hero = true;
      if (wire.heroLabel && slide.heroLabel == null) slide.heroLabel = wire.heroLabel;
      if (wire.backdrop && slide.backdrop == null) slide.backdrop = wire.backdrop;
      break;
    }
    return slide;
  });
  return out;
}

function loadSpec() {
  if (!existsSync(specPath)) {
    return { ok: false, errors: [`missing ${specPath}`], warnings: [], spec: null };
  }
  let raw;
  try {
    raw = parseYaml(readFileSync(specPath, "utf8"));
  } catch (e) {
    return { ok: false, errors: [`YAML parse error: ${e.message}`], warnings: [], spec: null };
  }
  return validate(applyStylePackOverlay(raw));
}

function validate(raw) {
  const errors = [];
  const warnings = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["root must be a mapping"], warnings, spec: null };
  }
  if (!raw.title || typeof raw.title !== "string") errors.push("title: required string");
  if (!THEMES.has(raw.theme)) errors.push(`theme: must be one of ${[...THEMES].join("|")}`);
  if (typeof raw.approved !== "boolean") errors.push("approved: required boolean (approval gate)");
  if (!Array.isArray(raw.slides) || raw.slides.length === 0) errors.push("slides: non-empty array required");

  const ids = new Set();
  const slides = [];
  (raw.slides || []).forEach((s, i) => {
    const loc = `slides[${i}]`;
    if (!s || typeof s !== "object") {
      errors.push(`${loc}: must be a mapping`);
      return;
    }
    const n = s.n ?? i + 1;
    if (n !== i + 1) warnings.push(`${loc}: n=${n} but array index implies ${i + 1}`);
    if (!s.id || typeof s.id !== "string" || !/^[a-z][a-z0-9-]*$/.test(s.id)) {
      errors.push(`${loc}: id must be kebab-case (got ${JSON.stringify(s.id)})`);
    } else if (ids.has(s.id)) {
      errors.push(`${loc}: duplicate id "${s.id}"`);
    } else {
      ids.add(s.id);
    }
    if (!TYPES.has(s.type)) errors.push(`${loc} (${s.id}): type must be a catalog kind (got ${JSON.stringify(s.type)})`);
    if (!s.title || typeof s.title !== "string") errors.push(`${loc} (${s.id}): title required`);
    else {
      const words = s.title.trim().split(/\s+/).length;
      if (s.type !== "section" && words < 5) warnings.push(`${loc} (${s.id}): title should be a full-sentence takeaway (5+ words)`);
      if (s.type !== "section" && !/[.!?]"?$/.test(s.title.trim())) warnings.push(`${loc} (${s.id}): title should end with punctuation`);
    }
    if (!STATUSES.has(s.status)) errors.push(`${loc} (${s.id}): status must be stub|locked`);
    if (s.layout && !LAYOUTS.has(s.layout)) warnings.push(`${loc} (${s.id}): unknown layout "${s.layout}" (see layout-guide.md)`);
    if (Array.isArray(s.components)) {
      for (const c of s.components) {
        if (!c || typeof c !== "object") {
          warnings.push(`${loc} (${s.id}): components entry should be a single-key map`);
          continue;
        }
        const keys = Object.keys(c);
        if (keys.length !== 1) warnings.push(`${loc} (${s.id}): components entry should have exactly one key`);
        else if (!KNOWN_COMPONENTS.has(keys[0])) warnings.push(`${loc} (${s.id}): unknown component "${keys[0]}"`);
        else if (keys[0] === "EChart") for (const w of echartWarnings(c.EChart)) warnings.push(`${loc} (${s.id}): ${w}`);
        else if (DIAGRAM_COMPONENTS.has(keys[0])) {
          const d = diagramIssues(keys[0], c[keys[0]], s);
          for (const e of d.errors) errors.push(`${loc} (${s.id}): ${e}`);
          for (const w of d.warnings) warnings.push(`${loc} (${s.id}): ${w}`);
        }
      }
      const mermaidComp = s.components.map((c) => c?.Mermaid?.chart).find((ch) => ch != null);
      if (s.mermaid && mermaidComp != null && normalizeMermaid(s.mermaid) !== normalizeMermaid(mermaidComp)) {
        warnings.push(`${loc} (${s.id}): mermaid: string and Mermaid.chart differ`);
      }
      const expected = s.components.flatMap((c) => {
        if (!c || typeof c !== "object") return [];
        const name = Object.keys(c)[0];
        if (!DIAGRAM_COMPONENTS.has(name)) return [];
        const n = expectedStepCount(name, c[name]);
        return n == null ? [] : [{ name, n }];
      });
      if (expected.length && s.steps != null) {
        const match = expected.some((e) => e.n === Number(s.steps));
        if (!match) {
          const desc = expected.map((e) => `${e.name} ${e.n}`).join(", ");
          warnings.push(`${loc} (${s.id}): steps=${s.steps} disagrees with path length/reveal count (${desc})`);
        }
      }
    }
    if (s.status === "locked") {
      const polished = findPolishedFile(s.id);
      if (!polished) warnings.push(`${loc} (${s.id}): status locked but no src/slides/*-${s.id}.tsx (or ${s.id}.tsx) found`);
    }
    slides.push({
      n: i + 1,
      id: s.id,
      type: s.type,
      title: s.title,
      layout: s.layout || defaultLayout(s.type),
      status: s.status,
      kicker: s.kicker || "",
      subtitle: s.subtitle || "",
      background: s.background,
      pattern: s.pattern || null,
      scrim: s.scrim || null,
      hero: !!s.hero,
      heroLabel: s.heroLabel || "",
      backdrop: s.backdrop || null,
      steps: s.steps ?? 0,
      sources: Array.isArray(s.sources) ? s.sources : [],
      notes: s.notes || "",
      body: Array.isArray(s.body) ? s.body.slice(0, 5) : [],
      media: Array.isArray(s.media) ? s.media : [],
      components: Array.isArray(s.components) ? s.components : [],
      chart: s.chart || null,
      code: s.code || null,
      mermaid: s.mermaid || null,
      timeline: s.timeline || null,
      quote: s.quote || null,
    });
  });

  const spec = {
    title: raw.title,
    theme: raw.theme,
    style_pack: raw.style_pack || null,
    audience: raw.audience || "",
    goal: raw.goal || "",
    minutes: raw.minutes,
    approved: !!raw.approved,
    approved_at: raw.approved_at || null,
    version: raw.version ?? 1,
    notes: raw.notes || "",
    slides,
  };
  return { ok: errors.length === 0, errors, warnings, spec };
}

function defaultLayout(type) {
  switch (type) {
    case "big-number":
    case "results":
      return "layout-kpi";
    case "comparison":
      return "layout-compare";
    case "timeline":
      return "layout-timeline-strip";
    case "agenda":
      return "grid-4";
    default:
      return "layout-stack";
  }
}

function findPolishedFile(id) {
  if (!existsSync(slidesDir)) return null;
  const files = readdirSync(slidesDir).filter((f) => f.endsWith(".tsx"));
  const byName = files.find((f) => f === `${id}.tsx` || f.endsWith(`-${id}.tsx`));
  if (byName) return join(slidesDir, byName);
  const needle = `id: "${id}"`;
  const needle2 = `id: '${id}'`;
  for (const f of files) {
    const body = readFileSync(join(slidesDir, f), "utf8");
    if (body.includes(needle) || body.includes(needle2)) return join(slidesDir, f);
  }
  return null;
}

function frameKind(type) {
  if (type === "title" || type === "closing" || type === "section") return type;
  return "content";
}

function jsxExpr(v, { icons } = {}) {
  if (v === undefined) return undefined;
  if (v === null) return "null";
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map((x) => jsxExpr(x, { icons })).join(", ")}]`;
  if (typeof v === "object") {
    const parts = [];
    for (const [k, val] of Object.entries(v)) {
      if (val === undefined || STUB_STRIP.has(k)) continue;
      const key = /^[A-Za-z_][\w]*$/.test(k) ? k : JSON.stringify(k);
      if (k === "icon" && typeof val === "string") {
        if (icons && LUCIDE_ALLOW.has(val)) {
          icons.add(val);
          parts.push(`${key}: ${val}`);
        }
        continue;
      }
      parts.push(`${key}: ${jsxExpr(val, { icons })}`);
    }
    return `{ ${parts.join(", ")} }`;
  }
  return JSON.stringify(String(v));
}

function emitDiagramStub(name, props, i, used) {
  used.components.add(name);
  const icons = used.icons;
  const seen = props && typeof props === "object" ? props : {};
  const parts = [];
  for (const [k, val] of Object.entries(seen)) {
    if (val === undefined || STUB_STRIP.has(k)) continue;
    if (k === "icon" && typeof val === "string") {
      if (LUCIDE_ALLOW.has(val)) {
        icons.add(val);
        parts.push(`icon={${val}}`);
      }
      continue;
    }
    if (k === "stepwise") {
      if (val === true || val === "reveal") parts.push("stepwise");
      else if (val === "path") parts.push(`stepwise="path"`);
      continue;
    }
    if (k === "legend" && val === true) { parts.push("legend"); continue; }
    if (k === "showRelationList" && val === true) { parts.push("showRelationList"); continue; }
    if (k === "highlight" && val === true) { parts.push("highlight"); continue; }
    parts.push(`${k}={${jsxExpr(val, { icons })}}`);
  }
  const propStr = parts.length ? " " + parts.join(" ") : "";
  return `<${name}${propStr} key={${i}} />`;
}

function renderComponentPlaceholder(entry, i, used) {
  const name = Object.keys(entry)[0];
  const props = entry[name] || {};
  switch (name) {
    case "Stat":
      return `<div className="card" key={${i}}>
          <p className="muted" style={{ margin: 0, fontSize: 18 }}>Stat stub</p>
          <p style={{ margin: "4px 0 0", fontSize: 42, fontWeight: 650 }}>{${JSON.stringify(String(props.value ?? "—"))}}${props.suffix ? `{${JSON.stringify(props.suffix)}}` : ""}</p>
          <p className="muted" style={{ margin: 0 }}>{${JSON.stringify(props.label || "")}}</p>
        </div>`;
    case "Mermaid":
    case "LayeredArchitecture":
    case "FlowSteps":
    case "Sequence":
    case "C4Container":
      return emitDiagramStub(name, props, i, used);
    case "BarChart":
    case "EChart":
    case "Code":
    case "Timeline":
    case "Figure":
      return `<div className="card" key={${i}}>
          <p style={{ margin: 0, fontWeight: 600 }}>{${JSON.stringify(name)}}</p>
          <p className="muted" style={{ margin: "6px 0 0", fontSize: 20 }}>Replace this stub with the real component from the approved spec.</p>
        </div>`;
    case "Pill":
      return `<span className="pill" key={${i}}>{${JSON.stringify(props.text || name)}}</span>`;
    case "Card":
      return `<div className="card" key={${i}}>
          <p style={{ margin: 0, fontWeight: 600 }}>{${JSON.stringify(props.title || "Card")}}</p>
        </div>`;
    case "IconList":
      return `<ul className="muted" key={${i}} style={{ fontSize: 26, lineHeight: 1.4 }}>
${(props.items || []).slice(0, 5).map((it) => `          <li>{${JSON.stringify(it.text || "")}}</li>`).join("\n")}
        </ul>`;
    case "Quote":
      return `<blockquote key={${i}} style={{ margin: 0, fontSize: 28 }}>
          <p>{${JSON.stringify(props.text || "")}}</p>
          <footer className="muted">{${JSON.stringify(props.by || "")}}</footer>
        </blockquote>`;
    default:
      return `<p className="muted" key={${i}}>{${JSON.stringify(name + " (stub)")}}</p>`;
  }
}

function renderStub(s, i, used) {
  const kind = frameKind(s.type);
  const layout = s.layout || "layout-stack";
  const bullets = s.body.length
    ? `<ul className="muted" style={{ fontSize: 28, lineHeight: 1.45, margin: 0, paddingLeft: "1.1em" }}>
${s.body.map((b) => `          <li>${jsx(b)}</li>`).join("\n")}
        </ul>`
    : "";
  const comps = s.components.map((c, ci) => renderComponentPlaceholder(c, ci, used)).join("\n        ");
  const media = s.media.slice(0, 2).map((m, mi) =>
    `<p className="muted" key="m${mi}" style={{ fontSize: 20 }}>Media: {${JSON.stringify(m.path || m.src || "")}} — {${JSON.stringify(m.alt || "")}}</p>`
  ).join("\n        ");
  const bg = s.background ? ` background=${jsx(s.background)}` : "";
  const kicker = s.kicker ? ` kicker=${jsx(s.kicker)}` : "";
  const subtitle = s.subtitle ? ` subtitle=${jsx(s.subtitle)}` : "";
  const titleHero = kind === "title" && (s.pattern === "title-hero" || s.hero || s.scrim || s.backdrop);
  const center = !titleHero && (kind === "title" || kind === "closing" || kind === "section") ? " center" : "";
  const heroProp = titleHero ? " hero" : "";
  const scrimProp = titleHero ? ` scrim=${jsx(s.scrim || "light")}` : "";
  const heroLabelProp = titleHero && s.heroLabel ? ` heroLabel=${jsx(s.heroLabel)}` : "";
  let backdropProp = "";
  if (titleHero) {
    const bd = s.backdrop || { src: "/media/title-hero-photo-placeholder.jpg", decorative: true };
    const src = bd.src || bd.path || "/media/title-hero-photo-placeholder.jpg";
    const decorative = bd.decorative !== false && !bd.alt;
    backdropProp = ` backdrop={{ src: ${JSON.stringify(src)}, decorative: ${decorative ? "true" : "false"}${bd.alt ? `, alt: ${JSON.stringify(bd.alt)}` : ""} }}`;
  }
  const notes = s.notes
    ? JSON.stringify(s.notes)
    : JSON.stringify(`Generated from content/deck.spec.yaml (${s.id}) — promote to locked after polish.`);

  if (titleHero) {
    return `const s${i} = defineSlide({
  id: ${JSON.stringify(s.id)},
  steps: ${Number(s.steps) || 0},
  notes: ${notes},
  Component: () => (
    <SlideFrame kind="title"${heroProp}${kicker}
      title=${jsx(s.title)}${subtitle}${bg || ' background="plain"'}${scrimProp}${backdropProp}${heroLabelProp}
      footer={false} />
  ),
});`;
  }

  return `const s${i} = defineSlide({
  id: ${JSON.stringify(s.id)},
  steps: ${Number(s.steps) || 0},
  notes: ${notes},
  Component: () => (
    <SlideFrame kind=${JSON.stringify(kind)}${kicker}
      title=${jsx(s.title)}${subtitle}${bg}${center} footer={${kind !== "title"}}>
      <div className=${JSON.stringify(layout)}>
        ${comps || bullets || `<p className="muted">Stub for type ${s.type}. Refine into src/slides/${String(s.n).padStart(2, "0")}-${s.id}.tsx and set status: locked.</p>`}
        ${media}
      </div>
    </SlideFrame>
  ),
});`;
}

function renderTsx(spec) {
  const stubs = spec.slides.filter((s) => s.status === "stub");
  const used = { components: new Set(), icons: new Set() };
  const blocks = stubs.map((s, i) => renderStub(s, i, used)).join("\n\n");
  const exports = stubs.map((_, i) => `s${i}`).join(", ");
  const diagramImports = [...used.components];
  const frameImports = ["SlideFrame", ...diagramImports].join(", ");
  const lucide = used.icons.size ? `import { ${[...used.icons].join(", ")} } from "lucide-react";\n` : "";
  const imports = stubs.length
    ? `${lucide}import { ${frameImports} } from "../../deck/components";
import { defineSlide, type SlideDef } from "../../deck/types";`
    : `import { type SlideDef } from "../../deck/types";`;
  return `/* AUTO-GENERATED by scripts/spec.mjs from content/deck.spec.yaml — do not edit by hand.
 * Only status:stub slides are included. status:locked slides live in src/slides/NN-id.tsx.
 * See references/deck-spec.md (promote / merge).
 */
${imports}

${blocks || "/* no stub slides */\n"}
/** Stub slides from the design spec. Import into index.ts while iterating; promote to locked files before ship. */
export const specSlides: SlideDef[] = [${exports}];
export const specMeta = ${JSON.stringify({
    title: spec.title,
    theme: spec.theme,
    approved: spec.approved,
    version: spec.version,
    stubCount: stubs.length,
    lockedCount: spec.slides.filter((s) => s.status === "locked").length,
    count: spec.slides.length,
  }, null, 2)} as const;
`;
}

function writeOutline(spec) {
  const lines = [
    `# ${spec.title}`,
    `Theme: ${spec.theme}`,
    "",
    "<!-- Light stub synced from content/deck.spec.yaml (`npm run spec -- --sync-outline`).",
    "     The YAML design spec is the approval artifact; this file is optional for npm run live. -->",
    "",
  ];
  for (const s of spec.slides) {
    lines.push(`## ${s.id} | ${s.kicker || s.type}`);
    lines.push(`Takeaway: ${s.title}`);
    for (const b of s.body) lines.push(`- ${b}`);
    lines.push("");
  }
  writeFileSync(outlinePath, lines.join("\n"));
}

function writeManifest(spec) {
  const manifest = {
    title: spec.title,
    theme: spec.theme,
    approved: spec.approved,
    approved_at: spec.approved_at,
    version: spec.version,
    slides: spec.slides.map((s) => ({
      n: s.n,
      id: s.id,
      type: s.type,
      title: s.title,
      layout: s.layout,
      status: s.status,
      sources: s.sources,
    })),
  };
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
}

function build() {
  const { ok, errors, warnings, spec } = loadSpec();
  for (const w of warnings) console.warn(`WARN  ${w}`);
  for (const e of errors) console.error(`ERROR ${e}`);
  if (!ok) {
    console.error(`spec: ${errors.length} error(s), ${warnings.length} warning(s)`);
    process.exitCode = 1;
    return null;
  }
  if (checkOnly) {
    console.log(`spec: OK (${spec.slides.length} slides, approved=${spec.approved}, ${warnings.length} warning(s))`);
    return spec;
  }
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, renderTsx(spec));
  writeManifest(spec);
  if (syncOutline) writeOutline(spec);
  writeFileSync(join(outDir, ".gitkeep"), "");
  const stubs = spec.slides.filter((s) => s.status === "stub").length;
  const locked = spec.slides.length - stubs;
  console.log(`spec → ${outFile} (${stubs} stubs, ${locked} locked, approved=${spec.approved}, theme=${spec.theme})`);
  if (syncOutline) console.log(`spec → ${outlinePath} (light outline synced)`);
  console.log(`spec → ${manifestFile}`);
  return spec;
}

export { validate, diagramIssues, mermaidNodeCount, expectedStepCount };

const isCli = process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);
if (isCli) {
  const result = build();
  if (watching) {
    if (!existsSync(specPath)) process.exit(1);
    console.log(`watching ${specPath}`);
    let t = null;
    watch(specPath, () => {
      clearTimeout(t);
      t = setTimeout(() => {
        try { build(); } catch (e) { console.error(e); }
      }, 80);
    });
  } else if (result === null && checkOnly) {
    process.exit(1);
  }
}
