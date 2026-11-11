import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "skills/slide-reviewer/scripts/critique.mjs");

test("critique.mjs writes critique.md from report + pngs", () => {
  const deck = fs.mkdtempSync(path.join(os.tmpdir(), "critique-"));
  const review = path.join(deck, "review");
  fs.mkdirSync(review);
  fs.writeFileSync(
    path.join(review, "report.md"),
    `# Review\n\n- ERROR box-overlap on slide 2\n- WARN uneven-gaps on slide 3\n- title-sentence failed for slide 1\n`,
  );
  fs.writeFileSync(path.join(review, "contact-sheet.png"), "fake");
  fs.writeFileSync(path.join(review, "slide-01.png"), "fake");
  const r = spawnSync(process.execPath, [CLI, "--deck", deck], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const out = fs.readFileSync(path.join(review, "critique.md"), "utf8");
  assert.match(out, /Automated blockers/);
  assert.match(out, /box-overlap|Box overlap/i);
  assert.match(out, /Visual findings/);
  assert.match(out, /contact-sheet\.png/);
  assert.match(out, /do not auto-rewrite/i);
});

test("critique.mjs fails without review/", () => {
  const deck = fs.mkdtempSync(path.join(os.tmpdir(), "critique-empty-"));
  const r = spawnSync(process.execPath, [CLI, "--deck", deck], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
});

test("critique.mjs uses the level review.mjs writes, not the rule table", () => {
  const deck = fs.mkdtempSync(path.join(os.tmpdir(), "critique-levels-"));
  const review = path.join(deck, "review");
  fs.mkdirSync(review);
  fs.writeFileSync(
    path.join(review, "report.md"),
    [
      "# Review",
      "",
      "## Deck",
      '- **error** [spec-mismatch] Slide 2 layout differs from deck.spec.yaml',
      '- **error** [duplicate-id] Slide id "a" is already used by slide 1',
      "",
      "## Slide 1 — a",
      '- **error** [emoji-icon] Emoji used as icon — "🚀"',
      "- **warn** [title-sentence] Title is not a full sentence",
      "",
      "## Slide 2 — b",
      "- **error** [absolute-spam] 6 absolutely positioned boxes",
      "- ok",
      "",
    ].join("\n"),
  );
  const r = spawnSync(process.execPath, [CLI, "--deck", deck], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /automated: 4 blocker\(s\), 1 warning\(s\)/);
});

test("critique.mjs labels chart and Spline findings", () => {
  const deck = fs.mkdtempSync(path.join(os.tmpdir(), "critique-charts-"));
  const review = path.join(deck, "review");
  fs.mkdirSync(review);
  fs.writeFileSync(
    path.join(review, "report.md"),
    [
      "# Review",
      "",
      "## Slide 4 — trend",
      "- **warn** [chart-baseline] A bar chart's value axis does not start at zero",
      "- **warn** [chart-legibility] 3 series and no `highlight`",
      "- **error** [spline-fallback] Spline scene has no local poster image",
      "- **warn** [spline-placement] Spline scene on a \"content\" slide",
      "",
    ].join("\n"),
  );
  const r = spawnSync(process.execPath, [CLI, "--deck", deck], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /automated: 1 blocker\(s\), 3 warning\(s\)/);
  const out = fs.readFileSync(path.join(review, "critique.md"), "utf8");
  for (const label of ["Bar chart baseline not zero", "Chart off the chart guide", "Spline scene without poster fallback", "Spline scene off a hero slide"])
    assert.ok(out.includes(label), `critique.md is missing "${label}"`);
});
