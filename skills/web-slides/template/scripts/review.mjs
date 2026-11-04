#!/usr/bin/env node
// Screenshot every slide (final state) + run the lint rules + build a contact sheet.
// Usage: node scripts/review.mjs [--no-build] [--steps] [--out review] [--no-lint] [--theme brand]
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { args, argValue, buildAndServe, launch, waitReady, W, H } from "./lib.mjs";

const out = argValue("--out", "review");
const lint = !args.has("--no-lint");
const withSteps = args.has("--steps");
const themeQ = argValue("--theme", "") ? `&theme=${encodeURIComponent(argValue("--theme", ""))}` : "";
const lintSrc = readFileSync(new URL("./lint-in-page.js", import.meta.url), "utf8");

const t0 = Date.now();
const { url, server, buildMs } = await buildAndServe({ skipBuild: args.has("--no-build") });
const tReview = Date.now();
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const browser = await launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, reducedMotion: "reduce" });
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

await page.goto(`${url}?static&slide=1${themeQ}`);
await waitReady(page);
const deck = await page.evaluate(() => window.__DECK__);
// deck-level rules: slide ids key React, URLs and screenshot names, so they must be unique
const deckIssues = [];
const firstSeen = new Map();
deck.slides.forEach((s, i) => {
  if (!firstSeen.has(s.id)) return firstSeen.set(s.id, i + 1);
  deckIssues.push({ slide: i + 1, id: s.id, level: "error", rule: "duplicate-id", msg: `Slide id "${s.id}" is already used by slide ${firstSeen.get(s.id)}; ids must be unique.` });
});
const results = [];
const shots = [];

for (let i = 0; i < deck.slides.length; i++) {
  const s = deck.slides[i];
  const n = String(i + 1).padStart(2, "0");
  const steps = withSteps ? [...Array(s.steps + 1).keys()] : ["final"];
  for (const step of steps) {
    await page.goto(`${url}?static&slide=${i + 1}&step=${step}${themeQ}`);
    await waitReady(page);
    const file = join(out, step === "final" ? `slide-${n}-${s.id}.png` : `slide-${n}-${s.id}-step${step}.png`);
    await page.screenshot({ path: file });
    if (step === "final" || step === s.steps) shots.push(file);
    if (lint && (step === "final" || step === s.steps)) {
      const r = await page.evaluate(lintSrc);
      results.push({ slide: i + 1, id: s.id, notes: s.notes, file, ...r });
    }
  }
}

// contact sheet: all final-state slides in one image for a quick visual pass
const cols = 3, tw = 640, th = 360, gap = 16;
const rows = Math.ceil(shots.length / cols);
const imgs = shots.map((f, i) => `<figure><img src="data:image/png;base64,${readFileSync(f).toString("base64")}"><figcaption>${i + 1}</figcaption></figure>`).join("");
await page.setViewportSize({ width: cols * (tw + gap) + gap, height: rows * (th + 40 + gap) + gap });
await page.setContent(`<style>body{margin:0;background:#111;display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:${gap}px;padding:${gap}px;font:16px sans-serif;color:#ccc}
figure{margin:0}img{width:${tw}px;height:${th}px;display:block;border-radius:6px}figcaption{padding-top:6px}</style>${imgs}`);
await page.screenshot({ path: join(out, "contact-sheet.png"), fullPage: true });
await browser.close();
await server.close();

const all = [...deckIssues, ...results.flatMap((r) => r.issues.map((x) => ({ slide: r.slide, id: r.id, ...x })))];
if (consoleErrors.length) all.push(...[...new Set(consoleErrors)].map((m) => ({ slide: 0, id: "console", level: "warn", rule: "console", msg: m })));
const errors = all.filter((x) => x.level === "error");
const warns = all.filter((x) => x.level === "warn");
const timing = { buildMs, reviewMs: Date.now() - tReview, totalMs: Date.now() - t0 };
writeFileSync(join(out, "report.json"), JSON.stringify({ deck: deck.title, timing, errors: errors.length, warnings: warns.length, deckIssues, slides: results, consoleErrors }, null, 2));

const md = [`# Review: ${deck.title}`, "", `Slides: ${deck.slides.length} · errors: ${errors.length} · warnings: ${warns.length}`,
  `Build ${(buildMs / 1000).toFixed(1)}s · review ${(timing.reviewMs / 1000).toFixed(1)}s`, "",
  "Open `contact-sheet.png` first, then each `slide-*.png`. Fix every error; justify or fix every warning.", "",
  ...(deckIssues.length ? ["## Deck", ...deckIssues.map((x) => `- **${x.level}** [${x.rule}] ${x.msg}`), ""] : []),
  ...results.map((r) => [`## ${r.slide}. ${r.id} (${r.kind})`, `Title: ${r.title}`, `Screenshot: ${r.file}`,
    ...(r.issues.length ? r.issues.map((x) => `- **${x.level}** [${x.rule}] ${x.msg}${x.text ? ` — "${x.text}"` : ""}`) : ["- ok"]), ""].join("\n")),
  consoleErrors.length ? `## Console\n${[...new Set(consoleErrors)].map((m) => `- ${m}`).join("\n")}` : ""].join("\n");
writeFileSync(join(out, "report.md"), md);

console.log(`review: ${deck.slides.length} slides → ${out}/  errors=${errors.length} warnings=${warns.length}  build=${(buildMs / 1000).toFixed(1)}s review=${(timing.reviewMs / 1000).toFixed(1)}s`);
for (const x of [...errors, ...warns]) console.log(`  ${x.level.toUpperCase()} slide ${x.slide} ${x.id} [${x.rule}] ${x.msg}`);
process.exit(lint && errors.length && !args.has("--no-fail") ? 1 : 0);
