#!/usr/bin/env node
/**
 * Aggregate review/report.md into review/critique.md and list screenshot paths.
 * Does not modify slides. Usage:
 *   node critique.mjs [--deck <dir>] [--out review/critique.md]
 */
import fs from "node:fs";
import path from "node:path";

function argVal(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) {
    return process.argv[i + 1];
  }
  return fallback;
}

const deckDir = path.resolve(argVal("--deck", process.cwd()));
const reviewDir = path.join(deckDir, "review");
const outRel = argVal("--out", "review/critique.md");
const outPath = path.isAbsolute(outRel) ? outRel : path.join(deckDir, outRel);

if (!fs.existsSync(reviewDir)) {
  console.error(`No review/ in ${deckDir}. Run: npm run review`);
  process.exit(1);
}

const reportPath = path.join(reviewDir, "report.md");
const report = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, "utf8") : "";

const pngs = fs
  .readdirSync(reviewDir)
  .filter((f) => /^slide-.*\.png$/i.test(f) || f === "contact-sheet.png")
  .sort((a, b) => {
    if (a === "contact-sheet.png") return -1;
    if (b === "contact-sheet.png") return 1;
    return a.localeCompare(b, undefined, { numeric: true });
  });

const autoFindings = [];
let fid = 1;
const ruleHints = [
  [/box-overlap/i, "blocker", "Box overlap"],
  [/footer-overlap/i, "blocker", "Footer overlap"],
  [/off-stage/i, "blocker", "Content off-stage"],
  [/safe-margin/i, "blocker", "Safe margin violation"],
  [/clipped/i, "blocker", "Clipped content"],
  [/title-sentence/i, "blocker", "Weak or non-takeaway title"],
  [/contrast/i, "blocker", "Contrast failure"],
  [/tiny-text/i, "blocker", "Text under 18px"],
  [/leftover/i, "blocker", "Template leftover"],
  [/emoji-icon/i, "warn", "Emoji icon"],
  [/absolute-spam/i, "warn", "Absolute positioning spam"],
  [/uneven-gaps/i, "warn", "Uneven gaps"],
  [/spec-mismatch/i, "warn", "Spec mismatch"],
  [/img-alt|img-broken/i, "blocker", "Image alt/src issue"],
  [/source-missing|cite-unknown/i, "blocker", "Missing or unknown citation"],
];

for (const line of report.split("\n")) {
  const err = /^\s*[-*]?\s*(ERROR|WARN|WARNING)\b[:\s-]*(.*)$/i.exec(line);
  const bullet = /^\s*[-*]\s+(.+)$/.exec(line);
  const raw = err ? err[2] : bullet ? bullet[1] : null;
  if (!raw) continue;
  const severityWord = err ? err[1].toUpperCase() : "";
  let severity = severityWord.startsWith("ERR") ? "blocker" : severityWord.startsWith("WARN") ? "warn" : null;
  let label = null;
  for (const [re, sev, name] of ruleHints) {
    if (re.test(line) || re.test(raw)) {
      severity = severity || sev;
      label = name;
      break;
    }
  }
  if (!severity && !/error|fail|warn/i.test(line)) continue;
  severity = severity || "warn";
  autoFindings.push({
    id: `A-${String(fid++).padStart(3, "0")}`,
    severity,
    label: label || "Lint",
    detail: raw.trim().slice(0, 400),
  });
}

// Also scrape "### Slide" sections with nested errors if present
const slideSections = [...report.matchAll(/###?\s*Slide\s+(\d+)[^\n]*\n([\s\S]*?)(?=###?\s*Slide\s+\d+|$)/gi)];
for (const m of slideSections) {
  const slideNo = m[1];
  const body = m[2];
  for (const line of body.split("\n")) {
    if (!/\b(error|warn)/i.test(line)) continue;
    if (autoFindings.some((f) => f.detail === line.trim())) continue;
    let severity = /error/i.test(line) ? "blocker" : "warn";
    let label = "Lint";
    for (const [re, sev, name] of ruleHints) {
      if (re.test(line)) {
        severity = sev;
        label = name;
        break;
      }
    }
    autoFindings.push({
      id: `A-${String(fid++).padStart(3, "0")}`,
      severity,
      label,
      detail: `Slide ${slideNo}: ${line.trim().slice(0, 360)}`,
    });
  }
}

const blockers = autoFindings.filter((f) => f.severity === "blocker");
const warns = autoFindings.filter((f) => f.severity === "warn");

const existingVisual =
  fs.existsSync(outPath) && fs.readFileSync(outPath, "utf8").includes("## Visual findings")
    ? fs
        .readFileSync(outPath, "utf8")
        .split("## Visual findings")[1]
        ?.split("## Screenshot index")[0]
        ?.trim()
    : "";

const md = [];
md.push(`# Deck critique`);
md.push("");
md.push(`Generated: ${new Date().toISOString()}`);
md.push(`Deck: \`${deckDir}\``);
md.push("");
md.push(`> Critique only — **do not auto-rewrite** slides unless the user asks to fix findings.`);
md.push("");
md.push(`## Summary`);
md.push("");
md.push(`| | Count |`);
md.push(`|---|---|`);
md.push(`| Automated blockers | ${blockers.length} |`);
md.push(`| Automated warnings | ${warns.length} |`);
md.push(`| Screenshots found | ${pngs.length} |`);
md.push("");
md.push(`## Automated findings (from review/report.md)`);
md.push("");
if (!autoFindings.length) {
  md.push(`_No ERROR/WARN lines parsed from report.md. Still open the PNGs for a visual pass._`);
  md.push("");
} else {
  for (const f of autoFindings) {
    md.push(`### ${f.id} — ${f.severity} — ${f.label}`);
    md.push(`- **Detail:** ${f.detail}`);
    md.push(`- **Suggestion:** Fix before export if blocker; justify or fix if warn.`);
    md.push("");
  }
}
md.push(`## Visual findings`);
md.push("");
if (existingVisual && !existingVisual.startsWith("_Agent:")) {
  md.push(existingVisual);
} else {
  md.push(`_Agent: open \`contact-sheet.png\` and each \`slide-*.png\`. Add findings using the template in skills/slide-reviewer/references/critique-rubric.md._`);
  md.push("");
  md.push(`<!-- Example`);
  md.push(`### F-001 — warn — slide 01 (title)`);
  md.push(`- **Issue:** …`);
  md.push(`- **Evidence:** …`);
  md.push(`- **Suggestion:** …`);
  md.push(`-->`);
  md.push("");
}
md.push(`## Screenshot index`);
md.push("");
if (!pngs.length) {
  md.push(`_No PNGs in review/. Run npm run review._`);
} else {
  for (const f of pngs) md.push(`- \`review/${f}\``);
}
md.push("");
md.push(`## Next step`);
md.push("");
md.push(`1. Complete Visual findings.`);
md.push(`2. Show this file to the user.`);
md.push(`3. Only if they ask: fix blockers/warns, then \`npm run review && npm run critique\` again.`);
md.push(`4. Export PDF only after they accept the critique (or explicitly skip).`);
md.push("");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, md.join("\n"));
console.log(`wrote ${outPath}`);
console.log(`automated: ${blockers.length} blocker(s), ${warns.length} warning(s); ${pngs.length} png(s)`);
process.exit(0);
