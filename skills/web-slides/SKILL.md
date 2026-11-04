---
name: web-slides
description: Build stunning, research-backed web slide decks (React + Vite + Motion, 1920x1080) with cited figures, full-sentence takeaway titles, WCAG contrast checks, Playwright screenshots, automated self-review and PDF/PNG export. Use when the user asks for a presentation, slide deck, keynote, pitch, briefing or "slides" and wants it fancy, animated or web-based, or needs a PDF of a polished deck. Not for editing an existing .pptx file.
license: MIT
compatibility: Needs Node.js 20+ and npm, network access for npm install, and a Chromium for Playwright (npx playwright install chromium, or CHROME_PATH).
metadata:
  version: "0.3.0"
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
5. **Consistent icons.** Use only lucide-react through `<Icon>`, `<Card icon>` or `<IconList>`. Use one stroke weight and the fixed sizes. No emoji and no mixed icon sets.
6. **No template leftovers.** Delete every example slide you do not use. Do not leave lorem, TODO, TBD, `{{ }}`, example sources or "Illustrative" figures in a final deck unless the user agreed.
7. **Theme by tokens only.** Every color, font and size lives in `src/theme/tokens.css`. A brand goes in `src/theme/brand.css` as `[data-theme="brand"]`. Never hard-code hex values in slides.

## Workflow

Follow these steps in order, and stop at the approval gate. The full details are in `references/workflow.md`.

1. **Brief.** Get the audience, goal, length (minutes or slide count), the decision or ask, and the deadline. Also ask whether a brand palette exists; if not, use `midnight`, `aurora` or `paper`.
2. **Research.** Collect sources into a working notes file with URLs and the exact figures and quotes. Prefer primary sources such as official docs, papers, filings and the user's own data.
3. **Outline, then approval.** Write `outline.md` with one line per slide. Each line gives the slide number, the slide type from `references/slide-catalog.md`, the takeaway title, the key visual, and the source ids. **Show it to the user and wait for approval** before writing any TSX, unless they explicitly said to skip approval.
4. **Scaffold.** Run `node scripts/new-deck.mjs <dir> --title "<takeaway title>" [--theme midnight|aurora|paper]`, then `cd <dir> && npm install && npx playwright install chromium`. Use `--keep-examples` only if you want the 12 example slides as a reference; delete them afterwards.
5. **Build the slides.** Make one file per slide in `src/slides/NN-id.tsx`, register it in `src/slides/index.ts`, and add sources to `src/slides/sources.ts`. Copy patterns from `template/src/slides/*` (one example per slide type) and follow `references/design-guide.md`. For any architecture or flow visual, open `references/diagram-guide.md` and pick Mermaid vs `LayeredArchitecture` / `FlowSteps` / `Sequence` / `C4Container`. Use **`npm run dev`** (HMR present mode) or **`npm run live`** (HMR + outline watcher) while building — see Live mode below.
6. **Screenshots and review.** Run `npm run review`. It builds the deck, screenshots every slide in its final state into `review/`, writes `review/contact-sheet.png` and `review/report.md`, and exits non-zero on errors.
7. **Self-review.** Open the contact sheet and every slide PNG and look at them; do not trust the lint alone. Go through `references/review-checklist.md`. Fix the issues and run review again until there are 0 errors and every warning is fixed or justified. Use `npm run review -- --steps` to check click-step states.
8. **Export.** Run `npm run export:pdf`, which writes `export/deck.pdf` with vector, selectable text. If blur or glow effects print wrong, also run `npm run export:pdf -- --raster` for `export/deck-raster.pdf`. `npm run export:png` writes PNGs to `export/png/`. `npm run verify` runs the token check, build, review and PDF export in one go.
9. **Hand-off.** Give the user the PDF, the contact sheet, how to present (`npm run dev`, or open `dist/` from any static host), the list of sources, and anything you could not source.

## Engine at a glance

- The stage is 1920×1080 and scaled to fit. Present mode keys: ←/→, Space, PgUp/PgDn, Home/End, **N** notes, **O** overview, **F** fullscreen. URLs look like `#/slide/step`.
- `?static&slide=N&step=final` renders one slide for screenshots, and `?print` renders all slides for PDF. In both, motion is off and every step is shown.
- Click steps: set `steps: n` on the slide, then use `<Appear at={k}>`, `<Stagger stepwise>`, `<IconList stepwise>`, `<Timeline>`, or `<Code focus={[...]}>`.
- Components (`src/deck/components.tsx`): `SlideFrame`, `Appear`, `Stagger`, `Card`, `Icon`, `Pill`, `Stat`, `BarChart`, `Mermaid`, `Code`, `Timeline`, `Quote`, `IconList`, `Gradient`, `Cite`.
- Diagrams (`src/deck/diagrams.tsx`, re-exported): `LayeredArchitecture`, `FlowSteps`, `Sequence`, `C4Container`, `DiagramLegend`. **Read `references/diagram-guide.md`** before drawing — Mermaid for ≤8-node flows; React+CSS for swimlanes, C4 and sequences. Prop tables are in `references/slide-catalog.md`.
- Motion follows the viewer's `prefers-reduced-motion` setting through `MotionConfig reducedMotion="user"`.

## Live mode (real-time preview)

React slides are the source of truth for beauty. Two loops:

1. **`npm run dev`** — Vite present mode at http://127.0.0.1:5173 with HMR. Edit any `src/slides/*.tsx`, `sources.ts`, theme CSS, or diagram component; the browser updates immediately. Keys: ←/→, Space, **N** notes, **O** overview, **F** fullscreen.
2. **`npm run live`** — same as dev, plus watches `content/deck.outline.md` and regenerates stub slides into `src/slides/generated/from-outline.tsx`. Uncomment the `outlineSlides` import in `src/slides/index.ts` to preview stubs, then replace each stub with a polished typed slide before ship. `npm run outline` regenerates once without Vite.

Do not treat outline stubs as final deck quality. Diagrams, motion and tight layout stay in hand-written React.

## Don'ts

- Don't put more than about 40 words of body text on a slide; move detail to the `notes`.
- Don't use text smaller than 18px on the stage (the lint enforces this, including diagram text). Don't use more than 6 cards or 5 bullets. Don't put more than 8 nodes in Mermaid; for denser architecture use `LayeredArchitecture` / `C4Container` / `Sequence` (see `diagram-guide.md`), and still split if a swimlane exceeds 6 layers or 5 cells.
- Don't use `position: absolute` for content outside SlideFrame, and don't use raw hex colors, external images you don't have rights to, or stock "AI brain" art.
- Don't skip the approval gate or the screenshot review.
