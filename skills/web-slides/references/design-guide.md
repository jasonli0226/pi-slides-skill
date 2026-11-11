# Design guide

The goal is a deck that looks designed rather than generated: one clear idea per slide, generous space, deliberate motion, and every number sourced.

## Story

- Use a pyramid structure: the title slide states the answer, the agenda gives 3 to 5 parts, each part proves one claim, and the closing slide makes the ask.
- **Titles are the story.** Read only the titles in order and they should form a coherent argument. Each one is a full sentence (5 or more words, ending with a period) that states the takeaway, ideally with the number in it.
- One idea per slide. If a slide needs two takeaways, make it two slides.
- Put the detail in `notes`; the slide carries the evidence.
- Rough length: 1 to 2 minutes per slide, so a 20-minute talk is about 12 to 16 slides.

## Layout (1920×1080 stage)

- The safe area is 120px left/right padding, 96px top and 88px bottom; SlideFrame applies it. Never place content in the footer band.
- Use the type scale only: hero 112, title 60, h3 36, body 30, small 24, caption 18. Nothing smaller than 18px.
- Body text should be 40 words per slide or fewer, with at most 5 bullets or 6 cards, and lines no longer than about 60 characters.
- **Grid for stage columns, Flex for rows.** Prefer named recipes over ad-hoc positioning: **title hero** (`SlideFrame hero` + optional `backdrop` + automatic left scrim — not centered), `.layout-stack` (title+body), `.layout-kpi` (equal Stat strip), `.layout-compare` (two cards), `.layout-media` (figure column), `.layout-hero` / `.layout-hero-flip` (asymmetric `0.55fr 1.45fr`). Also `.grid-2/3/4` and `.row`. Full recipes, safe patterns (`gap`, `min-width:0`, `flex:1 1 0`, stretch) and anti-patterns: **`references/layout-guide.md`** (cites [CSS Tricks Flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/) and [Grid](https://css-tricks.com/snippets/css/complete-guide-grid/)).
- Give every slide one focal point: a big number, a highlighted column, a highlighted bar or a highlighted card. Make one thing the accent color, not everything.

## Color and theme

- Every color comes from the tokens: `--bg`, `--surface`, `--text`, `--text-muted`, `--accent`, `--accent-2`, `--accent-3`, `--warning`, `--danger`, `--on-accent`.
- Built-in themes: `midnight` (dark, default), `aurora` (dark violet), `paper` (light, print / bright rooms), plus inspiration presets `tech-dark`, `bento-minimal`, `navy-pitch` (see `docs/template-inspiration.md`). Prefer these over `style:*` unless the user supplies a new brand.
- Brand swap: copy a theme block into `src/theme/brand.css` as `[data-theme="brand"]`, set `theme: "brand"` in `src/slides/index.ts`, then run `npm run check:tokens`. Do not touch components.
- **Matching a site, images or SVGs:** generate the brand theme with `npm run style:url|style:images|style:svg` (see `style-import.md`) instead of eyeballing hex. The importer keeps the brand hue and only shifts lightness to pass contrast. Say so if a brand color moved.
- Don't ship the untouched template look. Pick a theme on purpose for the audience and room, and set at least the layout feel tokens below or a `style-pack` so the deck doesn't read as generic output. Leaving `midnight` with stock tokens is fine only when the user chose it.
- Layout feel tokens (`--hero-weight`, `--title-weight`, `--hero-tracking`, `--title-tracking`, `--shadow-card`, `--shadow-elev`, `--motion-scale`, `--radius*`, `--pad-*`) let a restrained brand look restrained: flatter cards, lighter weights, calmer motion. The type-scale minimums still apply.
- Fonts: only free fonts (bundled Inter, Space Grotesk and JetBrains Mono, or another Fontsource family you install). Swap proprietary faces using the table in `style-import.md`.
- Contrast follows WCAG 2.2 AA. Text needs 4.5:1, or 3:1 if it is 24px or larger (or 18.66px bold). UI and graphics need 3:1 (SC 1.4.11).
- Gradient text and text over glows or images can't be measured automatically. Check those by eye in the screenshots, and keep gradient text for large headline words only.

## Icons

- Use lucide-react only, through `Icon`, `Card icon` or `IconList`. The stroke is 1.75 and the sizes are fixed (28/40/56/88).
- Use the same icon for the same concept throughout the deck. Icons support meaning; they don't decorate. Never use emoji.

## Motion

- Transitions between slides are `fade` by default. Use `blur` for the title or quote slides and `zoom` for the closing; avoid mixing more than 2 or 3 kinds.
- Inside a slide, use `Appear` for entrance (0.5 to 0.7s with an ease-out curve) and stagger groups by about 80ms. Use click steps to reveal an argument piece by piece, not to show off.
- Give each slide at most one hero effect: a count-up `Stat` group (any number of `Stat`s together counts once), an `aurora` or `spotlight` background, or `.text-gradient` text outside a `Stat`. Slide transitions, plain `Appear` fades and a stagger don't count. Lint warns on `hero-effects` when a slide has two or more. If two effects compete, keep the one on the focal point and drop the other.
- Animate opacity and transform only. Don't loop animations on content; the background blobs are slow and subtle.
- Reduced motion is respected automatically (`MotionConfig reducedMotion="user"`). Static, print and screenshot modes render the final state with no motion, so the slide must read well without animation.

## Data and evidence

- Every `Stat`, `BarChart`, `EChart` and `Quote` needs `cite="sourceId"`, and the id must be in the slide's `sources`. Text claims get `<Cite id>`.
- Label units and timeframes, for example "median minutes, Q3 2026, n=1,240 tickets", using only what the source says.
- Charts should start at zero and use 3 to 7 bars. Highlight the bar that the title talks about.
- Pick the chart type from the story (trend → line, part-to-whole → stacked bar, correlation → scatter, flow → sankey, matrix → heatmap) with `references/chart-guide.md`. Keep `BarChart` for simple comparisons; use `EChart` for the rest. No pie, 3D or dual axes.
- If a figure is an example or a projection that you were asked to show, mark it `illustrative` and say so in the notes.

## Media (photos, logos, screenshots)

- Read `references/media-guide.md`. User assets live in `public/media/` and render through `<Figure>`.
- Lucide for icons; Figure for anything the user supplied. Never invent logos or stock art.
- Always set `alt` and `cite` or `illustrative`. Keep logos `fit="contain"`; check text-over-image by eye.
- Title openers: full-bleed **photo** via `SlideFrame backdrop` + `scrim="light"` (soft white left band, dark type, vivid image on the right). Use `heroLabel` for the bottom-left uppercase tag. Do not center; do not rely on heavy colored orbs when a photo is available. Real photos live in `public/media/` (rights-cleared only).

## Diagrams

- Read `references/diagram-guide.md` before drawing. Pick the type from the scenario matrix; do not default to Mermaid for dense stacks.
- **Mermaid** only for ≤8-node flows or small decision trees. Short labels (≤3–4 words), dotted arrows for feedback.
- **React + CSS components** for everything denser: `LayeredArchitecture` (swimlanes), `FlowSteps`, `Sequence`, `C4Container`. Stay in-stack; do not add React Flow / X6 unless the user asks for interactive edges.
- One C4 zoom level per slide. Split overview vs request-path vs governance. Rebuild vendor wall-charts as a simplified, illustrative generic stack — never copy proprietary diagrams.
- Color by layer/kind via `tone` props; no hard-coded hex; no emoji; diagram text ≥18px (lint-enforced).
