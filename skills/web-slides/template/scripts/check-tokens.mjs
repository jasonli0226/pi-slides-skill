#!/usr/bin/env node
// WCAG 2.2 AA contrast check for every theme in src/theme/tokens.css + brand.css.
import { readFileSync } from "node:fs";

const css = ["src/theme/tokens.css", "src/theme/brand.css"].map((f) => readFileSync(f, "utf8")).join("\n");
const themes = {};
for (const m of css.matchAll(/\[data-theme="([\w-]+)"\]\s*\{([^}]*)\}/g)) {
  const vars = (themes[m[1]] ??= {});
  for (const v of m[2].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) vars[v[1]] = v[2];
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h) => { const [r, g, b] = hex(h).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// [foreground, background, minimum]. Accents are used for small labels, so they need 4.5:1.
const pairs = [
  ["text", "bg", 4.5], ["text", "surface", 4.5], ["text", "surface-2", 4.5],
  ["text-muted", "bg", 4.5], ["text-muted", "surface", 4.5], ["text-muted", "bg-elev", 4.5],
  ["accent", "bg", 4.5], ["accent", "surface", 4.5], ["accent-2", "bg", 4.5], ["accent-2", "surface", 4.5],
  ["accent-3", "bg", 4.5], ["accent-3", "surface", 4.5], ["warning", "bg", 4.5], ["danger", "bg", 4.5],
  ["on-accent", "accent", 4.5], ["accent", "surface", 3.0],
];
let fail = 0;
for (const [name, v] of Object.entries(themes)) {
  console.log(`theme ${name}`);
  for (const [fg, bg, min] of pairs) {
    if (!v[fg] || !v[bg]) { console.log(`  skip ${fg} on ${bg} (not defined)`); continue; }
    const r = ratio(v[fg], v[bg]);
    const ok = r >= min;
    if (!ok) fail++;
    console.log(`  ${ok ? "pass" : "FAIL"} ${fg.padEnd(10)} on ${bg.padEnd(9)} ${r.toFixed(2)}:1 (min ${min})`);
  }
}
if (!Object.keys(themes).length) { console.error("no themes found"); process.exit(1); }
console.log(fail ? `\n${fail} contrast failures` : "\nall token pairs pass WCAG AA");
process.exit(fail ? 1 : 0);
