#!/usr/bin/env node
// Create a new deck project from the template.
// Usage: node <skill>/scripts/new-deck.mjs <target-dir> --title "Deck title" [--theme midnight|aurora|paper] [--keep-examples]
// Default: copies the engine + theme, and replaces the example slides with a single title slide.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const get = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const target = argv.find((a, i) => !a.startsWith("--") && !["--title", "--theme"].includes(argv[i - 1]));
if (!target) { console.error("usage: new-deck.mjs <target-dir> --title \"...\" [--theme midnight] [--keep-examples]"); process.exit(2); }
const title = get("--title");
const theme = get("--theme", "midnight");
const dest = resolve(target);
if (existsSync(dest) && readdirSync(dest).length) { console.error(`refusing: ${dest} exists and is not empty`); process.exit(2); }

const tpl = join(dirname(fileURLToPath(import.meta.url)), "..", "template");
const skip = new Set(["node_modules", "dist", "review", "export", "style-import"]);
mkdirSync(dest, { recursive: true });
cpSync(tpl, dest, { recursive: true, filter: (src) => !skip.has(src.split(/[\\/]/).pop()) });

if (!argv.includes("--keep-examples")) {
  if (!title) { console.error("--title is required unless --keep-examples"); process.exit(2); }
  const slides = join(dest, "src/slides");
  rmSync(slides, { recursive: true, force: true });
  mkdirSync(slides);
  // JSON.stringify gives a valid JS string literal; in JSX it goes inside {} (attribute strings have no escapes).
  const lit = (s) => JSON.stringify(s);
  writeFileSync(join(slides, "sources.ts"), `import type { SourceRef } from "../deck/types";

/** Bibliography for this deck. Every number, chart and quote must cite one of these ids.
 *  Add entries only from sources you actually opened. */
export const S = {
} satisfies Record<string, SourceRef>;

export const allSources: SourceRef[] = Object.values(S);
`);
  writeFileSync(join(slides, "01-title.tsx"), `import { SlideFrame } from "../deck/components";
import { defineSlide } from "../deck/types";

export default defineSlide({
  id: "title",
  transition: "blur",
  Component: () => (
    <SlideFrame kind="title" background="aurora" footer={false} title={${lit(title)}} />
  ),
});
`);
  writeFileSync(join(slides, "index.ts"), `import { defineDeck } from "../deck/types";
import title from "./01-title";
// Design-spec / outline stubs (optional): uncomment while iterating on content/deck.spec.yaml
// (\`npm run spec\`) or content/deck.outline.md (\`npm run live\`). Promote stubs to locked files before ship.
// import { specSlides } from "./generated/from-spec";
// import { outlineSlides } from "./generated/from-outline";

export const deck = defineDeck({
  title: ${lit(title)},
  theme: ${lit(theme)},
  transition: "fade",
  slides: [
    title,
    // ...specSlides,
    // ...outlineSlides,
  ],
});
`);
  // Light outline (optional companion to the design spec).
  writeFileSync(join(dest, "content/deck.outline.md"), `# ${title.replace(/\s+/g, " ")}
Theme: ${theme}

<!--
  Optional light outline for \`npm run live\`. Prefer content/deck.spec.yaml as the
  approval artifact (see references/deck-spec.md). Sync with: npm run spec -- --sync-outline
-->
`);

  // Editable design spec — approval gate. Title slide is locked (matches 01-title.tsx).
  const yamlTitle = JSON.stringify(title);
  writeFileSync(join(dest, "content/deck.spec.yaml"), `# Editable design spec — schema: skills/web-slides/references/deck-spec.md
# Set approved: true only after the user explicitly approves this file.
title: ${yamlTitle}
theme: ${theme}
audience: ""
goal: ""
approved: false
version: 1

slides:
  - n: 1
    id: title
    type: title
    title: ${yamlTitle}
    layout: layout-stack
    status: locked
    background: aurora
    notes: Opening slide from new-deck.mjs. Add status:stub slides, ask the user to approve, then npm run spec.
`);

  // Generate empty stub modules so uncommenting the imports above always resolves.
  // (spec.mjs needs the `yaml` dependency from npm install — seed files here instead.)
  mkdirSync(join(slides, "generated"), { recursive: true });
  execFileSync(process.execPath, [join(dest, "scripts/watch-outline.mjs")], { stdio: "ignore" });
  writeFileSync(join(slides, "generated/from-spec.tsx"), `/* AUTO-GENERATED placeholder — run \`npm run spec\` after npm install. */
import { type SlideDef } from "../../deck/types";

export const specSlides: SlideDef[] = [];
export const specMeta = {
  title: ${lit(title)},
  theme: ${lit(theme)},
  approved: false,
  version: 1,
  stubCount: 0,
  lockedCount: 1,
  count: 1,
} as const;
`);
  writeFileSync(join(slides, "generated/spec-manifest.json"), JSON.stringify({
    title,
    theme,
    approved: false,
    approved_at: null,
    version: 1,
    slides: [{ n: 1, id: "title", type: "title", title, layout: "layout-stack", status: "locked", sources: [] }],
  }, null, 2) + "\n");
}
console.log(`deck created at ${dest}\nnext: cd ${dest} && npm install && npx playwright install chromium && npm run dev`);
