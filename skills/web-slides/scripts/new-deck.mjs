#!/usr/bin/env node
// Create a new deck project from the template.
// Usage: node <skill>/scripts/new-deck.mjs <target-dir> --title "Deck title" [--theme midnight|aurora|paper] [--keep-examples]
// Default: copies the engine + theme, and replaces the example slides with a single title slide.
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
const skip = new Set(["node_modules", "dist", "review", "export"]);
mkdirSync(dest, { recursive: true });
cpSync(tpl, dest, { recursive: true, filter: (src) => !skip.has(src.split(/[\\/]/).pop()) });

if (!argv.includes("--keep-examples")) {
  if (!title) { console.error("--title is required unless --keep-examples"); process.exit(2); }
  const slides = join(dest, "src/slides");
  rmSync(slides, { recursive: true, force: true });
  mkdirSync(slides);
  const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
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
    <SlideFrame kind="title" background="aurora" footer={false} title="${esc(title)}" />
  ),
});
`);
  writeFileSync(join(slides, "index.ts"), `import { defineDeck } from "../deck/types";
import title from "./01-title";

export const deck = defineDeck({
  title: "${esc(title)}",
  theme: "${esc(theme)}",
  transition: "fade",
  slides: [title],
});
`);
}
console.log(`deck created at ${dest}\nnext: cd ${dest} && npm install && npx playwright install chromium && npm run dev`);
