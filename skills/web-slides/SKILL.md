---
name: web-slides
description: Build stunning, research-backed web slide decks (React + Vite + Motion, 1920x1080) with cited figures, full-sentence takeaway titles, WCAG contrast checks, Playwright screenshots, automated self-review and PDF/PNG export. Use when the user asks for a presentation, slide deck, keynote, pitch, briefing or "slides" and wants it fancy, animated or web-based, or needs a PDF of a polished deck. Not for editing an existing .pptx file.
license: MIT
compatibility: Needs Node.js 20+ and npm, network access for npm install, and a Chromium for Playwright (npx playwright install chromium, or CHROME_PATH).
metadata:
  version: "0.8.0"
  stack: "react 19, vite 8, motion 14, playwright, mermaid, shiki, lucide-react"
---

# Web Slides

Make keynote-grade decks as a small React app, then prove they are good with screenshots and an automated review before handing them over.

Paths below are relative to this skill directory. Read files in `references/` when a step tells you to.

## Non-negotiable standard

1. **Research first. Only sourced figures.** Every number, chart, quote and factual claim comes from a source you opened in this session. Each slide lists its sources in the footer, and each figure uses `cite="id"`. If you do not have a source, cut the figure or ask the user. Never invent numbers, quotes, logos or customer names. A figure that is only an example must use `illustrative` (it shows an "Illustrative" label).
2. **Every slide title is a full-sentence takeaway.** For example, "Ticket triage time fell 48% after the pilot." is a takeaway; "Results" is not.
3. **Technical topics need four slide types:** architecture, results, governance (risk, security, controls, ownership) and lessons.
4. **WCAG 2.2 AA contrast.** Normal text needs 4.5:1 and large text needs 3:1. `npm run check:tokens` and `npm run review` both enforce this.
5. **Consistent icons.** Use only lucide-react through `<Icon>`, `<Card icon>` or `<IconList>`. Use one stroke weight and the fixed sizes. No emoji and no mixed icon sets. **User-provided logos/photos/screenshots** go through `<Figure>` — read `references/media-guide.md` and copy files into `public/media/`.
6. **No template leftovers.** Delete every example slide you do not use. Do not leave lorem, TODO, TBD, `{{ }}`, example sources or "Illustrative" figures in a final deck unless the user agreed.
7. **Theme by tokens only.** Every color, font and size lives in `src/theme/tokens.css`. Built-in themes: `midnight`, `aurora`, `paper`, plus inspiration presets `tech-dark`, `bento-minimal`, `navy-pitch` (see `docs/template-inspiration.md`). A user brand goes in `src/theme/brand.css` as `[data-theme="brand"]`. Never hard-code hex values in slides.
8. **Prefer built-in presets; borrow style, not assets.** Default to a built-in theme (or an inspiration preset) instead of re-scraping SlidesCarnival / Slidesgo each run. Use `npm run style:url` / `style:images` / `style:svg` **only when the user supplies a new brand** (their site, images or SVGs). Never copy third-party logos, photos, fonts, or vendor PPTX/GS packs into the repo. Swap fonts like SF Pro for Inter. Canva elements need the user's confirmation of rights. See `references/style-import.md` and `docs/template-inspiration.md`.

## Workflow

Follow these steps in order, and stop at the approval gate. The full details are in `references/workflow.md`.

1. **Brief.** Get the audience, goal, length (minutes or slide count), the decision or ask, and the deadline. Also ask whether a brand palette exists, or a website, images or SVGs to match (step 5). If there is none, use a built-in theme (`midnight`, `aurora`, `paper`) or an inspiration preset (`tech-dark`, `bento-minimal`, `navy-pitch`) — do **not** scrape free template sites by default.
2. **Research.** Collect sources into a working notes file with URLs and the exact figures and quotes. Prefer primary sources such as official docs, papers, filings and the user's own data.
3. **Design spec, then approval.** From the user's raw notes (no layout required), write `content/deck.spec.yaml` — slide order, takeaway titles, types from `references/slide-catalog.md`, layout recipes from `references/layout-guide.md`, components (Stat/BarChart/Mermaid/LayeredArchitecture/FlowSteps/Sequence/C4Container/Figure/Code/Timeline/…), text, media paths, chart data, sources, speaker notes. Schema: `references/deck-spec.md`. **Show that file to the user, let them edit it, and wait for approval** (`approved: true` only after they say yes) before generating production React slides, unless they explicitly said to skip approval. A thin `outline.md` brainstorm is optional; `content/deck.outline.md` remains an optional light stub for `npm run live`.
4. **Scaffold.** Run `node scripts/new-deck.mjs <dir> --title "<takeaway title>" [--theme midnight|aurora|paper|tech-dark|bento-minimal|navy-pitch]`, then `cd <dir> && npm install && npx playwright install chromium`. Use `--keep-examples` only if you want the 16 example slides as a reference; delete them afterwards.
5. **Style import (only when the user supplies a new brand).** Prefer built-in / inspiration presets from step 1. If they give their own website URL, brand images or SVG artwork, run one of these in the deck:
   - `npm run style:url -- <url>`
   - `npm run style:images -- <dir>`
   - `npm run style:svg -- <dir>`

   Add `--apply` to switch the deck to `theme: "brand"`. Each command writes `style-import/style-spec.json` and `src/theme/brand.css`, auto-fixes failing contrast while keeping hue, and runs `check:tokens`. Read the summary, sanity-check it against the captures, install any non-bundled font it names, and tell the user which brand colors were adjusted and which fonts were swapped. SVGs land classified in `public/media/svg/` (background, frame, decorative, icon). Full workflow, mapping rules, font table and licensing: `references/style-import.md`. Preview any theme with `?theme=brand` or `npm run review -- --theme brand`.
6. **Build the slides from the approved spec.** Run `npm run spec` to validate and emit stubs for `status: stub` into `src/slides/generated/from-spec.tsx`. Promote each stub into `src/slides/NN-id.tsx`, set `status: locked` in the YAML, and register the polished module in `src/slides/index.ts` (see promote/merge in `references/deck-spec.md` — regenerating must not wipe locked slides). Add sources to `src/slides/sources.ts`. Copy patterns from `template/src/slides/*` and follow `references/design-guide.md` and `references/layout-guide.md`. For architecture or flow visuals, open `references/diagram-guide.md`. **When the user provides images, logos, screenshots or says "use this asset", follow `references/media-guide.md` end-to-end.** Use **`npm run dev`** or **`npm run live`** while polishing — see Live mode below.
7. **Screenshots and review.** Run `npm run review`. It builds the deck, screenshots every slide in its final state into `review/`, writes `review/contact-sheet.png` and `review/report.md`, and exits non-zero on errors.
8. **Self-review.** Open the contact sheet and every slide PNG and look at them; do not trust the lint alone. Go through `references/review-checklist.md`. Fix the issues and run review again until there are 0 errors and every warning is fixed or justified. Use `npm run review -- --steps` to check click-step states.
9. **Export.** Run `npm run export:pdf`, which writes `export/deck.pdf` with vector, selectable text. If blur or glow effects print wrong, also run `npm run export:pdf -- --raster` for `export/deck-raster.pdf`. `npm run export:png` writes PNGs to `export/png/`. `npm run verify` runs the token check, typecheck, build, review and PDF export in one go.
10. **Hand-off.** Give the user the PDF, the contact sheet, how to present (`npm run dev`, or open `dist/` from any static host), the list of sources, and anything you could not source.

## Engine at a glance

- The stage is 1920×1080 and scaled to fit. Body layouts: `.layout-stack`, `.layout-kpi`, `.layout-compare`, `.layout-media`, `.layout-hero`, `.layout-bento`, `.layout-section`, `.layout-timeline-strip` (+ `.grid-2/3/4`, `.row`) — see `references/layout-guide.md`. Present mode keys: ←/→, Space, PgUp/PgDn, Home/End, **N** notes, **O** overview, **F** fullscreen (keys with Ctrl/Cmd/Alt are left to the browser). URLs look like `#/slide/step`; editing the hash jumps there, and a step past the slide's last is clamped.
- `?static&slide=N&step=final` renders one slide for screenshots, and `?print` renders all slides for PDF. In both, motion is off and every step is shown.
- Click steps: set `steps: n` on the slide, then use `<Appear at={k}>`, `<Stagger stepwise>`, `<IconList stepwise>`, `<Timeline>`, or `<Code focus={[...]}>`.
- Components (`src/deck/components.tsx`): `SlideFrame`, `Appear`, `Stagger`, `Card`, `Icon`, `Pill`, `Stat`, `BarChart`, `Figure`, `Mermaid`, `Code`, `Timeline`, `Quote`, `IconList`, `Gradient`, `Cite`.
- Diagrams (`src/deck/diagrams.tsx`, re-exported): `LayeredArchitecture`, `FlowSteps`, `Sequence`, `C4Container`, `DiagramLegend`. **Read `references/diagram-guide.md`** before drawing — Mermaid for ≤8-node flows; React+CSS for swimlanes, C4 and sequences. Prop tables are in `references/slide-catalog.md`.
- Motion follows the viewer's `prefers-reduced-motion` setting through `MotionConfig reducedMotion="user"`.

## User media (agent)

When the user drops a file or says "use this logo / screenshot / image", **you** insert it — do not only describe how:

1. Copy the file to `public/media/<kebab-name>.<ext>` in the deck.
2. Add `<Figure src="/media/…" alt="…" cite="…" />` (or `illustrative`) on the slide.
3. Run `npm run review` and confirm the screenshot shows the asset.

Full rules: `references/media-guide.md`. Example: `template/src/slides/16-media-figure.tsx`.

## Style import (agent)

**Prefer built-in themes** (`midnight` / `aurora` / `paper` / `tech-dark` / `bento-minimal` / `navy-pitch`) before scraping. Only when the user says "make it look like *our* site", "use our brand images" or hands you SVGs, **you** run the import. Don't hand-pick hex values, and don't re-fetch SlidesCarnival/Slidesgo packs for a look we already baked in:

| Input | Command | Output |
|---|---|---|
| URL | `npm run style:url -- https://…` | spec, reference captures (gitignored), `brand.css` with colors, fonts and layout tokens |
| Images | `npm run style:images -- ./refs` | k-means palette, mood, `brand.css` (`--copy` puts owned images in `public/media/imported/`) |
| SVGs | `npm run style:svg -- ./art` | palette, `brand.css`, and normalized `public/media/svg/<kind>-*.svg` (icons use `currentColor`) |

Then run `npm run review`, look at the contact sheet, and report the palette, the contrast fixes and the font swaps. Use imported SVG backgrounds and decorations via `<Figure decorative frame={false}>`.

## Design spec + live mode

1. **`content/deck.spec.yaml`** — editable middle layer and **approval gate** (`references/deck-spec.md`). User edits design; agent sets `approved: true` only after explicit approval, then `npm run spec` (validate + stub generate). `status: locked` slides are never overwritten.
2. **`npm run dev`** — Vite present mode at http://127.0.0.1:5173 with HMR. Edit any `src/slides/*.tsx`, `sources.ts`, theme CSS, or diagram component; the browser updates immediately. Keys: ←/→, Space, **N** notes, **O** overview, **F** fullscreen.
3. **`npm run live`** — same as dev, plus watches the optional light `content/deck.outline.md` → `from-outline.tsx`. Prefer the YAML spec; sync a light outline with `npm run spec -- --sync-outline`. Uncomment `specSlides` / `outlineSlides` in `index.ts` only while iterating.

Do not treat stubs as final deck quality. Diagrams, motion and tight layout stay in hand-written (locked) React.

## Don'ts

- Don't put more than about 40 words of body text on a slide; move detail to the `notes`.
- Don't use text smaller than 18px on the stage (the lint enforces this, including diagram text). Don't use more than 6 cards or 5 bullets. Don't put more than 8 nodes in Mermaid; for denser architecture use `LayeredArchitecture` / `C4Container` / `Sequence` (see `diagram-guide.md`), and still split if a swimlane exceeds 6 layers or 5 cells.
- Don't use `position: absolute` for everyday content (SlideFrame chrome and `.bg` only). Prefer Grid/Flex per `references/layout-guide.md`. Don't use raw hex colors, hotlinked images you don't have rights to, invented logos, or stock "AI brain" art. Put user media in `public/media/` via `<Figure>`.
- Don't ship `style-import/captures/*` or any third-party screenshot, logo or font file. They are reference only.
- Don't skip the design-spec approval gate (`content/deck.spec.yaml`) or the screenshot review. Don't regenerate over `status: locked` slides.
