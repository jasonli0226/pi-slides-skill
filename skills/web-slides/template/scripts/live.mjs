#!/usr/bin/env node
/** npm run live — outline watcher + Vite HMR present mode. */
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;

function run(args, name) {
  const child = spawn(node, args, { cwd: root, stdio: "inherit", env: process.env });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else if (code && code !== 0) process.exitCode = code;
  });
  return child;
}

// initial generate
await new Promise((res, rej) => {
  const c = spawn(node, [join(root, "scripts/watch-outline.mjs")], { cwd: root, stdio: "inherit" });
  c.on("exit", (code) => (code ? rej(new Error(`outline exit ${code}`)) : res()));
});

const watcher = run([join(root, "scripts/watch-outline.mjs"), "--watch"], "outline");
const viteBin = join(root, "node_modules/vite/bin/vite.js");
const vite = run([viteBin, "--host", "127.0.0.1"], "vite");

function shutdown() {
  watcher.kill("SIGTERM");
  vite.kill("SIGTERM");
}
process.on("SIGINT", () => { shutdown(); process.exit(0); });
process.on("SIGTERM", () => { shutdown(); process.exit(0); });
