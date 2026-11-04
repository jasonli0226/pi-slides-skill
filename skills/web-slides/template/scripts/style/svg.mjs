#!/usr/bin/env node
// Import SVGs: palette from fills/strokes (+ rendered pixels), classify each file
// (background | frame | decorative | icon), normalize, copy to public/media/svg/.
// Usage: npm run style:svg -- <dir|file...> [--name brand] [--apply] [--no-copy] [--no-theme] [--svgo]
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { brandCss, decodeImages, kmeans, mapToTokens, mergePalette, parseCli, parseColor, flatten, printSummary, runCheckTokens, writeOutputs, luminance, chroma } from "./lib.mjs";

const cli = parseCli();
const inputs = [cli.target, ...(cli.raw._ || []).slice(1)].filter(Boolean);
if (!inputs.length) { console.error("usage: npm run style:svg -- <dir|file...> [--apply] [--no-copy]"); process.exit(2); }
const files = inputs.flatMap((p) => !existsSync(p) ? [] : statSync(p).isDirectory()
  ? readdirSync(p).filter((f) => extname(f).toLowerCase() === ".svg").sort().map((f) => join(p, f)) : [p]);
if (!files.length) { console.error("no .svg files found"); process.exit(2); }

const COLOR_RE = /(?:fill|stroke|stop-color|color)\s*[:=]\s*["']?\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-zA-Z]+)/g;

function analyze(src) {
  const counts = {};
  for (const m of src.matchAll(COLOR_RE)) {
    const v = m[1].toLowerCase();
    if (["none", "currentcolor", "transparent", "inherit"].includes(v)) continue;
    const c = parseColor(v); if (!c) continue;
    const h = flatten(c, "#ffffff"); counts[h] = (counts[h] || 0) + 1;
  }
  const svgTag = src.match(/<svg\b[^>]*>/i)?.[0] || "";
  const attr = (n) => svgTag.match(new RegExp(`\\s${n}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
  let vb = attr("viewBox")?.split(/[\s,]+/).map(Number);
  const w = parseFloat(attr("width")), h = parseFloat(attr("height"));
  if (!vb && w && h) vb = [0, 0, w, h];
  const [vw, vh] = vb ? [vb[2], vb[3]] : [w || 0, h || 0];
  const aspect = vw && vh ? vw / vh : 1;
  const paths = (src.match(/<(path|circle|rect|ellipse|polygon|polyline|line)\b/gi) || []).length;
  const hasText = /<text\b/i.test(src), hasImage = /<image\b/i.test(src);
  const fullRect = vb && new RegExp(`<rect[^>]*width=["'](100%|${vw})["'][^>]*height=["'](100%|${vh})["']`, "i").test(src);
  const strokedRect = /<rect[^>]*stroke=["'](?!none)[^"']+["'][^>]*>/i.test(src) && /<rect[^>]*fill=["'](none|transparent)["']/i.test(src);
  const colors = Object.keys(counts);
  let kind = "decorative";
  if (vw && vw <= 64 && Math.abs(aspect - 1) < 0.25 && colors.length <= 2 && !hasImage) kind = "icon";
  else if (Math.abs(aspect - 1) < 0.25 && colors.length <= 1 && paths <= 12 && !fullRect) kind = "icon";
  else if (strokedRect && !fullRect) kind = "frame";
  else if (aspect > 1.5 && (fullRect || /<(linearGradient|radialGradient|pattern)\b/i.test(src))) kind = "background";
  return { counts, viewBox: vb, width: vw, height: vh, aspect: +aspect.toFixed(3), paths, hasText, hasImage, kind, colors };
}

/** light, dependency-free cleanup (svgo is used instead when --svgo and it is installed) */
function normalize(src, info) {
  let s = src
    .replace(/<\?xml[^>]*>\s*/g, "").replace(/<!DOCTYPE[^>]*>\s*/gi, "").replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, "").replace(/<sodipodi:[^>]*\/>/gi, "").replace(/<sodipodi:[\s\S]*?<\/sodipodi:[^>]+>/gi, "")
    .replace(/\s(inkscape|sodipodi|sketch|serif|figma|data-name):?[\w-]*="[^"]*"/gi, "")
    .replace(/\sxmlns:(inkscape|sodipodi|sketch|serif|figma)="[^"]*"/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son\w+="[^"]*"/gi, "") // no scripts / handlers in slide assets
    .replace(/>\s+</g, "><").trim();
  s = s.replace(/<svg\b[^>]*>/i, (tag) => {
    let t = tag;
    if (!/viewBox=/i.test(t) && info.width && info.height) t = t.replace(/<svg/i, `<svg viewBox="0 0 ${info.width} ${info.height}"`);
    if (!/xmlns=/i.test(t)) t = t.replace(/<svg/i, `<svg xmlns="http://www.w3.org/2000/svg"`);
    // icons and frames scale with their container; backgrounds keep intrinsic size for <Figure>
    if (info.kind === "icon" || info.kind === "frame") t = t.replace(/\s(width|height)="[^"]*"/gi, "");
    return t;
  });
  if (info.kind === "icon" && info.colors.length) {
    // single-ink icon → currentColor so it follows --accent / text color
    for (const c of info.colors) s = s.replace(new RegExp(`(fill|stroke)=(["'])${c}\\2`, "gi"), `$1="currentColor"`)
      .replace(new RegExp(`(fill|stroke):\\s*${c}`, "gi"), "$1:currentColor");
    s = s.replace(/(fill|stroke)=(["'])(#[0-9a-f]{3,8}|black|#000)\2/gi, `$1="currentColor"`);
  }
  return s;
}

const analyses = files.map((f) => ({ file: f, src: readFileSync(f, "utf8") })).map((x) => ({ ...x, ...analyze(x.src) }));

// palette: attribute counts (declared ink) + rendered pixels (area), backgrounds weigh most
const declared = mergePalette(analyses.flatMap((a) => Object.entries(a.counts).map(([hex, n]) => ({ hex, weight: n * (a.kind === "background" ? 3 : a.kind === "icon" ? 0.5 : 1) }))));
const rendered = await decodeImages(analyses.filter((a) => a.kind !== "icon").map((a) => a.file), 160);
const pixPal = kmeans(rendered.flatMap((r) => r.pixels || []), 8);
const bgFiles = analyses.filter((a) => a.kind === "background");
const bgPix = bgFiles.length ? kmeans((await decodeImages(bgFiles.map((a) => a.file), 160)).flatMap((r) => r.pixels || []), 6) : [];
const bg = bgPix[0]?.hex;
const mood = cli.mood || (bg ? (luminance(bg) < 0.2 ? "dark" : "light") : undefined);
const accents = declared.filter((c) => chroma(c.hex) > 0.3).slice(0, 2).map((c) => c.hex);
const mapped = mapToTokens({ palette: [...pixPal, ...declared.map((d) => ({ ...d, weight: d.weight * 0.5 }))], bg, accents, mood });

// normalize + copy
const copied = [];
const useSvgo = cli.raw.svgo && spawnSync("npx", ["--no-install", "svgo", "--version"], { encoding: "utf8" }).status === 0;
if (cli.copy) {
  const outDir = "public/media/svg";
  mkdirSync(outDir, { recursive: true });
  for (const a of analyses) {
    const name = `${a.kind}-${basename(a.file, ".svg").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.svg`;
    const to = join(outDir, name);
    writeFileSync(to, normalize(a.src, a));
    if (useSvgo) spawnSync("npx", ["--no-install", "svgo", "--multipass", "-q", to], { stdio: "inherit" });
    copied.push({ from: a.file, to, kind: a.kind, bytes: { before: a.src.length, after: readFileSync(to, "utf8").length } });
  }
}

const spec = {
  kind: "svg", source: inputs, themeName: cli.name, mood: mapped.mood,
  license: { note: "Only import SVGs the user made, owns, or has a license for. Canva elements stay under Canva's Content License: confirm with the user before shipping them in a deck exported outside Canva." },
  palette: { declared, rendered: pixPal, background: bgPix },
  files: analyses.map(({ src, counts, ...a }) => a), copied, tokens: mapped.tokens, contrastFixes: mapped.fixes,
  usage: {
    background: "<Figure src=\"/media/svg/background-*.svg\" decorative fit=\"cover\" frame={false} /> or CSS background-image on a frame",
    frame: "wrap content in a positioned div; use the SVG as an absolutely positioned overlay (pointer-events:none)",
    decorative: "<Figure decorative frame={false} shadow={false}> in a corner; keep under 25% of the stage",
    icon: "inline via <img> with CSS mask (currentColor) or prefer lucide; icons are normalized to currentColor",
  },
};
if (!cli.raw["no-theme"]) {
  const css = brandCss({ name: cli.name, tokens: mapped.tokens, source: `svg: ${inputs.join(", ")}` });
  const specPath = writeOutputs({ spec, css, outDir: cli.outDir, cssPath: cli.cssPath, apply: cli.apply });
  for (const a of analyses) console.log(`${basename(a.file)}: ${a.kind}  ${a.colors.slice(0, 5).join(" ")}`);
  printSummary({ ...mapped, palette: declared, specPath, cssPath: cli.cssPath });
} else {
  mkdirSync(cli.outDir, { recursive: true });
  writeFileSync(join(cli.outDir, "svg-spec.json"), JSON.stringify(spec, null, 2) + "\n");
  for (const a of analyses) console.log(`${basename(a.file)}: ${a.kind}`);
}
for (const c of copied) console.log(`  → ${c.to} (${c.kind}, ${c.bytes.before}→${c.bytes.after} B)`);
if (!useSvgo && cli.raw.svgo) console.log("svgo not installed; used the built-in normalizer (npm i -D svgo to enable)");
process.exit(cli.raw["no-theme"] ? 0 : runCheckTokens());
