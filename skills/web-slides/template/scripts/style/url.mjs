#!/usr/bin/env node
// Import the *style* of a public web page: colors, type, radius, shadows, spacing, motion.
// Usage: npm run style:url -- <url> [--name brand] [--out style-import] [--css src/theme/brand.css] [--apply] [--mood dark|light]
// Writes: style-import/style-spec.json, style-import/captures/*.png (gitignored, reference only), src/theme/brand.css
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { launch } from "../lib.mjs";
import { brandCss, decodeImages, kmeans, layoutTokens, mapToTokens, parseCli, parseColor, flatten, printSummary, runCheckTokens, swapFont, writeOutputs, chroma, luminance } from "./lib.mjs";

const cli = parseCli();
if (!cli.target || !/^https?:\/\//.test(cli.target)) {
  console.error("usage: npm run style:url -- https://example.com [--apply]");
  process.exit(2);
}
const capDir = join(cli.outDir, "captures");
mkdirSync(capDir, { recursive: true });

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1,
  userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36 web-slides-style-import" });
const page = await ctx.newPage();
await page.goto(cli.target, { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1200);

// screenshots: hero + next 3 viewport sections (reference only, never committed or shipped)
const captures = [];
const pageH = await page.evaluate(() => document.documentElement.scrollHeight);
for (let i = 0; i < 4 && i * 900 < pageH; i++) {
  await page.evaluate((y) => scrollTo(0, y), i * 900);
  await page.waitForTimeout(500);
  const f = join(capDir, `section-${i}.png`);
  await page.screenshot({ path: f });
  captures.push(f);
}
await page.evaluate(() => scrollTo(0, 0));
await page.waitForTimeout(300);

// computed styles across the first ~4 viewports
const css = await page.evaluate(() => {
  const H = 3600;
  const bodyTypes = {};
  const area = {}, textC = {}, linkC = {}, btnC = {}, radii = [], shadows = [], gaps = [], durations = [];
  const add = (m, k, w) => { if (k) m[k] = (m[k] || 0) + w; };
  const vis = (el, r) => r.width > 4 && r.height > 4 && r.top < H && getComputedStyle(el).visibility !== "hidden" && +getComputedStyle(el).opacity > 0.05;
  const all = [...document.querySelectorAll("body, body *")].slice(0, 6000);
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (!vis(el, r)) continue;
    const cs = getComputedStyle(el);
    const a = Math.min(r.width, 1440) * Math.min(r.height, H - Math.max(0, r.top));
    if (cs.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) add(area, cs.backgroundColor, a);
    const ownText = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join("");
    if (ownText.length) {
      add(textC, cs.color, ownText.length * parseFloat(cs.fontSize));
      const fs = parseFloat(cs.fontSize);
      if (fs >= 12 && fs <= 24 && ownText.length > 20) {
        const k = `${fs}|${cs.fontFamily}|${cs.fontWeight}|${cs.lineHeight}`;
        bodyTypes[k] = bodyTypes[k] || { family: cs.fontFamily, size: fs, weight: +cs.fontWeight, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, color: cs.color, n: 0 };
        bodyTypes[k].n += ownText.length;
      }
    }
    const tag = el.tagName.toLowerCase();
    const isBtn = tag === "button" || el.getAttribute("role") === "button" || /\bbtn|button\b/i.test(el.className?.baseVal ?? el.className ?? "");
    if (tag === "a" && ownText.length) add(linkC, cs.color, 1);
    if (isBtn) { add(btnC, cs.backgroundColor, 2); add(linkC, cs.color, 0.5); }
    const rad = parseFloat(cs.borderTopLeftRadius);
    if (rad > 0 && r.width > 60 && r.height > 30 && rad < 200) radii.push({ rad, w: r.width, h: r.height, btn: isBtn });
    if (cs.boxShadow && cs.boxShadow !== "none") shadows.push(cs.boxShadow);
    if (tag === "section" || tag === "main" || /section|hero/i.test(String(el.className))) gaps.push(parseFloat(cs.paddingTop) || 0);
    const d = parseFloat(cs.transitionDuration);
    if (d > 0) durations.push(d);
  }
  const pick = (sel) => { const el = document.querySelector(sel); if (!el) return null; const cs = getComputedStyle(el);
    return { family: cs.fontFamily, size: parseFloat(cs.fontSize), weight: +cs.fontWeight, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, color: cs.color }; };
  // largest visible heading = hero
  const heads = [...document.querySelectorAll("h1, h2, h3, [class*=headline], [class*=hero] *")]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.top < H && r.width > 0 && e.textContent.trim().length > 2; })
    .map((e) => ({ e, s: parseFloat(getComputedStyle(e).fontSize) })).sort((a, b) => b.s - a.s);
  const heroEl = heads[0]?.e, h2El = heads.find((h) => h.s < (heads[0]?.s ?? 0) * 0.85)?.e;
  const typo = (el) => el && (() => { const cs = getComputedStyle(el); return { family: cs.fontFamily, size: parseFloat(cs.fontSize), weight: +cs.fontWeight, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, color: cs.color, sample: el.textContent.trim().slice(0, 60) }; })();
  const root = getComputedStyle(document.documentElement), body = getComputedStyle(document.body);
  const vars = {};
  for (const sheet of [...document.styleSheets]) { try { for (const rule of sheet.cssRules) { if (rule.selectorText === ":root" && rule.style) for (const p of rule.style) if (p.startsWith("--") && /color|bg|background|accent|brand|primary|fill|text/i.test(p)) vars[p] = rule.style.getPropertyValue(p).trim(); } } catch {} }
  return {
    title: document.title,
    bodyBg: body.backgroundColor, rootBg: root.backgroundColor,
    body: Object.values(bodyTypes).sort((a, b) => b.n - a.n)[0] || pick("body"), hero: typo(heroEl), h2: typo(h2El), mono: pick("code, pre, kbd"),
    area, textC, linkC, btnC, radii, shadows: shadows.slice(0, 40), gaps, durations,
    cssVars: Object.fromEntries(Object.entries(vars).slice(0, 60)),
  };
});

// pixel palette from the screenshots (catches gradients/photos the CSS walk misses)
const decoded = await decodeImages(captures, 160);
const pixels = decoded.flatMap((d) => d.pixels || []);
const shotPalette = kmeans(pixels, 10);
await browser.close();

// ---- interpret ----
const pageBg = flatten(parseColor(css.bodyBg)?.a ? css.bodyBg : css.rootBg?.match(/0\)$/) ? "#ffffff" : css.rootBg, "#ffffff") || "#ffffff";
const ranked = (m, over = pageBg) => Object.entries(m).map(([c, w]) => ({ hex: flatten(c, over), w })).filter((x) => x.hex)
  .reduce((acc, x) => { const h = acc.find((a) => a.hex === x.hex); h ? (h.w += x.w) : acc.push({ ...x }); return acc; }, []).sort((a, b) => b.w - a.w);
const bgRank = ranked(css.area);
const totalArea = bgRank.reduce((a, b) => a + b.w, 0) || 1;
const cssPalette = bgRank.slice(0, 8).map((x) => ({ hex: x.hex, weight: x.w / totalArea }));
const textRank = ranked(css.textC);
const accentRank = [...ranked(css.linkC), ...ranked(css.btnC)].filter((x) => chroma(x.hex) > 0.25).sort((a, b) => b.w - a.w);

// dominant bg: the largest-area background (page bg if the page paints none)
const bg = cssPalette[0]?.weight > 0.25 ? cssPalette[0].hex : pageBg;
const text = textRank.find((t) => Math.abs(luminance(t.hex) - luminance(bg)) > 0.4)?.hex;
const accents = [...new Set(accentRank.map((a) => a.hex))].slice(0, 2);
const palette = [...cssPalette, ...shotPalette.map((p) => ({ hex: p.hex, weight: p.weight * 0.5 }))];
const mapped = mapToTokens({ palette, bg, text, accents, mood: cli.mood });

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const btnRadii = css.radii.filter((r) => r.btn).map((r) => r.rad), cardRadii = css.radii.filter((r) => !r.btn && r.w > 200 && r.h > 120).map((r) => r.rad);
const heroPx = css.hero?.size, bodyPx = css.body?.size || 16;
const ls = css.hero && css.hero.letterSpacing !== "normal" ? parseFloat(css.hero.letterSpacing) / css.hero.size : null;
const medDur = median(css.durations);
const shadowFeel = css.shadows.length === 0 ? "none" : css.shadows.some((s) => /rgba\(0, 0, 0, 0\.[3-9]/.test(s)) ? "default" : "soft";
const medGap = median(css.gaps.filter((g) => g > 0));
const layout = {
  radius: median(cardRadii) ?? median(css.radii.map((r) => r.rad)),
  radiusSm: median(btnRadii) != null ? Math.min(median(btnRadii), 24) : undefined,
  // map the page's hero:body ratio onto the slide body (30px)
  heroPx: heroPx ? (heroPx / bodyPx) * 30 * 0.9 : undefined,
  titlePx: css.h2?.size ? (css.h2.size / bodyPx) * 30 * 0.75 : undefined,
  heroWeight: css.hero?.weight, titleWeight: css.h2?.weight,
  tracking: ls,
  shadow: shadowFeel,
  motion: medDur == null ? "calm" : medDur <= 0.25 ? "calm" : medDur >= 0.6 ? "expressive" : "default",
  whitespace: medGap == null ? "default" : medGap >= 80 ? "airy" : medGap <= 32 ? "dense" : "default",
};
const layoutT = layoutTokens(layout);
const fonts = { display: swapFont(css.hero?.family || css.body?.family, "display"), body: swapFont(css.body?.family, "body"), mono: css.mono ? swapFont(css.mono.family, "mono") : null };

const spec = {
  kind: "url", source: cli.target, title: css.title, capturedAt: new Date().toISOString(), themeName: cli.name,
  license: { borrowed: "colors, type scale, spacing, radius, motion feel", notBorrowed: "logos, product photos, illustrations, proprietary fonts",
    captures: "style-import/captures/* are reference only; never commit or put them in public/" },
  mood: mapped.mood,
  palette: { css: cssPalette.map((p) => ({ ...p, weight: +p.weight.toFixed(3) })), screenshot: shotPalette, text: textRank.slice(0, 4).map((t) => t.hex), accents },
  typography: { hero: css.hero, h2: css.h2, body: css.body, mono: css.mono },
  fonts, layout: { measured: layout, tokens: layoutT }, cssVars: css.cssVars,
  tokens: mapped.tokens, contrastFixes: mapped.fixes, captures,
};
const outCss = brandCss({ name: cli.name, tokens: mapped.tokens, fonts, layout: layoutT, source: cli.target });
const specPath = writeOutputs({ spec, css: outCss, outDir: cli.outDir, cssPath: cli.cssPath, apply: cli.apply });
printSummary({ ...mapped, palette: [...cssPalette, ...shotPalette].slice(0, 8), fonts, specPath, cssPath: cli.cssPath });
console.log(`layout: ${Object.entries(layoutT).map(([k, v]) => `--${k}:${v}`).join(" ")}`);
console.log(`captures (reference only, gitignored): ${capDir}/`);
process.exit(runCheckTokens());
