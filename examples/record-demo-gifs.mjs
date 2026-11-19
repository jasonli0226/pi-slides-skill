#!/usr/bin/env node
/**
 * Regenerates examples/demo-dark-theme.gif and examples/demo-light-theme.gif
 * from the official template deck in present mode (motion on, no ?static).
 *
 * Dark = midnight (the template default). Light = paper (built-in light theme),
 * switched at runtime with ?theme=paper — this script does not edit the deck.
 *
 * Usage (from the repo root):
 *   node examples/record-demo-gifs.mjs
 *   node examples/record-demo-gifs.mjs --theme dark
 *   node examples/record-demo-gifs.mjs --theme light
 *   node examples/record-demo-gifs.mjs --skip-build
 *   node examples/record-demo-gifs.mjs --preview   # static PNGs of the reel (written under /tmp)
 *
 * Requires Playwright Chromium (template devDependency) and ffmpeg on PATH.
 * Optional: gifsicle on PATH (npm install -g gifsicle) to shrink the GIFs
 * with -O3 --lossy=20 after ffmpeg. Without it the files may exceed 3MB.
 * Maintainer-only: not part of the published skill runtime or npm package.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chdir } from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const templateDir = path.join(repoRoot, "skills/web-slides/template");
const outDir = path.join(repoRoot, "examples");

// Vite caches process.cwd() at import time, so chdir before loading the template helpers.
chdir(templateDir);
const { buildAndServe, launch, waitReady, W, H, args, argValue } = await import(
  path.join(templateDir, "scripts/lib.mjs")
);

const FPS = 10;
const OUT_W = 800;
const OUT_H = 450;
const FADE_IN = 0.4;
const FADE_OUT = 0.5;

/**
 * Highlight reel: layout + diagram spread, in deck order.
 *  1 title            — full-bleed photo hero, light left scrim
 *  4 stack-comparison — packed comparison table hanging from the title
 *  6 layered-platform — LayeredArchitecture, 4 path-walk click-steps
 *  7 c4-context       — C4 context, 3 path-walk click-steps
 *  8 chat-sequence    — Sequence, 6 path-walk click-steps (one hop per click)
 * 11 results          — Stat + horizontal BarChart filling leftover height
 * 17 trend-chart      — EChart trend filling its column
 */
const REEL = [
  { slide: 1, id: "title", holdMs: 2200 },
  { slide: 4, id: "stack-comparison", enterMs: 1300, holdMs: 1500 },
  { slide: 6, id: "layered-platform", enterMs: 1200, steps: 4, stepMs: 800, holdMs: 1100 },
  { slide: 7, id: "c4-context", enterMs: 1200, steps: 3, stepMs: 800, holdMs: 1100 },
  { slide: 8, id: "chat-sequence", enterMs: 1200, steps: 6, stepMs: 700, holdMs: 1200 },
  { slide: 11, id: "results", enterMs: 1600, holdMs: 1300 },
  { slide: 17, id: "trend-chart", enterMs: 1500, holdMs: 1700 },
];

const THEMES = {
  dark: { query: "midnight", file: "demo-dark-theme.gif" },
  light: { query: "paper", file: "demo-light-theme.gif" },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function requireFfmpeg() {
  const r = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  if (r.status !== 0) throw new Error("ffmpeg is required on PATH to encode the demo GIFs.");
}

function findGifsicle() {
  const r = spawnSync("gifsicle", ["--version"], { encoding: "utf8" });
  return r.status === 0 ? "gifsicle" : null;
}

function goTo(page, slide, step = 0) {
  return page.evaluate(({ slide: s, step: k }) => {
    location.hash = k ? `#/${s}/${k}` : `#/${s}`;
  }, { slide, step });
}

async function walkReel(page) {
  // Title is already on screen from first load (AnimatePresence initial={false}).
  await sleep(REEL[0].holdMs);

  for (const beat of REEL.slice(1)) {
    await goTo(page, beat.slide, 0);
    if (beat.id === "trend-chart") {
      await page.waitForSelector(".echart-canvas svg, .echart-canvas canvas", { timeout: 10000 }).catch(() => {});
    }
    await sleep(beat.enterMs ?? 1000);
    const steps = beat.steps ?? 0;
    for (let i = 0; i < steps; i++) {
      await page.keyboard.press("ArrowRight");
      await sleep(beat.stepMs ?? 800);
    }
    await sleep(beat.holdMs);
  }
}

async function captureJpegFrames(page, run) {
  const samples = [];
  let grabbing = true;
  const pump = (async () => {
    while (grabbing) {
      const t = Date.now();
      const buf = await page.screenshot({ type: "jpeg", quality: 92, animations: "allow" });
      samples.push({ t, buf });
    }
  })();
  try {
    await run();
  } finally {
    grabbing = false;
    await pump;
  }
  return samples;
}

/** Pick a frame for every 100ms tick so the GIF plays in real time at 10fps. */
function resample(samples, fps = FPS) {
  if (samples.length === 0) throw new Error("No frames captured.");
  const t0 = samples[0].t;
  const t1 = samples[samples.length - 1].t;
  const interval = 1000 / fps;
  const n = Math.max(1, Math.round((t1 - t0) / interval));
  const frames = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const target = t0 + i * interval;
    while (j + 1 < samples.length && samples[j + 1].t <= target) j++;
    frames.push(samples[j].buf);
  }
  return frames;
}

function encodeGif(frames, dest) {
  const work = path.join(tmpdir(), `pi-slides-gif-${process.pid}-${Date.now()}`);
  mkdirSync(work, { recursive: true });
  try {
    for (let i = 0; i < frames.length; i++) {
      writeFileSync(path.join(work, `${String(i).padStart(5, "0")}.jpg`), frames[i]);
    }
    const seconds = frames.length / FPS;
    const fadeOutStart = Math.max(0, seconds - FADE_OUT);
    const vf = [
      `scale=${OUT_W}:${OUT_H}:flags=lanczos`,
      `fade=t=in:st=0:d=${FADE_IN}`,
      `fade=t=out:st=${fadeOutStart}:d=${FADE_OUT}`,
      "split[s0][s1]",
      "[s0]palettegen=max_colors=256:stats_mode=full[p]",
      "[s1][p]paletteuse=dither=sierra2_4a:new=1",
    ].join(",");
    const r = spawnSync("ffmpeg", [
      "-y",
      "-hide_banner",
      "-loglevel", "error",
      "-framerate", String(FPS),
      "-i", path.join(work, "%05d.jpg"),
      "-vf", vf,
      "-loop", "0",
      dest,
    ], { encoding: "utf8" });
    if (r.status !== 0) {
      throw new Error(`ffmpeg failed for ${dest}:\n${r.stderr || r.stdout}`);
    }
    const gifsicle = findGifsicle();
    if (gifsicle) {
      const opt = dest + ".opt.gif";
      const g = spawnSync(gifsicle, ["-O3", "--lossy=20", "-o", opt, dest], { encoding: "utf8" });
      if (g.status !== 0) {
        console.warn(`gifsicle failed, keeping the ffmpeg GIF:\n${g.stderr || g.stdout}`);
      } else {
        renameSync(opt, dest);
        console.log(`  gifsicle -O3 --lossy=20 -> ${statSync(dest).size} bytes`);
      }
    } else {
      console.warn("gifsicle not on PATH; skipping shrink step (GIF may be >3MB).");
    }
    return { frames: frames.length, seconds };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

async function previewReel({ url, browser, themes }) {
  const previewDir = path.join(tmpdir(), "pi-slides-demo-reel-preview");
  rmSync(previewDir, { recursive: true, force: true });
  mkdirSync(previewDir, { recursive: true });
  for (const name of themes) {
    const theme = THEMES[name];
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await page.goto(`${url}?theme=${theme.query}&static&slide=1`);
    await waitReady(page);
    for (const beat of REEL) {
      await page.goto(`${url}?theme=${theme.query}&static&slide=${beat.slide}&step=final`);
      await waitReady(page);
      const file = path.join(previewDir, `${name}-${String(beat.slide).padStart(2, "0")}-${beat.id}.png`);
      await page.screenshot({ path: file, type: "png" });
      console.log("preview", file);
    }
    await page.close();
  }
  console.log(`Wrote static previews to ${previewDir}`);
}

async function recordTheme({ url, browser, name }) {
  const theme = THEMES[name];
  const dest = path.join(outDir, theme.file);
  console.log(`Recording ${name} (${theme.query}) → ${dest}`);
  const page = await browser.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    reducedMotion: null,
  });
  await page.goto(`${url}?theme=${theme.query}#/1`);
  await waitReady(page);
  await page.waitForFunction(() => {
    const img = document.querySelector(".title-backdrop img");
    return !img || (img.complete && img.naturalWidth > 0);
  }, { timeout: 15000 });
  await page.addStyleTag({
    content: `
      .progress { opacity: 0 !important; }
      .viewport, .viewport * { cursor: none !important; }
    `,
  });
  // A beat so the first captured frame is a settled title hero, not a mid-paint.
  await sleep(250);

  const samples = await captureJpegFrames(page, () => walkReel(page));
  await page.close();
  const frames = resample(samples);
  const info = encodeGif(frames, dest);
  console.log(`  captured ${samples.length} raw → ${info.frames} frames (${info.seconds.toFixed(1)}s), wrote ${dest}`);
  return { dest, ...info };
}

const themeArg = argValue("--theme", "both");
const themes = themeArg === "both" ? ["dark", "light"] : [themeArg];
if (themes.some((t) => !THEMES[t])) {
  throw new Error(`Unknown --theme ${themeArg}. Use dark, light, or both.`);
}

requireFfmpeg();

const { url, server, buildMs } = await buildAndServe({ skipBuild: args.has("--skip-build") });
if (!args.has("--skip-build")) console.log(`Built official example in ${buildMs}ms`);
const browser = await launch();
try {
  if (args.has("--preview")) {
    await previewReel({ url, browser, themes });
  } else {
    for (const name of themes) {
      await recordTheme({ url, browser, name });
    }
  }
} finally {
  await browser.close();
  await server.close();
}
