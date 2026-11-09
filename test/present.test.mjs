// Browser tests for present mode and the review lint. Needs Chromium for Playwright
// (`npx playwright install chromium` in the template, or CHROME_PATH).
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { scaffold, tryRun } from "./helpers.mjs";

let deck, lib, server, url, browser;

// The deck outlives every test in this file, so cleanup lives in the file-level after().
const cleanups = [];
before(async () => {
  deck = scaffold({ after: (fn) => cleanups.push(fn) }, ["--keep-examples"], { install: true });
  process.chdir(deck); // lib.mjs builds and serves the deck in the cwd
  lib = await import(pathToFileURL(join(deck, "scripts/lib.mjs")));
  ({ server, url } = await lib.buildAndServe());
  browser = await lib.launch();
}, { timeout: 300_000 });

after(async () => {
  await browser?.close();
  await server?.close();
  process.chdir("/");
  for (const fn of cleanups) fn();
});

async function present(hash = "") {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`${url}${hash}`);
  await page.waitForSelector(".stage[data-slide-id]");
  return page;
}
const slideId = (page) => page.locator(".viewport .stage").first().getAttribute("data-slide-id");
const deckInfo = (page) => page.evaluate(() => window.__DECK__);

test("a step past the slide's last step is clamped", async () => {
  const probe = await present("#/1");
  const { slides } = await deckInfo(probe);
  await probe.close();
  const i = slides.findIndex((s) => s.steps > 0);
  assert.ok(i >= 0, "example deck should have a slide with click steps");
  const n = i + 1, max = slides[i].steps;
  const page = await present(`#/${n}/99`);
  await page.waitForFunction((h) => location.hash === h, `#/${n}/${max}`);
  await page.keyboard.press("ArrowLeft");
  await page.waitForFunction((h) => location.hash === h, max > 1 ? `#/${n}/${max - 1}` : `#/${n}`);
  await page.close();
});

test("editing the URL hash navigates", async () => {
  const page = await present("#/1");
  const { slides } = await deckInfo(page);
  await page.evaluate(() => { location.hash = "#/5"; });
  await page.waitForFunction((id) => document.querySelector(".viewport .stage")?.getAttribute("data-slide-id") === id, slides[4].id);
  assert.equal(await slideId(page), slides[4].id);
  await page.close();
});

test("shortcuts with Ctrl/Meta/Alt are left to the browser", async () => {
  const page = await present("#/1");
  for (const k of ["Control+n", "Meta+n", "Alt+n"]) await page.keyboard.press(k);
  assert.equal(await page.locator(".notes").count(), 0, "notes toggled by a modified key");
  for (const k of ["Control+ArrowRight", "Meta+ArrowRight"]) await page.keyboard.press(k);
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => location.hash), "#/1");
  await page.keyboard.press("n");
  assert.equal(await page.locator(".notes").count(), 1, "plain n should still toggle notes");
  await page.close();
});

test("review fails a deck with duplicate slide ids", { timeout: 300_000 }, () => {
  const idx = join(deck, "src/slides/index.ts");
  const orig = readFileSync(idx, "utf8");
  writeFileSync(idx, orig.replace("title, agenda,", "title, agenda, agenda,"));
  try {
    const r = tryRun(process.execPath, ["scripts/review.mjs"], deck);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /\[duplicate-id\] .*"agenda"/);
  } finally {
    writeFileSync(idx, orig);
  }
});

async function lintSlide(n, mutate) {
  const page = await browser.newPage({ viewport: { width: lib.W, height: lib.H }, reducedMotion: "reduce" });
  try {
    await page.goto(`${url}?static&slide=${n}`);
    await lib.waitReady(page);
    if (mutate) await page.evaluate(mutate);
    return await page.evaluate(readFileSync(join(deck, "scripts/lint-in-page.js"), "utf8"));
  } finally {
    await page.close();
  }
}
const heroIssues = (r) => r.issues.filter((i) => i.rule === "hero-effects");
async function slideList() {
  const probe = await present();
  try { return (await deckInfo(probe)).slides; } finally { await probe.close(); }
}

test("hero-effects passes every example slide", async () => {
  const slides = await slideList();
  for (let n = 1; n <= slides.length; n++) {
    assert.deepEqual(heroIssues(await lintSlide(n)), [], `slide ${n} (${slides[n - 1].id})`);
  }
});

test("hero-effects warns when a Stat slide also gets a glow background", async () => {
  const slides = await slideList();
  const n = slides.findIndex((s) => s.id === "contrast-floor") + 1;
  const r = await lintSlide(n, () => {
    const bg = document.createElement("div");
    bg.className = "bg bg-aurora";
    document.querySelector(".stage").prepend(bg);
  });
  const found = heroIssues(r);
  assert.equal(found.length, 1, JSON.stringify(r.issues));
  assert.equal(found[0].level, "warn");
  assert.match(found[0].msg, /count-up Stat.*glow background/);
});
