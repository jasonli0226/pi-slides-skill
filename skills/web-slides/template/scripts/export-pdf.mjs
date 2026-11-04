#!/usr/bin/env node
// Export the deck to PDF (one 1920x1080 page per slide, final state).
// Default: vector PDF via Chromium print (selectable text).
// --raster: pixel-faithful PDF built from screenshots (use if blur/blend effects print wrong).
import { mkdirSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { args, argValue, buildAndServe, launch, waitReady, W, H } from "./lib.mjs";

const outFile = argValue("--out", args.has("--raster") ? "export/deck-raster.pdf" : "export/deck.pdf");
mkdirSync(outFile.replace(/\/[^/]+$/, ""), { recursive: true });
const t0 = Date.now();
const { url, server } = await buildAndServe({ skipBuild: args.has("--no-build") });
const browser = await launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, reducedMotion: "reduce" });

let count;
if (!args.has("--raster")) {
  await page.goto(`${url}?print`);
  await waitReady(page, 60000);
  count = await page.evaluate(() => window.__DECK__.slides.length);
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: outFile, width: `${W}px`, height: `${H}px`, printBackground: true, preferCSSPageSize: true });
} else {
  await page.goto(`${url}?static&slide=1`);
  await waitReady(page);
  count = await page.evaluate(() => window.__DECK__.slides.length);
  const pdf = await PDFDocument.create();
  for (let i = 1; i <= count; i++) {
    await page.goto(`${url}?static&slide=${i}&step=final`);
    await waitReady(page);
    const png = await pdf.embedPng(await page.screenshot());
    pdf.addPage([W, H]).drawImage(png, { x: 0, y: 0, width: W, height: H });
  }
  writeFileSync(outFile, await pdf.save());
}
await browser.close();
await server.close();

// sanity check: one page per slide
const { readFileSync } = await import("node:fs");
const pages = (await PDFDocument.load(readFileSync(outFile))).getPageCount();
const ok = pages === count;
console.log(`export: ${outFile} pages=${pages} slides=${count} ${ok ? "OK" : "MISMATCH"} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
process.exit(ok ? 0 : 1);
