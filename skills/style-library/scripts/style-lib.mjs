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


const PATTERN_WIRE = {
  "title-hero": {
    slideTypes: ["title"],
    layout: "layout-stack",
    background: "plain",
    scrim: "light",
    hero: true,
    center: false,
    backdrop: {
      src: "/media/title-hero-photo-placeholder.jpg",
      decorative: true,
    },
    heroLabel: "Proposal for discussion",
  },
  kpi: {
    slideTypes: ["big-number", "results"],
    layout: "layout-kpi",
  },
  timeline: {
    slideTypes: ["timeline"],
    layout: "layout-timeline-strip",
  },
  compare: {
    slideTypes: ["comparison"],
    layout: "layout-compare",
  },
  bento: {
    slideTypes: ["content", "agenda"],
    layout: "layout-bento",
  },
};

function writeStylePackManifest(deckDir, pack, { patternsOnly = false } = {}) {
  const patterns = {};
  for (const p of pack.json.patterns || []) {
    const wire = PATTERN_WIRE[p.id];
    if (wire) patterns[p.id] = { ...wire, packPatternId: p.id };
  }
  const manifest = {
    id: pack.json.id,
    name: pack.json.name || pack.json.id,
    appliedAt: new Date().toISOString(),
    themeFile: patternsOnly ? null : pack.json.theme?.file || null,
    patterns,
    sourcePackDir: (() => {
      const cwd = process.cwd();
      if (pack.dir.startsWith(cwd + path.sep)) return path.relative(cwd, pack.dir);
      return pack.dir;
    })(),
  };
  const out = path.join(deckDir, "content", "style-pack.json");
  ensureDir(path.dirname(out));
  writeFile(out, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`wrote ${out}`);
  return manifest;
}

function patchDeckSpecYaml(deckDir, pack, manifest) {
  const specPath = path.join(deckDir, "content", "deck.spec.yaml");
  if (!fs.existsSync(specPath)) {
    console.log("(no content/deck.spec.yaml — skipped YAML wire)");
    return false;
  }
  let yaml = fs.readFileSync(specPath, "utf8");
  const hasTheme = !!manifest.themeFile;
  if (hasTheme) {
    if (/^theme:\s*\S+/m.test(yaml)) yaml = yaml.replace(/^theme:\s*\S+/m, "theme: brand");
    else yaml = `theme: brand\n` + yaml;
  }
  if (/^style_pack:\s*/m.test(yaml)) {
    yaml = yaml.replace(/^style_pack:\s*.*$/m, `style_pack: ${pack.json.id}`);
  } else if (/^theme:\s*\S+/m.test(yaml)) {
    yaml = yaml.replace(/^(theme:\s*\S+)/m, `$1\nstyle_pack: ${pack.json.id}`);
  } else {
    yaml = `style_pack: ${pack.json.id}\n` + yaml;
  }

  // Split into deck preamble + slide chunks (each starting with "- n:")
  const slideStart = yaml.search(/^\s*-\s*n:\s*\d+/m);
  if (slideStart < 0) {
    fs.writeFileSync(specPath, yaml);
    console.log(`patched ${specPath} (deck fields only)`);
    return true;
  }
  const head = yaml.slice(0, slideStart);
  const rest = yaml.slice(slideStart);
  const chunks = rest.split(/(?=^\s*-\s*n:\s*\d+)/m).filter(Boolean);
  const wired = chunks.map((chunk) => {
    const typeMatch = chunk.match(/^\s*type:\s*(\S+)\s*$/m);
    if (!typeMatch) return chunk;
    const type = typeMatch[1];
    let wire = null;
    for (const [pid, w] of Object.entries(manifest.patterns || {})) {
      if ((w.slideTypes || []).includes(type)) {
        wire = { ...w, packPatternId: pid };
        break;
      }
    }
    if (!wire) return chunk;
    let body = chunk;
    const setLine = (key, value, { object = false } = {}) => {
      const re = new RegExp(`^(\\s*)${key}:\\s*[\\s\\S]*?(?=^\\s*[a-zA-Z_#-]|$)`, "m");
      // simpler single-line keys
      const lineRe = new RegExp(`^(\\s*)${key}:\\s*.*$`, "m");
      if (object) return; // handled separately
      if (lineRe.test(body)) body = body.replace(lineRe, `$1${key}: ${value}`);
      else {
        // insert after type:
        body = body.replace(/^(\s*type:\s*\S+\s*)$/m, `$1\n$1`.replace(/type:\s*\S+/, `${key}: ${value}`));
        // The above is wrong — do explicit indent from type line
        body = chunk; // reset on first call mishap — use cleaner approach below
      }
    };
    void setLine;
    const typeLine = body.match(/^(\s*)type:\s*\S+\s*$/m);
    const ind = typeLine ? typeLine[1] : "    ";
    const upsert = (key, valueLines) => {
      // remove existing key (single-line or block starting at key)
      const blockRe = new RegExp(`^${ind}${key}:\\s*(?:\\|.*)?\\n(?:${ind}  .*\\n)*`, "m");
      const lineRe = new RegExp(`^${ind}${key}:\\s*.*\\n?`, "m");
      if (blockRe.test(body)) body = body.replace(blockRe, "");
      else if (lineRe.test(body)) body = body.replace(lineRe, "");
      // insert after type line
      body = body.replace(
        new RegExp(`^(${ind}type:\\s*\\S+\\s*)$`, "m"),
        `$1\n${valueLines.map((l) => (l.startsWith(ind) ? l : ind + l)).join("\n")}`,
      );
    };
    upsert("pattern", [`pattern: ${wire.packPatternId}`]);
    if (wire.layout) upsert("layout", [`layout: ${wire.layout}`]);
    if (wire.scrim) {
      upsert("scrim", [`scrim: ${wire.scrim}`]);
      if (wire.background) upsert("background", [`background: ${wire.background}`]);
      if (wire.hero) upsert("hero", [`hero: true`]);
      if (wire.heroLabel) upsert("heroLabel", [`heroLabel: ${JSON.stringify(wire.heroLabel)}`]);
      if (wire.backdrop?.src) {
        upsert("backdrop", [
          "backdrop:",
          `  src: ${wire.backdrop.src}`,
          ...(wire.backdrop.decorative ? ["  decorative: true"] : []),
        ]);
      }
    } else if (wire.layout) {
      // kpi/timeline etc. — layout already upserted
    }
    return body;
  });
  fs.writeFileSync(specPath, head + wired.join(""));
  console.log(`patched ${specPath}`);
  return true;
}

function findSlideFiles(deckDir, idHint) {
  const dir = path.join(deckDir, "src", "slides");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => path.join(dir, f))
    .filter((full) => {
      const body = fs.readFileSync(full, "utf8");
      if (idHint && (body.includes(`id: "${idHint}"`) || body.includes(`id: '${idHint}'`))) return true;
      if (idHint && path.basename(full).includes(idHint)) return true;
      return false;
    });
}

function wireTitleHeroSlide(filePath, wire) {
  let src = fs.readFileSync(filePath, "utf8");
  if (/scrim=/.test(src) && /backdrop=/.test(src) && /hero(?:Label)?=/.test(src)) {
    console.log(`title hero already wired: ${filePath}`);
    return false;
  }
  // Ensure hero + scrim + backdrop on SlideFrame opening tag for kind="title"
  if (!/kind=\{?"title"\}?/.test(src) && !/kind="title"/.test(src)) {
    return false;
  }
  // Remove legacy center prop on the title SlideFrame tag only (not text content)
  src = src.replace(/<SlideFrame\b[^>]*>/, (tag) =>
    // Skip quoted / braced attribute values so only a bare `center` prop matches.
    tag.replace(/("[^"]*"|'[^']*'|\{[^}]*\})|\s+center(?:=\{true\})?(?=[\s/>])/g, (m, value) => value ?? ""),
  );
  if (!/hero(?:\s|=|\/|>)/.test(src)) {
    src = src.replace(/<SlideFrame([^>]*)kind="title"/, '<SlideFrame$1kind="title"\n      hero');
  }
  if (!/scrim=/.test(src)) {
    src = src.replace(
      /<SlideFrame([\s\S]*?)(\s*\/?>)/,
      (m, mid, end) => `<SlideFrame${mid}\n      scrim="${wire.scrim || "light"}"${end}`,
    );
  }
  if (!/backdrop=/.test(src)) {
    const bd = wire.backdrop || PATTERN_WIRE["title-hero"].backdrop;
    const snippet = `backdrop={{\n        src: "${bd.src}",\n        decorative: ${bd.decorative ? "true" : "false"},\n      }}`;
    src = src.replace(/scrim="[^"]*"/, (m) => `${m}\n      ${snippet}`);
  }
  if (!/background=/.test(src) && wire.background) {
    src = src.replace(/scrim="/, `background="${wire.background}"\n      scrim="`);
  }
  if (!/heroLabel=/.test(src) && wire.heroLabel) {
    src = src.replace(
      /subtitle=\{?/,
      (m) => `heroLabel="${wire.heroLabel}"\n      ${m}`,
    );
    if (!/heroLabel=/.test(src)) {
      // subtitle might be string prop
      src = src.replace(
        /subtitle="[^"]*"/,
        (m) => `${m}\n      heroLabel="${wire.heroLabel}"`,
      );
    }
  }
  // Prefer footer={false} on title heroes
  if (!/footer=\{false\}/.test(src)) {
    src = src.replace(/footer=\{true\}/, "footer={false}");
  }
  fs.writeFileSync(filePath, src);
  console.log(`wired title-hero → ${filePath}`);
  return true;
}

function wireLayoutClassInSlide(filePath, layoutClass) {
  let src = fs.readFileSync(filePath, "utf8");
  if (src.includes(`className="${layoutClass}"`) || src.includes(`className={'${layoutClass}'}`)) {
    return false;
  }
  // Prefer replacing known layout-* classNames
  if (/className="layout-[a-z0-9-]+"/.test(src)) {
    src = src.replace(/className="layout-[a-z0-9-]+"/, `className="${layoutClass}"`);
    fs.writeFileSync(filePath, src);
    console.log(`wired layout ${layoutClass} → ${filePath}`);
    return true;
  }
  if (/className="grid-\d+"/.test(src) && layoutClass.startsWith("layout-")) {
    src = src.replace(/className="grid-\d+"/, `className="${layoutClass}"`);
    fs.writeFileSync(filePath, src);
    console.log(`wired layout ${layoutClass} → ${filePath}`);
    return true;
  }
  return false;
}

function wirePatternSlides(deckDir, manifest) {
  let changes = 0;
  for (const [pid, wire] of Object.entries(manifest.patterns || {})) {
    if (pid === "title-hero") {
      const files = [
        ...findSlideFiles(deckDir, "title"),
        path.join(deckDir, "src", "slides", "01-title.tsx"),
      ].filter((f, i, a) => f && fs.existsSync(f) && a.indexOf(f) === i);
      for (const f of files) {
        if (wireTitleHeroSlide(f, wire)) changes++;
      }
      continue;
    }
    for (const type of wire.slideTypes || []) {
      // map type to common file names
      const hints = [type, type.replace(/-/g, "")];
      if (type === "big-number") hints.push("contrast-floor", "results");
      if (type === "timeline") hints.push("workflow");
      if (type === "comparison") hints.push("compare");
      for (const h of hints) {
        for (const f of findSlideFiles(deckDir, h)) {
          if (wire.layout && wireLayoutClassInSlide(f, wire.layout)) changes++;
        }
      }
    }
  }
  // Always write a generated pack wiring module agents can import
  const genDir = path.join(deckDir, "src", "slides", "generated");
  ensureDir(genDir);
  const lines = [
    "/* AUTO-GENERATED by style-lib apply — pattern wiring hints for the deck build.",
    " * Prefer promoting these recipes into locked slides; do not treat as final content.",
    " */",
    `export const appliedStylePack = ${JSON.stringify({ id: manifest.id, patterns: Object.keys(manifest.patterns || {}) }, null, 2)} as const;`,
    "",
  ];
  writeFile(path.join(genDir, "from-pack.ts"), lines.join("\n"));
  console.log(`wrote ${path.join(genDir, "from-pack.ts")}`);
  return changes;
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
  const noWire = !!args["no-wire"];

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

  let manifest = null;
  if (!themeOnly) {
    manifest = writeStylePackManifest(deckDir, pack, { patternsOnly });
    if (!noWire) {
      patchDeckSpecYaml(deckDir, pack, manifest);
      const n = wirePatternSlides(deckDir, manifest);
      console.log(`wired ${n} slide file change(s)`);
    }
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
    fs.copyFileSync(path.join(pack.dir, "pack.json"), path.join(out, "pack.json"));
    const wireMd = [
      `# Applied pack \`${id}\``,
      "",
      "Theme and pattern recipes were wired into the deck build:",
      "",
      "- `src/theme/brand.css` (if pack has a theme)",
      "- `content/style-pack.json` (machine-readable apply manifest)",
      "- `content/deck.spec.yaml` (`style_pack`, per-slide `pattern` / `layout` / title-hero fields)",
      "- matching `src/slides/*.tsx` layout / title-hero props when files exist",
      "- `src/slides/generated/from-pack.ts`",
      "",
      "Run `npm run spec` to regenerate stubs from the patched YAML, then polish.",
      "Recipes also copied below for reference.",
      "",
    ].join("\n");
    writeFile(path.join(out, "WIRE.md"), wireMd);
    console.log(`patterns → ${out}`);
  }

  console.log("\nNext: cd", deckDir, "&& npm run spec && npm run check:tokens && npm run review");
  console.log("Then run the slide-reviewer critique before export:pdf.");
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
  style-lib.mjs apply --id <pack-id> --deck <deck-dir> [--patterns-only] [--theme-only] [--no-wire]`);
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
