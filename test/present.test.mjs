// Browser tests for present mode and the review lint. Needs Chromium for Playwright
// (`npx playwright install chromium` in the template, or CHROME_PATH).
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { scaffold, tryRun } from "./helpers.mjs";

let deck, lib, server, url, browser;
const SCENE = "https://my.spline.design/test-scene-0a1b2c/"; // stubbed with page.route; never fetched for real

// The deck outlives every test in this file, so cleanup lives in the file-level after().
const cleanups = [];
before(async () => {
  deck = scaffold({ after: (fn) => cleanups.push(fn) }, ["--keep-examples"], { install: true });
  addFixtureSlides(deck);
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

/** Test-only slides: a Spline closing scene (no real scene ships with the template) and an uncited EChart. */
function addFixtureSlides(dir) {
  copyFileSync(join(dir, "public/media/title-hero-photo-placeholder.jpg"), join(dir, "public/media/scene-poster.jpg"));
  writeFileSync(join(dir, "src/slides/90-fixtures.tsx"), `import { EChart, SlideFrame, SplineScene } from "../deck/components";
import { defineSlide } from "../deck/types";

export const splineScene = defineSlide({
  id: "spline-scene",
  Component: () => (
    <SlideFrame kind="closing" background="plain" title="A 3D scene closes the talk with one memorable image.">
      <SplineScene src="${SCENE}" poster="/media/scene-poster.jpg" alt="Abstract 3D shapes" height={600} />
    </SlideFrame>
  ),
});

export const uncitedChart = defineSlide({
  id: "uncited-chart",
  Component: () => (
    <SlideFrame kind="results" title="An EChart without a source fails the citation lint.">
      <EChart label="Uncited line" height={500}
        option={{ xAxis: { type: "category", data: ["A", "B", "C"] }, series: [{ name: "S", type: "line", data: [1, 2, 3] }] }} />
    </SlideFrame>
  ),
});
`);
  const idx = join(dir, "src/slides/index.ts");
  writeFileSync(idx, readFileSync(idx, "utf8")
    .replace('import { defineDeck } from "../deck/types";', 'import { defineDeck } from "../deck/types";\nimport { splineScene, uncitedChart } from "./90-fixtures";')
    .replace("mediaFigure, trendChart,", "mediaFigure, trendChart, splineScene, uncitedChart,"));
}

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

const slideNo = async (id) => (await slideList()).findIndex((s) => s.id === id) + 1;
const ruleIssues = (r, rule) => r.issues.filter((i) => i.rule.startsWith(rule));

test("the EChart example renders real SVG text and passes the chart lint", async () => {
  const n = await slideNo("trend-chart");
  const page = await browser.newPage({ viewport: { width: lib.W, height: lib.H }, reducedMotion: "reduce" });
  try {
    await page.goto(`${url}?static&slide=${n}`);
    await lib.waitReady(page);
    assert.ok(await page.locator('[data-figure="echart"] svg text').count() > 10, "ECharts should draw SVG text");
    assert.equal(await page.locator('[data-figure="echart"] .illustrative').count(), 1);
    const r = await page.evaluate(readFileSync(join(deck, "scripts/lint-in-page.js"), "utf8"));
    assert.deepEqual(r.issues, [], JSON.stringify(r.issues));
  } finally {
    await page.close();
  }
});

test("an EChart without cite fails source-missing", async () => {
  const r = await lintSlide(await slideNo("uncited-chart"));
  const found = ruleIssues(r, "source-missing");
  assert.equal(found.length, 1, JSON.stringify(r.issues));
  assert.equal(found[0].level, "error");
  assert.deepEqual(ruleIssues(r, "chart-"), [], "one series needs no highlight");
});

test("chart lint warns on charts that break the chart guide", async () => {
  const r = await lintSlide(await slideNo("trend-chart"), () => {
    const el = document.querySelector('[data-figure="echart"]');
    Object.assign(el.dataset, { chartTypes: "bar,pie", chartSeries: "6", chartPoints: "20", chartHighlight: "none",
      chartBarBaseline: "nonzero", chartDualAxis: "true" });
  });
  const msgs = r.issues.filter((i) => i.rule.startsWith("chart-")).map((i) => `${i.level} ${i.rule} ${i.msg}`);
  for (const re of [/warn chart-type .*pie/, /warn chart-legibility 6 series/, /warn chart-legibility .*no `highlight`/,
    /warn chart-legibility 20 bars/, /warn chart-baseline/, /warn chart-dual-axis/]) {
    assert.ok(msgs.some((m) => re.test(m)), `missing ${re} in ${JSON.stringify(msgs)}`);
  }
});

test("Spline scene shows only its poster in static mode and counts as the hero effect", async () => {
  const n = await slideNo("spline-scene");
  const clean = await lintSlide(n);
  assert.deepEqual(clean.issues, [], JSON.stringify(clean.issues));
  const page = await browser.newPage({ viewport: { width: lib.W, height: lib.H } });
  let hits = 0;
  await page.route("https://my.spline.design/**", (route) => { hits++; return route.abort(); });
  try {
    await page.goto(`${url}?static&slide=${n}`);
    await lib.waitReady(page);
    assert.equal(await page.locator(".spline-scene iframe").count(), 0);
    assert.equal(await page.locator(".spline-scene").getAttribute("data-spline-state"), "poster");
    assert.ok(await page.locator("img[data-spline-poster]").evaluate((img) => img.complete && img.naturalWidth > 0));
    assert.equal(hits, 0, "static mode must not contact Spline");
  } finally {
    await page.close();
  }
  const glow = await lintSlide(n, () => {
    const bg = document.createElement("div");
    bg.className = "bg bg-aurora";
    document.querySelector(".stage").prepend(bg);
  });
  assert.match(heroIssues(glow)[0]?.msg ?? "", /glow background.*Spline 3D scene/);
});

test("Spline lint requires a poster and a hero slide", async () => {
  const n = await slideNo("spline-scene");
  const r = await lintSlide(n, () => {
    document.querySelector("img[data-spline-poster]").remove();
    document.querySelector("[data-title]").dataset.kind = "content";
  });
  assert.equal(ruleIssues(r, "spline-fallback")[0]?.level, "error", JSON.stringify(r.issues));
  assert.equal(ruleIssues(r, "spline-placement")[0]?.level, "warn", JSON.stringify(r.issues));
});

async function presentScene(route, opts = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, ...opts });
  const hits = { n: 0 };
  await page.route("https://my.spline.design/**", (r) => { hits.n++; return route(r); });
  await page.goto(`${url}#/${await slideNo("spline-scene")}`);
  return { page, hits };
}

test("Spline scene goes live in present mode and hides the poster", async () => {
  const { page } = await presentScene((r) => r.fulfill({ status: 200, contentType: "text/html", body: "<body>scene</body>" }));
  try {
    await page.waitForSelector('[data-spline-state="live"]', { timeout: 15_000 });
    assert.equal(await page.locator(".spline-scene iframe").getAttribute("src"), SCENE);
    assert.equal(await page.locator(".spline-scene iframe").getAttribute("sandbox"), "allow-scripts allow-same-origin");
  } finally {
    await page.close();
  }
});

test("Spline scene keeps the poster when the network fails or motion is reduced", async () => {
  const blocked = await presentScene((r) => r.abort());
  try {
    await blocked.page.waitForSelector('[data-spline-state="failed"]', { timeout: 15_000 });
    assert.equal(await blocked.page.locator(".spline-scene iframe").count(), 0);
  } finally {
    await blocked.page.close();
  }
  const reduced = await presentScene((r) => r.abort(), { reducedMotion: "reduce" });
  try {
    await reduced.page.waitForSelector(".spline-scene");
    await reduced.page.waitForTimeout(500);
    assert.equal(await reduced.page.locator(".spline-scene").getAttribute("data-spline-state"), "poster");
    assert.equal(reduced.hits.n, 0, "reduced motion must not contact Spline");
  } finally {
    await reduced.page.close();
  }
});
