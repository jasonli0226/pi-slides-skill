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
// Live outline stubs (optional): uncomment the import and the spread below while using \`npm run live\`
// and editing content/deck.outline.md. Replace stubs with polished slide files before ship.
// import { outlineSlides } from "./generated/from-outline";

export const deck = defineDeck({
  title: ${lit(title)},
  theme: ${lit(theme)},
  transition: "fade",
  slides: [
    title,
    // ...outlineSlides,
  ],
});
`);
  // Start the live outline empty (the template's copy describes the example deck).
  // Format lines in the comment are indented so the outline parser ignores them.
  writeFileSync(join(dest, "content/deck.outline.md"), `# ${title.replace(/\s+/g, " ")}
Theme: ${theme}

<!--
  Live outline (optional). Edit this file while \`npm run live\` is running; the watcher
  regenerates src/slides/generated/from-outline.tsx. One block per slide:

  ## slide-id | Kicker
  Takeaway: A full-sentence takeaway title.
  - up to five bullets

  React slides remain the source of truth for beauty: refine each stub into its own file.
-->
`);
  // Generate the (empty) stub module so uncommenting the import above always resolves.
  execFileSync(process.execPath, [join(dest, "scripts/watch-outline.mjs")], { stdio: "ignore" });
}
console.log(`deck created at ${dest}\nnext: cd ${dest} && npm install && npx playwright install chromium && npm run dev`);
