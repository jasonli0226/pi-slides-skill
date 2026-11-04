// Shared test helpers: run commands, scaffold a deck into a temp dir.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
export const template = join(repo, "skills/web-slides/template");
export const newDeck = join(repo, "skills/web-slides/scripts/new-deck.mjs");
export const npm = process.platform === "win32" ? "npm.cmd" : "npm";

/** Run a command and return stdout; throws (with output attached) on non-zero exit. */
export const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: "pipe" });

/** Run a command and return { status, out } without throwing. */
export function tryRun(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8" });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

/** Fresh temp dir, removed when the test ends. */
export function tempDir(t, prefix = "web-slides-test-") {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** Scaffold a deck with new-deck.mjs. `install` also runs `npm ci`. */
export function scaffold(t, args, { install = false } = {}) {
  const deck = join(tempDir(t), "deck");
  run(process.execPath, [newDeck, deck, ...args], repo);
  if (install) run(npm, ["ci", "--no-audit", "--no-fund", "--prefer-offline"], deck);
  return deck;
}
