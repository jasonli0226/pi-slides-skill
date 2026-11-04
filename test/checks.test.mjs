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
  const out = run(process.execPath, ["scripts/watch-outline.mjs"], deck);
  assert.match(out, /\(0 slides, theme=midnight\)/);
});
