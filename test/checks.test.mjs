// Fast checks that need no npm install or browser: token contrast check, scaffold output.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { run, scaffold, tempDir, template, tryRun } from "./helpers.mjs";

const checkTokens = join(template, "scripts/check-tokens.mjs");

function themeDir(t, brandCss) {
  const dir = tempDir(t);
  mkdirSync(join(dir, "src/theme"), { recursive: true });
  writeFileSync(join(dir, "src/theme/tokens.css"), readFileSync(join(template, "src/theme/tokens.css"), "utf8"));
  writeFileSync(join(dir, "src/theme/brand.css"), brandCss);
  return dir;
}

test("check:tokens passes the built-in themes", (t) => {
  const r = tryRun(process.execPath, [checkTokens], themeDir(t, ""));
  assert.equal(r.status, 0, r.out);
});

test("check:tokens fails a theme whose tokens it cannot read", (t) => {
  // 3-digit hex is valid CSS but unreadable to the checker; it must not pass silently.
  const r = tryRun(process.execPath, [checkTokens], themeDir(t, `[data-theme="brand"] {\n  --bg: #000;\n  --text: #fff;\n}\n`));
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /FAIL\s+text\s+on bg\s+not a 6-digit hex/);
});

test("check:tokens lists each pair once", (t) => {
  const out = run(process.execPath, [checkTokens], themeDir(t, ""));
  const midnight = out.split("theme aurora")[0];
  assert.equal((midnight.match(/accent\s+on surface/g) || []).length, 1, midnight);
});

test("scaffold keeps the outline wiring and starts from an empty outline", (t) => {
  const deck = scaffold(t, ["--title", "Our pilot cut triage time in half."]);
  const idx = readFileSync(join(deck, "src/slides/index.ts"), "utf8");
  assert.match(idx, /\/\/ import \{ outlineSlides \} from "\.\/generated\/from-outline";/);
  assert.match(idx, /\/\/ \.\.\.outlineSlides,/);
  assert.match(idx, /\/\/ import \{ specSlides \} from "\.\/generated\/from-spec";/);
  assert.match(idx, /\/\/ \.\.\.specSlides,/);
  const out = run(process.execPath, ["scripts/watch-outline.mjs"], deck);
  assert.match(out, /\(0 slides, theme=midnight\)/);
});

test("scaffold seeds deck.spec.yaml and from-spec stub module", (t) => {
  const deck = scaffold(t, ["--title", "Our pilot cut triage time in half."]);
  const yaml = readFileSync(join(deck, "content/deck.spec.yaml"), "utf8");
  assert.match(yaml, /approved:\s*false/);
  assert.match(yaml, /id:\s*title/);
  assert.match(yaml, /status:\s*locked/);
  const gen = readFileSync(join(deck, "src/slides/generated/from-spec.tsx"), "utf8");
  assert.match(gen, /specSlides/);
  assert.match(gen, /lockedCount: 1/);
  assert.ok(readFileSync(join(deck, "package.json"), "utf8").includes('"spec"'));
});

test("spec.mjs validates the template design spec", (t) => {
  const out = run(process.execPath, ["scripts/spec.mjs", "--check"], template);
  assert.match(out, /spec: OK/);
  const gen = run(process.execPath, ["scripts/spec.mjs"], template);
  assert.match(gen, /locked/);
  assert.ok(readFileSync(join(template, "src/slides/generated/from-spec.tsx"), "utf8").includes("specSlides"));
});

test("spec.mjs rejects missing approval flag and bad types", (t) => {
  // Run against the template tree (has `yaml` installed). Use a temp copy of the YAML only.
  const dir = tempDir(t);
  // Minimal deck layout: reuse template scripts + node_modules via symlink would be heavy;
  // write a bad spec into the template content, check, then restore.
  const specPath = join(template, "content/deck.spec.yaml");
  const backup = readFileSync(specPath, "utf8");
  t.after(() => writeFileSync(specPath, backup));
  writeFileSync(specPath, `title: X
theme: midnight
slides:
  - n: 1
    id: bad
    type: not-a-type
    title: Too short
    status: stub
`);
  const r = tryRun(process.execPath, ["scripts/spec.mjs", "--check"], template);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /approved/);
  assert.match(r.out, /type must be a catalog kind/);
});
