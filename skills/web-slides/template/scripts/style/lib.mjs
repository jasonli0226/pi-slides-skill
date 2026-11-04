// Shared style-import helpers: color math, k-means palette, role mapping,
// WCAG auto-fix, font swaps, brand.css writer. Zero extra deps.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

/* ---------------- color math ---------------- */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const hex = ({ r, g, b }) => "#" + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("");

const NAMED = { white: "#ffffff", black: "#000000", red: "#ff0000", green: "#008000", blue: "#0000ff", gray: "#808080", grey: "#808080",
  orange: "#ffa500", yellow: "#ffff00", purple: "#800080", navy: "#000080", teal: "#008080", silver: "#c0c0c0" };

/** Parse #rgb, #rrggbb, #rrggbbaa, rgb(), rgba(), named basics. Returns {r,g,b,a} or null. */
export function parseColor(input) {
  if (!input) return null;
  let s = String(input).trim().toLowerCase();
  if (NAMED[s]) s = NAMED[s];
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean);
    if (p.length < 3) return null;
    const ch = (v) => (v.endsWith("%") ? parseFloat(v) * 2.55 : parseFloat(v));
    const a = p[3] === undefined ? 1 : p[3].endsWith("%") ? parseFloat(p[3]) / 100 : parseFloat(p[3]);
    return { r: ch(p[0]), g: ch(p[1]), b: ch(p[2]), a };
  }
  return null;
}

export function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}
export function hslToRgb({ h, s, l }) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return { r: f(h + 1 / 3) * 255, g: f(h) * 255, b: f(h - 1 / 3) * 255 };
}
export function luminance(c) {
  const { r, g, b } = typeof c === "string" ? parseColor(c) : c;
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
export const chroma = (c) => { const { r, g, b } = typeof c === "string" ? parseColor(c) : c; return (Math.max(r, g, b) - Math.min(r, g, b)) / 255; };
export const hueDist = (a, b) => { const d = Math.abs(rgbToHsl(parseColor(a)).h - rgbToHsl(parseColor(b)).h) % 360; return d > 180 ? 360 - d : d; };
export const rgbDist = (a, b) => { const x = parseColor(a), y = parseColor(b); return Math.hypot(x.r - y.r, x.g - y.g, x.b - y.b); };
/** mix a→b by t (0..1) in sRGB */
export function mix(a, b, t) {
  const x = parseColor(a), y = parseColor(b);
  return hex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t });
}
/** composite a translucent color over a background */
export function flatten(c, over = "#ffffff") {
  const x = typeof c === "string" ? parseColor(c) : c;
  if (!x) return null;
  const y = parseColor(over), a = x.a ?? 1;
  return hex({ r: x.r * a + y.r * (1 - a), g: x.g * a + y.g * (1 - a), b: x.b * a + y.b * (1 - a) });
}
export const rgba = (c, a) => { const { r, g, b } = parseColor(c); return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`; };

/**
 * Make fg reach `min` contrast against bg by moving lightness only (hue and
 * saturation kept). Moves away from bg's luminance; if that direction caps out,
 * tries the other. Returns { color, from, ratio, adjusted }.
 */
export function ensureContrast(fg, bg, min = 4.5) {
  const start = contrast(fg, bg);
  if (start >= min) return { color: fg, from: fg, ratio: start, adjusted: false };
  const hsl = rgbToHsl(parseColor(fg));
  const bgDark = luminance(bg) < 0.18;
  for (const dir of bgDark ? [1, -1] : [-1, 1]) {
    for (let step = 1; step <= 100; step++) {
      const l = clamp(hsl.l + dir * step * 0.01, 0, 1);
      // keep some saturation but avoid neon at extremes
      const c = hex(hslToRgb({ h: hsl.h, s: hsl.s, l }));
      if (contrast(c, bg) >= min) return { color: c, from: fg, ratio: contrast(c, bg), adjusted: true };
      if (l === 0 || l === 1) break;
    }
  }
  const bw = contrast("#ffffff", bg) > contrast("#000000", bg) ? "#ffffff" : "#000000";
  return { color: bw, from: fg, ratio: contrast(bw, bg), adjusted: true };
}

/* ---------------- palette (k-means on pixels) ---------------- */
/**
 * pixels: flat [r,g,b,a,...] (Uint8ClampedArray or Array). Returns clusters
 * sorted by weight: [{ hex, weight (0..1), lum, chroma }].
 * Deterministic: k-means++ style seeding with a fixed LCG.
 */
export function kmeans(pixels, k = 8, iters = 12) {
  const pts = [];
  for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] > 200) pts.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
  if (!pts.length) return [];
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const cents = [pts[Math.floor(rnd() * pts.length)].slice()];
  while (cents.length < Math.min(k, pts.length)) {
    const ds = pts.map((p) => Math.min(...cents.map((c) => d2(p, c))));
    const tot = ds.reduce((a, b) => a + b, 0);
    if (tot === 0) break;
    let r = rnd() * tot, i = 0;
    while ((r -= ds[i]) > 0 && i < ds.length - 1) i++;
    cents.push(pts[i].slice());
  }
  const assign = new Array(pts.length).fill(0);
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < pts.length; i++) {
      let best = 0, bd = Infinity;
      for (let c = 0; c < cents.length; c++) { const d = d2(pts[i], cents[c]); if (d < bd) { bd = d; best = c; } }
      assign[i] = best;
    }
    const sums = cents.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < pts.length; i++) { const s = sums[assign[i]]; s[0] += pts[i][0]; s[1] += pts[i][1]; s[2] += pts[i][2]; s[3]++; }
    sums.forEach((s, c) => { if (s[3]) cents[c] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
  }
  const counts = cents.map(() => 0);
  assign.forEach((c) => counts[c]++);
  const out = cents.map((c, i) => ({ hex: hex({ r: c[0], g: c[1], b: c[2] }), weight: counts[i] / pts.length }))
    .filter((c) => c.weight > 0.002);
  return mergePalette(out);
}

/** merge near-duplicate swatches (ΔRGB < 18) and annotate */
export function mergePalette(list) {
  const out = [];
  for (const c of [...list].sort((a, b) => b.weight - a.weight)) {
    const hit = out.find((o) => rgbDist(o.hex, c.hex) < 18);
    if (hit) hit.weight += c.weight; else out.push({ ...c });
  }
  const tot = out.reduce((a, c) => a + c.weight, 0) || 1;
  return out.map((c) => ({ hex: c.hex, weight: +(c.weight / tot).toFixed(4), lum: +luminance(c.hex).toFixed(3), chroma: +chroma(c.hex).toFixed(3) }))
    .sort((a, b) => b.weight - a.weight);
}

/** Decode image files to RGBA pixels in Chromium (no image deps). Downsamples to `size`. */
export async function decodeImages(files, size = 96) {
  const { launch } = await import("../lib.mjs");
  const browser = await launch();
  const page = await browser.newPage();
  const results = [];
  for (const f of files) {
    const ext = f.split(".").pop().toLowerCase();
    const mime = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml", avif: "image/avif" }[ext];
    if (!mime) continue;
    const dataUrl = `data:${mime};base64,${readFileSync(f).toString("base64")}`;
    try {
      const r = await page.evaluate(async ({ dataUrl, size }) => {
        const img = new Image();
        img.src = dataUrl;
        await img.decode();
        const w0 = img.naturalWidth || 300, h0 = img.naturalHeight || 150;
        const sc = Math.min(1, size / Math.max(w0, h0));
        const w = Math.max(1, Math.round(w0 * sc)), h = Math.max(1, Math.round(h0 * sc));
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0, w, h);
        return { w0, h0, data: Array.from(ctx.getImageData(0, 0, w, h).data) };
      }, { dataUrl, size });
      results.push({ file: f, width: r.w0, height: r.h0, pixels: r.data });
    } catch (e) {
      results.push({ file: f, error: String(e).slice(0, 200) });
    }
  }
  await browser.close();
  return results;
}

/* ---------------- fonts: borrow the feel, ship a free face ---------------- */
// Proprietary or licensed-per-site families → free close alternative.
// "installed" = already bundled in the template via Fontsource.
export const FONT_SWAPS = [
  { match: /sf pro display|sf pro text|sf pro|-apple-system|system-ui|blinkmacsystemfont|\.sfns/i, use: "Inter Variable", installed: true, note: "SF Pro is Apple-licensed; Inter is the closest open neo-grotesk" },
  { match: /helvetica neue|helvetica|arial|neue haas|nimbus sans/i, use: "Inter Variable", installed: true, note: "neo-grotesk → Inter" },
  { match: /segoe ui/i, use: "Inter Variable", installed: true, note: "Segoe is Microsoft-licensed" },
  { match: /circular|gt walsheim|avenir|futura|gotham|proxima nova|graphik|brandon/i, use: "Space Grotesk Variable", installed: true, note: "geometric/humanist display; or install @fontsource-variable/manrope / figtree" },
  { match: /gt america|founders grotesk|aktiv grotesk|untitled sans|soehne|söhne/i, use: "Inter Variable", installed: true, note: "commercial grotesk → Inter" },
  { match: /sf mono|menlo|monaco|consolas|operator mono|dank mono|cascadia|fira code|courier/i, use: "JetBrains Mono Variable", installed: true, note: "mono → JetBrains Mono" },
  { match: /georgia|times|tiempos|freight|chronicle|garamond|caslon|new york|playfair|lora|merriweather|source serif/i, use: "Source Serif 4 Variable", installed: false, pkg: "@fontsource-variable/source-serif-4", note: "serif → Source Serif 4 (install it)" },
];
// Free Google/Fontsource families: keep, but they must be installed.
const FREE = { inter: ["Inter Variable", true], "space grotesk": ["Space Grotesk Variable", true], "jetbrains mono": ["JetBrains Mono Variable", true],
  roboto: ["Roboto Flex Variable", false, "@fontsource-variable/roboto-flex"], "open sans": ["Open Sans Variable", false, "@fontsource-variable/open-sans"],
  manrope: ["Manrope Variable", false, "@fontsource-variable/manrope"], "dm sans": ["DM Sans Variable", false, "@fontsource-variable/dm-sans"],
  "ibm plex sans": ["IBM Plex Sans", false, "@fontsource/ibm-plex-sans"], poppins: ["Poppins", false, "@fontsource/poppins"],
  montserrat: ["Montserrat Variable", false, "@fontsource-variable/montserrat"], figtree: ["Figtree Variable", false, "@fontsource-variable/figtree"] };

export function swapFont(stack, role = "body") {
  const families = String(stack || "").split(",").map((f) => f.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  const first = families[0] || "";
  for (const f of families) {
    const free = FREE[f.toLowerCase().replace(/ variable$/, "")];
    if (free) return { source: first, use: free[0], installed: free[1], pkg: free[2], reason: free[1] ? "free font, already bundled" : `free font; npm i ${free[2]} and import it in main.tsx` };
    const sw = FONT_SWAPS.find((s) => s.match.test(f));
    if (sw) return { source: first, use: sw.use, installed: sw.installed, pkg: sw.pkg, reason: sw.note };
  }
  const fallback = role === "mono" ? "JetBrains Mono Variable" : role === "display" ? "Space Grotesk Variable" : "Inter Variable";
  return { source: first, use: fallback, installed: true, reason: "unknown/licensed family → bundled default" };
}
export const fontStack = (name, role) =>
  role === "mono" ? `"${name}", ui-monospace, monospace`
    : [`"${name}"`, ...(name === "Inter Variable" ? [] : ['"Inter Variable"']), "ui-sans-serif", "system-ui", "sans-serif"].join(", ");

/* ---------------- palette → role tokens ---------------- */
/**
 * input: { palette:[{hex,weight}], bg?, text?, accents?:[hex], mood?: "dark"|"light" }
 * Explicit hints (from computed CSS) win; the palette fills the gaps.
 * Returns { mood, tokens, fixes:[{token,from,to,against,ratio}] }.
 */
export function mapToTokens({ palette = [], bg, text, accents = [], mood } = {}) {
  const pal = palette.filter((p) => p.hex);
  const avgLum = pal.reduce((a, p) => a + luminance(p.hex) * p.weight, 0) / (pal.reduce((a, p) => a + p.weight, 0) || 1);
  const baseBg = bg || (pal[0] && pal[0].hex) || "#0b1020";
  mood = mood || (luminance(baseBg) < 0.2 || (!bg && avgLum < 0.25) ? "dark" : "light");
  const dark = mood === "dark";

  // bg: keep hue, clamp lightness into a slide-safe band
  let bgC = rgbToHsl(parseColor(baseBg));
  bgC = { ...bgC, l: dark ? clamp(bgC.l, 0.03, 0.14) : clamp(bgC.l, 0.94, 1), s: Math.min(bgC.s, dark ? 0.6 : 0.4) };
  const bgHex = hex(hslToRgb(bgC));
  const toward = dark ? "#ffffff" : "#000000";
  // light pages with an off-white bg usually put white cards on it (lift); pure-white bgs get a tint
  const lift = !dark && bgC.l < 0.985;
  const surface = lift ? "#ffffff" : mix(bgHex, toward, dark ? 0.06 : 0.035);
  const surface2 = lift ? mix(bgHex, "#000000", 0.035) : mix(bgHex, toward, dark ? 0.11 : 0.07);
  const bgElev = mix(bgHex, toward, dark ? 0.03 : 0.02);
  const border = mix(bgHex, toward, dark ? 0.18 : 0.13);

  // text: explicit, else the palette's best-contrast low-chroma color, else tinted near-white/black
  let textHex = text;
  if (!textHex) {
    const cands = pal.filter((p) => chroma(p.hex) < 0.25).sort((a, b) => contrast(b.hex, bgHex) - contrast(a.hex, bgHex));
    textHex = cands[0] && contrast(cands[0].hex, bgHex) >= 7 ? cands[0].hex : mix(dark ? "#f8fafc" : "#0b1220", bgHex, 0.04);
  }
  const textMuted = mix(textHex, bgHex, 0.38);

  // accents: explicit first, then most saturated palette colors far from bg and each other
  const pool = [...accents.map((h) => ({ hex: h, weight: 1 })), ...pal]
    .filter((p) => chroma(p.hex) > 0.22 && rgbDist(p.hex, bgHex) > 60)
    // usable as text/strokes on this bg: drop near-black maroons on light, pastels on dark (photo noise)
    .filter((p) => { const L = rgbToHsl(parseColor(p.hex)).l; return dark ? L >= 0.25 && L <= 0.9 : L >= 0.2 && L <= 0.75; })
    .map((p) => ({ ...p, score: chroma(p.hex) * Math.sqrt(p.weight + 0.02) }));
  const picked = [];
  for (const p of [...pool.slice(0, accents.length), ...pool.slice(accents.length).sort((a, b) => b.score - a.score)]) {
    if (picked.every((q) => hueDist(q, p.hex) > 28)) picked.push(p.hex);
    if (picked.length === 3) break;
  }
  const rotate = (h, deg) => { const x = rgbToHsl(parseColor(h)); return hex(hslToRgb({ ...x, h: x.h + deg, s: Math.max(x.s, 0.55) })); };
  if (!picked.length) picked.push(dark ? "#7dd3fc" : "#0369a1");
  if (picked.length < 2) picked.push(rotate(picked[0], 40));
  if (picked.length < 3) picked.push(rotate(picked[0], -120));

  const tokens = {
    "bg": bgHex, "bg-elev": bgElev, "surface": surface, "surface-2": surface2, "border": border,
    "text": textHex, "text-muted": textMuted,
    "accent": picked[0], "accent-2": picked[1], "accent-3": picked[2],
    "warning": dark ? "#fbbf24" : "#b45309", "danger": dark ? "#fb7185" : "#b91c1c",
    "on-accent": "#ffffff",
    "code-bg": dark ? mix(bgHex, "#000000", 0.35) : "#0f172a",
    "code-theme": "github-dark-default",
  };
  // contrast auto-fix against the hardest background in each pair set (mirrors check-tokens)
  const fixes = [];
  const fix = (tok, againstList, min) => {
    for (let pass = 0; pass < 3; pass++) {
      const worst = againstList.map((t) => tokens[t]).sort((a, b) => contrast(tokens[tok], a) - contrast(tokens[tok], b))[0];
      const r = ensureContrast(tokens[tok], worst, min);
      if (!r.adjusted) return;
      fixes.push({ token: tok, from: r.from, to: r.color, against: worst, ratio: +r.ratio.toFixed(2) });
      tokens[tok] = r.color;
    }
  };
  fix("text", ["bg", "surface", "surface-2"], 7);
  fix("text-muted", ["bg", "surface", "bg-elev"], 4.6);
  for (const t of ["accent", "accent-2", "accent-3", "warning", "danger"]) fix(t, ["bg", "surface"], 4.6);
  // on-accent: whichever of white/near-black/bg reads best on accent
  const onCands = ["#ffffff", dark ? bgHex : "#0b1220", "#000000"];
  tokens["on-accent"] = onCands.sort((a, b) => contrast(b, tokens.accent) - contrast(a, tokens.accent))[0];
  if (contrast(tokens["on-accent"], tokens.accent) < 4.5) {
    const r = ensureContrast(tokens.accent, tokens["on-accent"], 4.6);
    fixes.push({ token: "accent", from: tokens.accent, to: r.color, against: tokens["on-accent"], ratio: +r.ratio.toFixed(2) });
    tokens.accent = r.color;
  }
  tokens["glow-1"] = rgba(tokens.accent, dark ? 0.22 : 0.14);
  tokens["glow-2"] = rgba(tokens["accent-2"], dark ? 0.18 : 0.12);
  tokens["glow-3"] = rgba(tokens["accent-3"], dark ? 0.14 : 0.10);
  tokens["accent-gradient"] = `linear-gradient(90deg, ${tokens.accent}, ${tokens["accent-2"]})`;
  return { mood, tokens, fixes };
}

/* ---------------- layout feel → layout tokens ---------------- */
/** layout: { radius, radiusSm, heroPx, titlePx, heroWeight, titleWeight, tracking, shadow, motion: "calm"|"default"|"expressive", whitespace: "airy"|"default"|"dense" } */
export function layoutTokens(layout = {}) {
  const t = {};
  if (layout.radius != null) t["radius"] = `${clamp(Math.round(layout.radius), 0, 40)}px`;
  if (layout.radiusSm != null) t["radius-sm"] = `${clamp(Math.round(layout.radiusSm), 0, 24)}px`;
  // slide scale is fixed at 1920×1080: borrow the *ratio*, clamp to readable bands
  if (layout.heroPx) t["fs-hero"] = `${clamp(Math.round(layout.heroPx), 96, 144)}px`;
  if (layout.titlePx) t["fs-title"] = `${clamp(Math.round(layout.titlePx), 52, 72)}px`;
  if (layout.heroWeight) t["hero-weight"] = String(clamp(Math.round(layout.heroWeight / 50) * 50, 500, 800));
  if (layout.titleWeight) t["title-weight"] = String(clamp(Math.round(layout.titleWeight / 50) * 50, 500, 750));
  if (layout.tracking != null) { t["hero-tracking"] = `${clamp(layout.tracking, -0.05, 0.02).toFixed(3)}em`; t["title-tracking"] = `${clamp(layout.tracking * 0.6, -0.03, 0.02).toFixed(3)}em`; }
  if (layout.shadow === "none") { t["shadow-card"] = "none"; t["shadow-elev"] = "0 1px 2px rgba(0,0,0,.08)"; }
  else if (layout.shadow === "soft") { t["shadow-card"] = "0 2px 8px rgba(0,0,0,.06), 0 12px 32px rgba(0,0,0,.08)"; t["shadow-elev"] = "0 20px 50px rgba(0,0,0,.18)"; }
  if (layout.motion) t["motion-scale"] = { calm: "0.7", default: "1", expressive: "1.2" }[layout.motion] || "1";
  if (layout.whitespace === "airy") { t["pad-x"] = "144px"; t["pad-top"] = "112px"; }
  else if (layout.whitespace === "dense") { t["pad-x"] = "96px"; t["pad-top"] = "80px"; }
  return t;
}

/* ---------------- writers ---------------- */
export function brandCss({ name = "brand", tokens, fonts = {}, layout = {}, source = "" }) {
  const lines = [
    `/* Generated by style import (${source}). Borrowed style, not assets.`,
    ` * Re-run the style:* script to regenerate; hand edits are fine but keep 6-digit hex so check:tokens can read them. */`,
    `[data-theme="${name}"] {`,
  ];
  for (const [k, v] of Object.entries(tokens)) lines.push(`  --${k}: ${v};`);
  if (fonts.display) lines.push(`  --font-display: ${fontStack(fonts.display.use, "display")};`);
  if (fonts.body) lines.push(`  --font-body: ${fontStack(fonts.body.use, "body")};`);
  if (fonts.mono) lines.push(`  --font-mono: ${fontStack(fonts.mono.use, "mono")};`);
  for (const [k, v] of Object.entries(layout)) lines.push(`  --${k}: ${v};`);
  lines.push("}", "");
  return lines.join("\n");
}

export function writeOutputs({ spec, css, outDir, cssPath, apply }) {
  mkdirSync(outDir, { recursive: true });
  const specPath = join(outDir, "style-spec.json");
  writeFileSync(specPath, JSON.stringify(spec, null, 2) + "\n");
  mkdirSync(dirname(cssPath), { recursive: true });
  writeFileSync(cssPath, css);
  if (apply) {
    const idx = "src/slides/index.ts";
    if (existsSync(idx)) writeFileSync(idx, readFileSync(idx, "utf8").replace(/theme:\s*"[^"]*"/, `theme: "${spec.themeName}"`));
  }
  return specPath;
}

export function runCheckTokens() {
  const r = spawnSync(process.execPath, ["scripts/check-tokens.mjs"], { stdio: "inherit" });
  return r.status ?? 1;
}

export function parseCli(argv = process.argv.slice(2)) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2), nx = argv[i + 1];
      if (nx !== undefined && !nx.startsWith("--")) { opts[k] = nx; i++; } else opts[k] = true;
    } else opts._.push(a);
  }
  return {
    target: opts._[0],
    name: opts.name || "brand",
    outDir: opts.out || "style-import",
    cssPath: opts.css || "src/theme/brand.css",
    apply: !!opts.apply,
    mood: opts.mood,
    copy: !opts["no-copy"],
    raw: opts,
  };
}

export function printSummary({ mood, tokens, fixes, palette, fonts, specPath, cssPath }) {
  const sw = (palette || []).slice(0, 8).map((p) => `${p.hex} ${(p.weight * 100).toFixed(0)}%`).join("  ");
  console.log(`\nstyle import → ${cssPath} (+ ${specPath})`);
  if (sw) console.log(`palette: ${sw}`);
  console.log(`mood: ${mood}  bg ${tokens.bg}  surface ${tokens.surface}  text ${tokens.text}  accent ${tokens.accent} / ${tokens["accent-2"]} / ${tokens["accent-3"]}`);
  if (fonts) for (const [r, f] of Object.entries(fonts)) if (f) console.log(`font ${r}: ${f.source || "(none)"} → ${f.use}${f.installed ? "" : `  (install ${f.pkg})`}`);
  for (const f of fixes) console.log(`contrast fix: --${f.token} ${f.from} → ${f.to} (${f.ratio}:1 on ${f.against})`);
}
