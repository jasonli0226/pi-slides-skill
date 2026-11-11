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
  "Icon", "Stagger", "Appear", "Gradient", "Cite", "DiagramLegend", "EChart", "SplineScene",
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
        else if (keys[0] === "SplineScene") {
          const sp = c.SplineScene || {};
          if (!sp.poster) warnings.push(`${loc} (${s.id}): SplineScene needs a local \`poster\` image under /media/`);
          if (!/^https:\/\/my\.spline\.design\//.test(String(sp.src || ""))) warnings.push(`${loc} (${s.id}): SplineScene src must be the scene's public https://my.spline.design/… URL from the user`);
          if (!["title", "closing", "section"].includes(s.type)) warnings.push(`${loc} (${s.id}): keep SplineScene to title, closing or hero slides`);
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

function renderComponentPlaceholder(entry, i) {
  const name = Object.keys(entry)[0];
  const props = entry[name] || {};
  switch (name) {
    case "Stat":
      return `<div className="card" key={${i}}>
          <p className="muted" style={{ margin: 0, fontSize: 18 }}>Stat stub</p>
          <p style={{ margin: "4px 0 0", fontSize: 42, fontWeight: 650 }}>{${JSON.stringify(String(props.value ?? "—"))}}${props.suffix ? `{${JSON.stringify(props.suffix)}}` : ""}</p>
          <p className="muted" style={{ margin: 0 }}>{${JSON.stringify(props.label || "")}}</p>
        </div>`;
    case "BarChart":
    case "EChart":
    case "SplineScene":
    case "Mermaid":
    case "LayeredArchitecture":
    case "FlowSteps":
    case "Sequence":
    case "C4Container":
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

function renderStub(s, i) {
  const kind = frameKind(s.type);
  const layout = s.layout || "layout-stack";
  const bullets = s.body.length
    ? `<ul className="muted" style={{ fontSize: 28, lineHeight: 1.45, margin: 0, paddingLeft: "1.1em" }}>
${s.body.map((b) => `          <li>${jsx(b)}</li>`).join("\n")}
        </ul>`
    : "";
  const comps = s.components.map((c, ci) => renderComponentPlaceholder(c, ci)).join("\n        ");
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
  const blocks = stubs.map((s, i) => renderStub(s, i)).join("\n\n");
  const exports = stubs.map((_, i) => `s${i}`).join(", ");
  const imports = stubs.length
    ? `import { SlideFrame } from "../../deck/components";
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
