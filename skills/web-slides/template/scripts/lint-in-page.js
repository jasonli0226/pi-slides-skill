// Runs inside the browser on one static slide. Returns a list of issues.
// Rules: frame, title-sentence, source-missing, cite-unknown, leftover, emoji-icon,
//        img-alt, img-broken, off-stage, footer-overlap, clipped, uneven-gaps, absolute-spam,
//        tiny-text, contrast.
(() => {
  const issues = [];
  const add = (level, rule, msg, el) =>
    issues.push({ level, rule, msg, text: el ? (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 90) : undefined });
  const stage = document.querySelector(".stage");
  const sr = stage.getBoundingClientRect();
  const frame = stage.querySelector("[data-title]");

  /* ---- structure + title ---- */
  if (!frame) add("error", "frame", "Slide does not use <SlideFrame> (no data-title).");
  const kind = frame?.dataset.kind ?? "";
  const title = frame?.dataset.title ?? "";
  if (frame && kind !== "section") {
    const words = title.trim().split(/\s+/).filter(Boolean).length;
    if (words < 5) add("error", "title-sentence", `Title "${title}" is not a full-sentence takeaway (${words} words).`);
    if (!/[.!?]$/.test(title.trim())) add("warn", "title-sentence", `Title "${title}" should read as a sentence (end with a period).`);
    if (title.length > 110) add("warn", "title-length", `Title is ${title.length} chars; aim for <= 110 so it fits two lines.`);
  }

  /* ---- sources ---- */
  stage.querySelectorAll("[data-uncited]").forEach((el) =>
    add("error", "source-missing", "A Stat/BarChart/Quote/Figure has no `cite` (or `illustrative`).", el.parentElement));
  stage.querySelectorAll("[data-cite-missing]").forEach((el) =>
    add("error", "cite-unknown", `<Cite id="${el.dataset.cite}"> is not in this slide's sources.`, el.parentElement));

  /* ---- media / images ---- */
  stage.querySelectorAll("img").forEach((el) => {
    if (!el.hasAttribute("alt")) add("error", "img-alt", "Image is missing an alt attribute. Use <Figure alt=\"...\">.", el);
    else if (!(el.getAttribute("alt") || "").trim() && el.getAttribute("data-decorative") !== "true")
      add("error", "img-alt", "Image alt is empty. Describe the image, or mark it data-decorative=\"true\".", el);
    if (el.complete && el.naturalWidth === 0)
      add("error", "img-broken", `Image failed to load: ${el.getAttribute("src") || "(no src)"}.`, el);
  });

  /* ---- leftovers ---- */
  const text = stage.innerText;
  const leftover = text.match(/lorem|ipsum|\bTODO\b|\bTBD\b|\bFIXME\b|\bXXX\b|placeholder|click to (add|edit)|your (title|text|logo) here|\{\{|\}\}|\[object Object\]/i) || text.match(/\bundefined\b|\bNaN\b/);
  if (leftover) add("error", "leftover", `Template leftover / broken value: "${leftover[0]}".`);
  const emoji = [...text.matchAll(/\p{Extended_Pictographic}/gu)].map((m) => m[0]).filter((c) => !"©®™".includes(c));
  if (emoji.length) add("error", "emoji-icon", `Emoji found (${emoji.join(" ")}). Use <Icon icon={...}> from lucide-react instead.`);

  /* ---- geometry ---- */
  const isBg = (el) => !!el.closest(".bg");
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") return false;
    let o = 1, n = el;
    while (n && n !== stage) { o *= parseFloat(getComputedStyle(n).opacity || "1"); n = n.parentElement; }
    return o > 0.05;
  };
  const footer = stage.querySelector(".frame-footer");
  const fr = footer?.getBoundingClientRect();
  const body = stage.querySelector(".frame-body");
  for (const el of stage.querySelectorAll("*")) {
    if (isBg(el) || el.closest("svg") && el.tagName !== "svg") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || !visible(el)) continue;
    if (r.left < sr.left - 1 || r.top < sr.top - 1 || r.right > sr.right + 1 || r.bottom > sr.bottom + 1) {
      add("error", "off-stage", `<${el.tagName.toLowerCase()} class="${el.className?.baseVal ?? el.className}"> extends outside the 1920x1080 stage.`, el);
      continue;
    }
    if (fr && body?.contains(el) && el.children.length === 0 && r.bottom > fr.top - 4 && (el.textContent || "").trim())
      add("error", "footer-overlap", "Content runs into the sources/footer band.", el);
    const cs = getComputedStyle(el);
    if (["hidden", "clip"].includes(cs.overflow) && el.scrollHeight > el.clientHeight + 2 && (el.textContent || "").trim() && !el.closest(".overview"))
      if (!el.classList.contains("stage") && !el.classList.contains("frame") && !el.classList.contains("print-page"))
        add("error", "clipped", "Text is clipped by an overflow:hidden container.", el);
  }

  /* ---- layout feel: uneven gutters + absolute spam in the body ---- */
  const layoutRoots = stage.querySelectorAll(
    ".grid-2, .grid-3, .grid-4, .row, .layout-kpi, .layout-compare, .layout-hero, .layout-hero-flip, .layout-stack"
  );
  for (const root of layoutRoots) {
    const kids = [...root.children].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && visible(el) && !isBg(el);
    });
    if (kids.length < 2) continue;
    const cs = getComputedStyle(root);
    const horizontal = cs.display.includes("flex")
      ? (cs.flexDirection || "row").startsWith("row")
      : true;
    const gaps = [];
    for (let i = 0; i < kids.length - 1; i++) {
      const a = kids[i].getBoundingClientRect();
      const b = kids[i + 1].getBoundingClientRect();
      if (horizontal) {
        if (Math.abs(a.top - b.top) > 8) continue;
        gaps.push(b.left - a.right);
      } else {
        if (Math.abs(a.left - b.left) > 8) continue;
        gaps.push(b.top - a.bottom);
      }
    }
    if (gaps.length >= 2) {
      const lo = Math.min(...gaps), hi = Math.max(...gaps);
      if (hi - lo > 16) {
        add("warn", "uneven-gaps",
          `Sibling gutters in .${[...root.classList].join(".")} differ by ${(hi - lo).toFixed(0)}px (min ${lo.toFixed(0)}, max ${hi.toFixed(0)}). Prefer gap + equal flex/grid tracks.`,
          root);
      }
    }
    const cards = kids.filter((el) => el.classList?.contains("card"));
    if (cards.length >= 2) {
      const hs = cards.map((el) => el.getBoundingClientRect().height);
      const lo = Math.min(...hs), hi = Math.max(...hs);
      if (hi - lo > 24) {
        add("warn", "uneven-gaps",
          `Card heights in a row differ by ${(hi - lo).toFixed(0)}px. Use align-items: stretch (layout-compare / grid-*) so peers match.`,
          cards[0]);
      }
    }
  }
  let absCount = 0;
  for (const el of stage.querySelectorAll(".frame-body *")) {
    if (isBg(el) || el.closest(".bg") || el.closest("svg")) continue;
    if (getComputedStyle(el).position === "absolute") {
      if (el.closest(".timeline, .dg-c4, .dg-seq, .dg-layered, .dg-flow, .deck-figure, .mermaid-box, .code-window, [data-figure]")) continue;
      absCount++;
    }
  }
  if (absCount > 3) {
    add("warn", "absolute-spam",
      `${absCount} position:absolute nodes in the frame body. Prefer Grid/Flex layouts (see layout-guide.md).`);
  }

  /* ---- text: size + contrast ---- */
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (top, bot) => ({
    r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a),
    b: top.b * top.a + bot.b * (1 - top.a), a: 1,
  });
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const bgOf = (el) => {
    const chain = [];
    for (let n = el; n; n = n.parentElement) chain.push(n);
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    for (const n of chain.reverse()) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0) bg = over(c, bg);
    }
    return bg;
  };
  const seen = new Set();
  const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (!t.textContent.trim()) continue;
    const el = t.parentElement;
    if (!el || isBg(el) || el.closest("svg") || !visible(el)) continue;
    const cs = getComputedStyle(el);
    const px = parseFloat(cs.fontSize);
    if (px < 18) add("error", "tiny-text", `Text is ${px}px; minimum on the 1920 stage is 18px.`, el);
    const fg = parse(cs.color);
    if (!fg || fg.a === 0) continue; // gradient-clipped text: verified visually + via tokens
    const bg = bgOf(el);
    const cr = ratio(over(fg, bg), bg);
    const large = px >= 24 || (px >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
    const need = large ? 3 : 4.5;
    const key = `${cs.color}|${JSON.stringify(bg)}|${need}`;
    if (cr < need && !seen.has(key)) {
      seen.add(key);
      add("error", "contrast", `Contrast ${cr.toFixed(2)}:1 < ${need}:1 (${cs.color} on rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)}), ${px}px).`, el);
    }
  }
  /* ---- diagram/chart text: SVG is scaled, so measure the rendered size ---- */
  let minSvg = Infinity, minEl = null;
  for (const el of stage.querySelectorAll("svg text, svg .nodeLabel, svg .edgeLabel span, svg foreignObject p")) {
    if (!(el.textContent || "").trim() || isBg(el) || !visible(el)) continue;
    const lines = Math.max(1, el.querySelectorAll("br").length + 1);
    const r = el.getBoundingClientRect();
    if (r.height === 0) continue;
    const px = r.height / lines / 1.2;
    if (px < minSvg) { minSvg = px; minEl = el; }
  }
  if (minSvg < 18) add("error", "tiny-text", `Diagram/chart text renders at ~${minSvg.toFixed(0)}px (< 18px). Use fewer nodes, a larger height, or a wider column.`, minEl);

  const errs = window.__DECK_ERRORS__ || [];
  errs.forEach((e) => add("error", "render", e));
  return { title, kind, issues };
})()
