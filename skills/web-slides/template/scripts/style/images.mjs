#!/usr/bin/env node
// Build a theme from reference images (mood boards, brand photos, screenshots the user owns).
// Usage: npm run style:images -- <dir|file...> [--name brand] [--k 8] [--apply] [--mood dark|light] [--copy]
// Writes style-import/style-spec.json + src/theme/brand.css. --copy also copies the images to public/media/imported/
// (only for images the user owns or has rights to; they then go through <Figure>).
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { brandCss, decodeImages, kmeans, mapToTokens, mergePalette, parseCli, printSummary, runCheckTokens, writeOutputs, luminance } from "./lib.mjs";

const cli = parseCli();
const EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".svg"]);
const inputs = [cli.target, ...(cli.raw._ || []).slice(1)].filter(Boolean);
if (!inputs.length) { console.error("usage: npm run style:images -- <dir|file...> [--apply]"); process.exit(2); }
const files = inputs.flatMap((p) => !existsSync(p) ? [] : statSync(p).isDirectory()
  ? readdirSync(p).filter((f) => EXT.has(extname(f).toLowerCase())).sort().map((f) => join(p, f)) : [p]);
if (!files.length) { console.error(`no images found in ${inputs.join(", ")}`); process.exit(2); }

const k = +(cli.raw.k || 8);
const decoded = await decodeImages(files, 120);
const perImage = [];
let allPixels = [];
for (const d of decoded) {
  if (d.error) { perImage.push({ file: d.file, error: d.error }); continue; }
  const pal = kmeans(d.pixels, k);
  const avgLum = pal.reduce((a, p) => a + p.lum * p.weight, 0);
  perImage.push({ file: d.file, width: d.width, height: d.height, mood: avgLum < 0.3 ? "dark" : "light", palette: pal.slice(0, 6) });
  allPixels = allPixels.concat(d.pixels);
}
// combined palette: pool per-image palettes so one huge image cannot drown the rest
const combined = mergePalette(perImage.flatMap((p) => (p.palette || []).map((c) => ({ hex: c.hex, weight: c.weight / perImage.length }))));
const pixelPalette = kmeans(allPixels, k);
const votes = perImage.filter((p) => p.mood).reduce((a, p) => ((a[p.mood] = (a[p.mood] || 0) + 1), a), {});
const mood = cli.mood || ((votes.dark || 0) >= (votes.light || 0) ? "dark" : "light");
// bg = the heaviest swatch on the mood side; let the mapper pick text/accents
const bgCand = combined.filter((c) => (mood === "dark" ? luminance(c.hex) < 0.2 : luminance(c.hex) > 0.6))[0];
const mapped = mapToTokens({ palette: combined, bg: bgCand?.hex, mood });

const copied = [];
if (cli.raw.copy) {
  mkdirSync("public/media/imported", { recursive: true });
  for (const f of files) { const to = join("public/media/imported", basename(f).toLowerCase().replace(/[^a-z0-9.]+/g, "-")); copyFileSync(f, to); copied.push(to); }
}

const spec = {
  kind: "images", source: inputs, themeName: cli.name, mood: mapped.mood,
  license: { note: "Colors are not copyrightable; the images themselves are. Copy them into public/ only if the user owns them or has the rights (--copy)." },
  palette: { combined, pixels: pixelPalette }, perImage,
  tokens: mapped.tokens, contrastFixes: mapped.fixes, copied,
};
const css = brandCss({ name: cli.name, tokens: mapped.tokens, source: `images: ${inputs.join(", ")}` });
const specPath = writeOutputs({ spec, css, outDir: cli.outDir, cssPath: cli.cssPath, apply: cli.apply });
for (const p of perImage) console.log(`${basename(p.file)}: ${p.error ? "ERROR " + p.error : `${p.mood}  ${p.palette.slice(0, 5).map((c) => c.hex).join(" ")}`}`);
printSummary({ ...mapped, palette: combined, specPath, cssPath: cli.cssPath });
if (copied.length) console.log(`copied ${copied.length} image(s) → public/media/imported/ (add alt text + caption via <Figure>)`);
process.exit(runCheckTokens());
