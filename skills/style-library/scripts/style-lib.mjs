#!/usr/bin/env node
/**
 * style-lib — save / list / apply / update / show named style packs.
 *
 * Pack search order: $STYLE_LIBRARY_DIR → ~/.pi/agent/style-library/styles → <skill>/styles
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(__dirname, "..");
const REPO_STYLES = path.join(SKILL_ROOT, "styles");
const USER_STYLES = path.join(os.homedir(), ".pi", "agent", "style-library", "styles");
const TODAY = new Date().toISOString().slice(0, 10);

const BUILTIN_PATTERNS = {
  "title-hero": {
    kind: "layout",
    md: `# Pattern: title-hero (light left scrim)

Use for the opening slide when the backdrop is a photo, mesh, or illustration.

## Structure

1. \`SlideFrame\` with \`titleHero\`, \`backdrop\` (image URL or import), \`scrim="light"\` (or \`"dark"\` on bright photos), optional \`heroLabel\`.
2. Left-aligned kicker → hero title → subtitle. Keep copy in the left ~45–55% (scrim zone).
3. Prefer \`safe\` margins; avoid absolute-spam for title text (use frame slots).

## Lint

- Light scrim + dark text: contrast is checked as-if on white.
- Dark scrim + light text: normal dark-theme contrast.
- Do not place KPIs or dense body on the title hero; use a following slide.

## Media

Generate or use a cleared placeholder. Do not commit uncleared third-party photos.
`,
    css: `/* Reference — already in template deck.css; do not duplicate into brand.css */
.frame-title-hero { /* left copy, full-bleed backdrop via .title-backdrop */ }
.title-scrim-light {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.92) 0%,
    rgba(255, 255, 255, 0.78) 42%,
    rgba(255, 255, 255, 0.15) 62%,
    transparent 78%
  );
}
.title-scrim-dark {
  background: linear-gradient(
    90deg,
    rgba(6, 10, 20, 0.88) 0%,
    rgba(6, 10, 20, 0.55) 45%,
    transparent 72%
  );
}
`,
    tsx: `import airport from "../assets/title-hero.jpg"; // cleared asset or generated placeholder

export function TitleSlide() {
  return (
    <SlideFrame
      titleHero
      backdrop={airport}
      scrim="light"
      kicker="Operations · 2026"
      title="Gate to gate, one glance"
      subtitle="Live turns, bag flow, and crew status — without the wall of screens."
      heroLabel="Hub overview"
    />
  );
}
`,
  },
  kpi: {
    kind: "layout",
    md: `# Pattern: kpi

Row of 3–4 metric cards. Use \`layout-kpi\` (flex) — not a grid of absolute boxes.

## Structure

\`\`\`tsx
<div className="layout-kpi">
  <Kpi label="NPS" value="72" delta="+4" />
  <Kpi label="Uptime" value="99.95%" />
  <Kpi label="Seats" value="1.2M" delta="QoQ" />
</div>
\`\`\`

## Lint

- One idea per card; avoid wrapping long sentences inside KPI values.
- Pair with a short slide title; do not stack two KPI rows without \`layout-stack\`.
`,
    css: `/* Reference — template deck.css */
.layout-kpi { display: flex; gap: var(--space-4); align-items: stretch; min-width: 0; }
.layout-kpi > * { flex: 1 1 0; min-width: 0; }
`,
    tsx: `<div className="layout-kpi">
  <Kpi label="Pipeline" value="$4.2M" delta="+18%" />
  <Kpi label="Win rate" value="32%" delta="+3pp" />
  <Kpi label="Cycle" value="14d" delta="-2d" />
</div>
`,
  },
  timeline: {
    kind: "layout",
    md: `# Pattern: timeline

Horizontal strip of phases. Use \`layout-timeline-strip\` or stacked milestone cards.

## Structure

3–5 steps max. Each step: phase label, title, one-line outcome. Prefer equal flex children over absolute positions.
`,
    css: `/* Reference — template deck.css */
.layout-timeline-strip { display: flex; gap: var(--space-3); align-items: stretch; }
.layout-timeline-strip > * { flex: 1 1 0; min-width: 0; }
`,
    tsx: `<div className="layout-timeline-strip">
  <Milestone phase="Q1" title="Discover" body="Jobs-to-be-done + risk map" />
  <Milestone phase="Q2" title="Build" body="Thin slice in production" />
  <Milestone phase="Q3" title="Scale" body="Rollout + enablement" />
</div>
`,
  },
  compare: {
    kind: "layout",
    md: `# Pattern: compare

Two-column before/after or us/them. Use \`layout-compare\` or a 2-col grid; keep column titles parallel.
`,
    css: `/* Prefer template compare / two-col utilities; keep gutters ≥ var(--space-4). */\n`,
    tsx: `<div className="layout-compare">
  <div><h3>Before</h3><ul>…</ul></div>
  <div><h3>After</h3><ul>…</ul></div>
</div>
`,
  },
  bento: {
    kind: "layout",
    md: `# Pattern: bento

Asymmetric card mosaic. One hero cell + supporting cells. Do not nest absolute children for text.
`,
    css: `/* Use template bento / grid utilities; hero cell span 2. */\n`,
    tsx: `<div className="layout-bento">
  <Card className="span-2">Hero point</Card>
  <Card>Support A</Card>
  <Card>Support B</Card>
</div>
`,
  },
};

function die(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) out[key] = true;
      else {
        out[key] = next;
        i++;
      }
    } else out._.push(a);
  }
  return out;
}

function styleRoots() {
  const roots = [];
  if (process.env.STYLE_LIBRARY_DIR) {
    roots.push({ label: "env", dir: path.resolve(process.env.STYLE_LIBRARY_DIR) });
  }
  roots.push({ label: "user", dir: USER_STYLES });
  roots.push({ label: "repo", dir: REPO_STYLES });
  return roots;
}

function listPackDirs() {
  /** @type {Map<string, { id: string, dir: string, label: string }>} */
  const map = new Map();
  // Lower priority first so higher overwrites
  for (const { label, dir } of [...styleRoots()].reverse()) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const packDir = path.join(dir, name);
      const meta = path.join(packDir, "pack.json");
      if (fs.statSync(packDir).isDirectory() && fs.existsSync(meta)) {
        map.set(name, { id: name, dir: packDir, label });
      }
    }
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function readPack(id) {
  const found = listPackDirs().find((p) => p.id === id);
  if (!found) return null;
  const json = JSON.parse(fs.readFileSync(path.join(found.dir, "pack.json"), "utf8"));
  return { ...found, json };
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeFile(p, body) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, body);
}

function extractThemeBlock(tokensCss, themeName) {
  const needle = `[data-theme="${themeName}"]`;
  const start = tokensCss.indexOf(needle);
  if (start < 0) return null;
  // find matching closing brace for the block
  let i = tokensCss.indexOf("{", start);
  if (i < 0) return null;
  let depth = 0;
  for (let j = i; j < tokensCss.length; j++) {
    const c = tokensCss[j];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        const block = tokensCss.slice(start, j + 1);
        return block.replace(needle, '[data-theme="brand"]');
      }
    }
  }
  return null;
}

function captureBrandCss(deckDir, themeOpt) {
  const brandPath = path.join(deckDir, "src", "theme", "brand.css");
  const tokensPath = path.join(deckDir, "src", "theme", "tokens.css");
  // Explicit --theme <preset> always extracts from tokens.css (even if brand.css exists).
  if (typeof themeOpt === "string" && themeOpt !== "brand") {
    if (!fs.existsSync(tokensPath)) die(`No tokens.css under ${deckDir}/src/theme`);
    const tokens = fs.readFileSync(tokensPath, "utf8");
    const block = extractThemeBlock(tokens, themeOpt);
    if (!block) die(`Theme "${themeOpt}" not found in ${tokensPath}`);
    return `/* extracted from tokens.css [${themeOpt}] → brand */\n${block}\n`;
  }
  if (fs.existsSync(brandPath)) {
    const body = fs.readFileSync(brandPath, "utf8");
    if (/\[data-theme=["']brand["']\]/.test(body)) return body;
    // Comment-only stub — fall through to tokens if possible
  }
  if (!fs.existsSync(tokensPath)) {
    if (fs.existsSync(brandPath)) return fs.readFileSync(brandPath, "utf8");
    die(`No brand.css or tokens.css under ${deckDir}/src/theme`);
  }
  const tokens = fs.readFileSync(tokensPath, "utf8");
  const brandBlock = extractThemeBlock(tokens, "brand");
  if (brandBlock) return `/* extracted from tokens.css */\n${brandBlock}\n`;
  if (fs.existsSync(brandPath)) return fs.readFileSync(brandPath, "utf8");
  die(`No [data-theme="brand"] in tokens.css. Pass --theme <preset> (e.g. navy-pitch).`);
}

function writePatterns(packDir, patternIds) {
  const patternsMeta = [];
  const pdir = path.join(packDir, "patterns");
  ensureDir(pdir);
  for (const id of patternIds) {
    const builtin = BUILTIN_PATTERNS[id];
    if (!builtin) {
      console.warn(`warn: unknown pattern "${id}" — writing stub md only`);
      const stub = `# Pattern: ${id}\n\nDescribe how to reuse this pattern with web-slides primitives.\n`;
      writeFile(path.join(pdir, `${id}.md`), stub);
      patternsMeta.push({ id, kind: "layout", files: [`patterns/${id}.md`] });
      continue;
    }
    const files = [];
    writeFile(path.join(pdir, `${id}.md`), builtin.md);
    files.push(`patterns/${id}.md`);
    if (builtin.css) {
      writeFile(path.join(pdir, `${id}.css.snippet`), builtin.css);
      files.push(`patterns/${id}.css.snippet`);
    }
    if (builtin.tsx) {
      writeFile(path.join(pdir, `${id}.tsx.snippet`), builtin.tsx);
      files.push(`patterns/${id}.tsx.snippet`);
    }
    patternsMeta.push({ id, kind: builtin.kind, files });
  }
  return patternsMeta;
}

function parsePatternList(raw) {
  if (!raw || raw === true) return [];
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function destDirFor(dest) {
  if (dest === "user") return USER_STYLES;
  if (dest === "repo") return REPO_STYLES;
  if (dest && dest !== true) return path.resolve(dest);
  if (process.env.STYLE_LIBRARY_DIR) return path.resolve(process.env.STYLE_LIBRARY_DIR);
  return REPO_STYLES;
}

function cmdList() {
  const packs = listPackDirs();
  if (!packs.length) {
    console.log("(no packs found)");
    console.log(`Searched: ${styleRoots().map((r) => r.dir).join(" | ")}`);
    return;
  }
  for (const p of packs) {
    const j = JSON.parse(fs.readFileSync(path.join(p.dir, "pack.json"), "utf8"));
    const tags = (j.tags || []).join(", ");
    console.log(`${j.id}\t${j.name || ""}\t[${p.label}]\t${tags}\t${p.dir}`);
  }
}

function cmdShow(args) {
  const id = args.id;
  if (!id || id === true) die("show requires --id <pack-id>");
  const pack = readPack(id);
  if (!pack) die(`pack not found: ${id}`);
  console.log(JSON.stringify(pack.json, null, 2));
  console.log(`\npath: ${pack.dir} (${pack.label})`);
  const files = fs.readdirSync(pack.dir, { recursive: true }).filter((f) => {
    const full = path.join(pack.dir, f);
    return fs.statSync(full).isFile();
  });
  console.log("files:\n  " + files.join("\n  "));
}

function cmdSave(args, { isUpdate = false } = {}) {
  const id = args.id;
  if (!id || id === true) die("save/update requires --id <pack-id>");
  if (!/^[a-z0-9-]+$/.test(id)) die(`invalid id "${id}" — use kebab-case [a-z0-9-]`);
  const from = args.from;
  if (!from || from === true) die("save/update requires --from <deck-dir>");
  const deckDir = path.resolve(from);
  if (!fs.existsSync(deckDir)) die(`deck not found: ${deckDir}`);

  const existing = readPack(id);
  if (isUpdate) {
    if (!existing) die(`pack not found for update: ${id}`);
  } else if (existing && existing.label === (args.dest || "repo")) {
    die(`pack already exists at ${existing.dir} — use update, or choose another --id`);
  }

  const destRoot = isUpdate ? path.dirname(existing.dir) : destDirFor(typeof args.dest === "string" ? args.dest : undefined);
  const packDir = isUpdate ? existing.dir : path.join(destRoot, id);
  ensureDir(packDir);

  const patternsOnly = !!args["patterns-only"];
  const themeOnly = !!args["theme-only"];
  let themeMeta = null;
  if (!patternsOnly) {
    try {
      const css = captureBrandCss(deckDir, args.theme);
      writeFile(path.join(packDir, "brand.css"), css);
      themeMeta = { file: "brand.css", selector: '[data-theme="brand"]' };
    } catch (e) {
      if (!args.patterns) throw e;
      console.warn(`warn: theme capture skipped: ${e.message || e}`);
    }
  }

  let patternsMeta = isUpdate && existing?.json?.patterns ? existing.json.patterns : [];
  const plist = parsePatternList(args.patterns);
  if (!themeOnly && plist.length) {
    patternsMeta = writePatterns(packDir, plist);
  } else if (!isUpdate && !themeOnly && !plist.length && !themeMeta) {
    die("nothing to save — provide brand/theme and/or --patterns");
  }

  const prev = existing?.json || {};
  const packJson = {
    id,
    name: typeof args.name === "string" ? args.name : prev.name || id,
    version: prev.version || "1.0.0",
    description:
      typeof args.description === "string"
        ? args.description
        : prev.description || `Style pack ${id}`,
    created: prev.created || TODAY,
    updated: TODAY,
    tags: typeof args.tags === "string" ? parsePatternList(args.tags) : prev.tags || [],
    source: {
      kind: "web-slides-deck",
      path: (() => {
        const cwd = process.cwd();
        if (deckDir.startsWith(cwd + path.sep)) return path.relative(cwd, deckDir);
        return deckDir;
      })(),
      note: "Original CSS/TSX snapshot — no third-party PPTX vendored.",
    },
    theme: patternsOnly ? null : themeMeta || prev.theme || null,
    patterns: themeOnly ? prev.patterns || [] : patternsMeta,
  };
  writeFile(path.join(packDir, "pack.json"), JSON.stringify(packJson, null, 2) + "\n");
  if (!fs.existsSync(path.join(packDir, "README.md"))) {
    writeFile(
      path.join(packDir, "README.md"),
      `# ${packJson.name}\n\n${packJson.description}\n\nId: \`${id}\`\n`,
    );
  }
  console.log(`${isUpdate ? "updated" : "saved"} ${id} → ${packDir}`);
}

function setThemeBrandInIndex(deckDir) {
  const indexPath = path.join(deckDir, "src", "slides", "index.ts");
  if (!fs.existsSync(indexPath)) return false;
  let src = fs.readFileSync(indexPath, "utf8");
  if (/theme:\s*["']brand["']/.test(src)) return false;
  if (/theme:\s*["'][^"']+["']/.test(src)) {
    src = src.replace(/theme:\s*["'][^"']+["']/, 'theme: "brand"');
    fs.writeFileSync(indexPath, src);
    return true;
  }
  return false;
}

function cmdApply(args) {
  const id = args.id;
  if (!id || id === true) die("apply requires --id <pack-id>");
  const deck = args.deck;
  if (!deck || deck === true) die("apply requires --deck <deck-dir>");
  const deckDir = path.resolve(deck);
  if (!fs.existsSync(deckDir)) die(`deck not found: ${deckDir}`);
  const pack = readPack(id);
  if (!pack) die(`pack not found: ${id}`);

  const patternsOnly = !!args["patterns-only"];
  const themeOnly = !!args["theme-only"];

  if (!patternsOnly && pack.json.theme?.file) {
    const src = path.join(pack.dir, pack.json.theme.file);
    if (!fs.existsSync(src)) die(`missing ${src}`);
    const dest = path.join(deckDir, "src", "theme", "brand.css");
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    console.log(`wrote ${dest}`);
    if (setThemeBrandInIndex(deckDir)) {
      console.log(`set theme: "brand" in src/slides/index.ts`);
    }
  } else if (!patternsOnly) {
    console.log("(pack has no theme — skipped brand.css)");
  }

  if (!themeOnly && (pack.json.patterns || []).length) {
    const out = path.join(deckDir, "style-import", `pack-${id}`);
    ensureDir(out);
    for (const pat of pack.json.patterns) {
      for (const rel of pat.files || []) {
        const from = path.join(pack.dir, rel);
        if (!fs.existsSync(from)) continue;
        const to = path.join(out, path.basename(rel));
        fs.copyFileSync(from, to);
      }
    }
    // also copy pack.json for traceability
    fs.copyFileSync(path.join(pack.dir, "pack.json"), path.join(out, "pack.json"));
    console.log(`patterns → ${out}`);
  }

  console.log("\nNext: cd", deckDir, "&& npm run check:tokens && npm run review");
  console.log("Wire patterns from style-import/pack-" + id + "/ into your slides.");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  if (!cmd) {
    console.log(`Usage:
  style-lib.mjs list
  style-lib.mjs show  --id <pack-id>
  style-lib.mjs save  --id <pack-id> --from <deck-dir> [--name "..."] [--theme <preset>] [--patterns a,b] [--dest repo|user]
  style-lib.mjs update --id <pack-id> --from <deck-dir> [--patterns a,b]
  style-lib.mjs apply --id <pack-id> --deck <deck-dir> [--patterns-only] [--theme-only]`);
    process.exit(0);
  }
  switch (cmd) {
    case "list":
      cmdList();
      break;
    case "show":
      cmdShow(args);
      break;
    case "save":
      cmdSave(args, { isUpdate: false });
      break;
    case "update":
      cmdSave(args, { isUpdate: true });
      break;
    case "apply":
      cmdApply(args);
      break;
    default:
      die(`unknown command: ${cmd}`);
  }
}

main();
