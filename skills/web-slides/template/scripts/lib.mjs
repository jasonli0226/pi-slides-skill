// Shared helpers: build the deck, serve dist/, launch Chromium, wait for slides to be ready.
import { build, preview } from "vite";
import { chromium } from "playwright";
import { existsSync } from "node:fs";

export const W = 1920, H = 1080;
export const args = new Set(process.argv.slice(2));
export const argValue = (name, fallback) => {
  const a = process.argv.slice(2);
  const i = a.indexOf(name);
  return i >= 0 && a[i + 1] ? a[i + 1] : fallback;
};

export async function buildAndServe({ skipBuild = false } = {}) {
  const t0 = Date.now();
  if (!skipBuild || !existsSync("dist/index.html")) {
    await build({ logLevel: "warn" });
  }
  const buildMs = Date.now() - t0;
  const server = await preview({ preview: { port: 0, host: "127.0.0.1", strictPort: false }, logLevel: "silent" });
  const url = server.resolvedUrls.local[0];
  return { url, server, buildMs };
}

export async function launch() {
  // Use Playwright's Chromium if installed; else CHROME_PATH or system Chrome.
  const opts = { args: ["--font-render-hinting=none", "--disable-gpu"] };
  try {
    return await chromium.launch(opts);
  } catch (e) {
    const exe = process.env.CHROME_PATH || ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find(existsSync);
    if (!exe) throw new Error("No Chromium found. Run `npx playwright install chromium` or set CHROME_PATH.\n" + e);
    return await chromium.launch({ ...opts, executablePath: exe });
  }
}

export async function waitReady(page, timeout = 30000) {
  await page.waitForFunction(() => window.__DECK_READY__ === true, null, { timeout });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
}
