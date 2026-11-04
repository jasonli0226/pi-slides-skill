// Scaffold smoke test: new-deck.mjs + watch-outline.mjs must produce a deck that
// type-checks and builds, even when titles and bullets contain JSX/JS-special characters.
// Runs plain Node (no pi needed). Needs network or an npm cache for `npm ci`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { npm, run, scaffold, template } from "./helpers.mjs";

const TRICKY = `Our "pilot" cut {cost} by $5M <fast> & \`tidy\` \\ done.`;

test("scaffolded deck with tricky title and outline type-checks and builds", { timeout: 300_000 }, (t) => {
  const deck = scaffold(t, ["--title", TRICKY, "--theme", "paper"], { install: true });
  writeFileSync(join(deck, "content/deck.outline.md"),
    `# Smoke\nTheme: paper\n\n## intro | Kicker "quoted" {x}\nTakeaway: ${TRICKY}\n- costs < $2M and {braces}\n- a "quote" \`tick\` \\ slash\n`);
  run(process.execPath, ["scripts/watch-outline.mjs"], deck);

  // Wire the outline stubs in the way SKILL.md tells agents to: uncomment the two lines.
  const idx = join(deck, "src/slides/index.ts");
  writeFileSync(idx, readFileSync(idx, "utf8").replace("// import { outlineSlides }", "import { outlineSlides }").replace("// ...outlineSlides,", "...outlineSlides,"));

  run(npm, ["run", "typecheck"], deck);
  run(npm, ["run", "build"], deck);

  // Text must survive verbatim (no stray backslashes) in the built bundle.
  const js = run("sh", ["-c", "cat dist/assets/*.js"], deck);
  for (const s of [`by $5M`, `costs < $2M`, `{braces}`]) assert.ok(js.includes(s), `bundle is missing ${JSON.stringify(s)}`);
  assert.ok(!js.includes("\\\\$5M"), "bundle contains an escaped \\$");
});

test("verify script type-checks before building", () => {
  const pkg = JSON.parse(readFileSync(join(template, "package.json"), "utf8"));
  assert.match(pkg.scripts.verify, /npm run typecheck/);
});
