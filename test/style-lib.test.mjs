import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "skills/style-library/scripts/style-lib.mjs");

function run(args, env = {}) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  return r;
}

test("style-lib list includes shipped packs", () => {
  const r = run(["list"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /title-hero-light/);
  assert.match(r.stdout, /navy-pitch-snapshot/);
});

test("style-lib show title-hero-light is patterns-only", () => {
  const r = run(["show", "--id", "title-hero-light"]);
  assert.equal(r.status, 0, r.stderr);
  const json = JSON.parse(r.stdout.slice(0, r.stdout.indexOf("\npath:")));
  assert.equal(json.theme, null);
  assert.equal(json.patterns[0].id, "title-hero");
});

test("style-lib apply navy-pitch-snapshot writes brand.css", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "style-lib-"));
  fs.mkdirSync(path.join(tmp, "src/theme"), { recursive: true });
  fs.mkdirSync(path.join(tmp, "src/slides"), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, "src/slides/index.ts"),
    'export const deck = { theme: "midnight", slides: [] };\n',
  );
  const r = run(["apply", "--id", "navy-pitch-snapshot", "--deck", tmp]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const brand = fs.readFileSync(path.join(tmp, "src/theme/brand.css"), "utf8");
  assert.match(brand, /\[data-theme="brand"\]/);
  assert.match(brand, /--bg:\s*#071225/);
  const index = fs.readFileSync(path.join(tmp, "src/slides/index.ts"), "utf8");
  assert.match(index, /theme:\s*"brand"/);
  assert.ok(fs.existsSync(path.join(tmp, "style-import/pack-navy-pitch-snapshot/kpi.md")));
});

test("style-lib save + update round-trip in STYLE_LIBRARY_DIR", () => {
  const lib = fs.mkdtempSync(path.join(os.tmpdir(), "style-lib-dir-"));
  const deck = fs.mkdtempSync(path.join(os.tmpdir(), "style-lib-deck-"));
  fs.mkdirSync(path.join(deck, "src/theme"), { recursive: true });
  fs.writeFileSync(
    path.join(deck, "src/theme/brand.css"),
    '[data-theme="brand"] { --bg: #112233; --text: #eef3ff; --accent: #5b8cff; }\n',
  );
  const save2 = run(
    ["save", "--id", "env-pack", "--from", deck, "--name", "Env pack", "--patterns", "kpi"],
    { STYLE_LIBRARY_DIR: lib },
  );
  assert.equal(save2.status, 0, save2.stderr + save2.stdout);
  assert.ok(fs.existsSync(path.join(lib, "env-pack/pack.json")), save2.stdout);
  const brand = fs.readFileSync(path.join(lib, "env-pack/brand.css"), "utf8");
  assert.match(brand, /#112233/);

  fs.writeFileSync(
    path.join(deck, "src/theme/brand.css"),
    '[data-theme="brand"] { --bg: #445566; --text: #eef3ff; --accent: #5b8cff; }\n',
  );
  const upd = run(["update", "--id", "env-pack", "--from", deck], { STYLE_LIBRARY_DIR: lib });
  assert.equal(upd.status, 0, upd.stderr + upd.stdout);
  const brand2 = fs.readFileSync(path.join(lib, "env-pack/brand.css"), "utf8");
  assert.match(brand2, /#445566/);
});
