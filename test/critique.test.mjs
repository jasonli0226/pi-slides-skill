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
