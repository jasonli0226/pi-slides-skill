// Scaffold smoke test: new-deck.mjs + watch-outline.mjs must produce a deck that
// type-checks and builds, even when titles and bullets contain JSX/JS-special characters.
// Runs plain Node (no pi needed). Needs network or an npm cache for `npm ci`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const newDeck = join(repo, "skills/web-slides/scripts/new-deck.mjs");
const TRICKY = `Our "pilot" cut {cost} by $5M <fast> & \`tidy\` \\ done.`;

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: "pipe" });
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

test("scaffolded deck with tricky title and outline type-checks and builds", { timeout: 300_000 }, (t) => {
  const dir = mkdtempSync(join(tmpdir(), "web-slides-smoke-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const deck = join(dir, "deck");

  run(process.execPath, [newDeck, deck, "--title", TRICKY, "--theme", "paper"], repo);
  writeFileSync(join(deck, "content/deck.outline.md"),
    `# Smoke\nTheme: paper\n\n## intro | Kicker "quoted" {x}\nTakeaway: ${TRICKY}\n- costs < $2M and {braces}\n- a "quote" \`tick\` \\ slash\n`);
  run(process.execPath, ["scripts/watch-outline.mjs"], deck);

  // Wire the outline stubs into the deck so they are type-checked and built too.
  const idx = join(deck, "src/slides/index.ts");
  writeFileSync(idx, `import { outlineSlides } from "./generated/from-outline";\n` +
    readFileSync(idx, "utf8").replace("slides: [title]", "slides: [title, ...outlineSlides]"));

  run(npm, ["ci", "--no-audit", "--no-fund", "--prefer-offline"], deck);
  run(npm, ["run", "typecheck"], deck);
  run(npm, ["run", "build"], deck);

  // Text must survive verbatim (no stray backslashes) in the built bundle.
  const js = run("sh", ["-c", "cat dist/assets/*.js"], deck);
  for (const s of [`by $5M`, `costs < $2M`, `{braces}`]) assert.ok(js.includes(s), `bundle is missing ${JSON.stringify(s)}`);
  assert.ok(!js.includes("\\\\$5M"), "bundle contains an escaped \\$");
});

test("verify script type-checks before building", () => {
  const pkg = JSON.parse(readFileSync(join(repo, "skills/web-slides/template/package.json"), "utf8"));
  assert.match(pkg.scripts.verify, /npm run typecheck/);
});
