// Fast checks that need no npm install or browser: token contrast check, scaffold output.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { npm, repo, run, scaffold, tempDir, template, tryRun } from "./helpers.mjs";

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

test("spec.mjs style-pack overlay fills blanks but keeps explicit theme and layout", (t) => {
  const deck = scaffold(t, ["--title", "Our pilot cut triage time in half."]);
  symlinkSync(join(template, "node_modules"), join(deck, "node_modules"), "dir");
  writeFileSync(join(deck, "content/style-pack.json"), JSON.stringify({
    id: "navy-pitch-snapshot",
    themeFile: "brand.css",
    patterns: { kpi: { slideTypes: ["big-number"], layout: "layout-kpi" } },
  }));
  writeFileSync(join(deck, "content/deck.spec.yaml"), `title: Overlay
theme: paper
approved: false
slides:
  - n: 1
    id: hero-metric
    type: big-number
    title: Pipeline hit four million dollars this quarter.
    layout: layout-hero
    status: stub
  - n: 2
    id: plain-metric
    type: big-number
    title: Churn fell to two percent after the pilot.
    status: stub
`);
  run(process.execPath, ["scripts/spec.mjs"], deck);
  const manifest = JSON.parse(readFileSync(join(deck, "src/slides/generated/spec-manifest.json"), "utf8"));
  assert.equal(manifest.theme, "paper");
  assert.equal(manifest.slides[0].layout, "layout-hero");
  assert.equal(manifest.slides[1].layout, "layout-kpi");
});

test("a deck scaffolded from the npm tarball gets a .gitignore", (t) => {
  // npm never packs .gitignore files, so the template's copy is missing after `pi install npm:`.
  const dir = tempDir(t);
  const tgz = run(npm, ["pack", "--silent", "--pack-destination", dir], repo).trim().split("\n").pop();
  run("tar", ["-xzf", join(dir, tgz), "-C", dir], dir);
  const deck = join(dir, "deck");
  run(process.execPath, [join(dir, "package/skills/web-slides/scripts/new-deck.mjs"), deck, "--title", "Our pilot cut triage time in half."], dir);
  assert.match(readFileSync(join(deck, ".gitignore"), "utf8"), /^node_modules$/m);
});
