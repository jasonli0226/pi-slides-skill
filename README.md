# pi-slides-skill

An agent skill for the [pi coding agent](https://github.com/badlogic/pi-mono) that builds **stunning, research-backed web slide decks**. Decks are React 19 + Vite + Motion apps on a 1920×1080 stage. Every slide is screenshotted and linted automatically, and the deck exports to PDF and PNG.

![Contact sheet of the example deck](examples/screenshots/contact-sheet.png)

## What it does

- **Workflow:** brief → research → outline → **your approval** → build → screenshots → self-review checklist → PDF export.
- **A deck standard enforced by code**, not just by instructions:
  - Every Stat, chart or quote must cite a source listed on its slide.
  - Titles must be full-sentence takeaways.
  - Contrast is checked against WCAG 2.2 AA, both at the token level and in the rendered DOM.
  - The lint fails on emoji icons, template leftovers (lorem, TODO, `{{ }}`, NaN), overflow and text under 18px.
- **13 slide types with working examples:** title, agenda, big number, architecture (Mermaid), comparison, timeline, code walkthrough (Shiki with per-step focus), quote, results (count-up stat + animated bars), governance, lessons, closing and section.
- **Swappable theme tokens:** the built-in themes are `midnight`, `aurora` and `paper`. A brand palette goes in `brand.css` and is a single-file change.
- **Presenting:** arrow keys or clicks with click-steps, **N** notes, **O** overview, **F** fullscreen, and `prefers-reduced-motion` respected.

## Install into pi

This repo is a pi package. `package.json` declares `"pi": { "skills": ["./skills"] }`.

```bash
# from GitHub (private repo: your git must be able to clone it, e.g. `gh auth setup-git` or SSH)
pi install git:github.com/jasonli0226/pi-slides-skill

# or from a local clone
git clone https://github.com/jasonli0226/pi-slides-skill && pi install ./pi-slides-skill

# or copy only the skill
cp -r pi-slides-skill/skills/web-slides ~/.pi/agent/skills/web-slides
```

Add `-l` to `pi install` to write to the project's `.pi/settings.json` instead of `~/.pi/agent/settings.json`. Then ask pi for a deck ("make a 10-minute deck on …"), or force the skill with `/skill:web-slides`. After editing the skill, run `/reload`.

Requirements: Node.js 20+, npm, and Chromium for Playwright (`npx playwright install chromium`, or set `CHROME_PATH`).

## Use the scaffold directly

```bash
node skills/web-slides/scripts/new-deck.mjs ./my-deck --title "Our pilot cut triage time in half." --theme midnight
cd my-deck && npm install && npx playwright install chromium
npm run dev          # present at http://127.0.0.1:5173
npm run review       # screenshots + lint → review/ (contact-sheet.png, report.md)
npm run export:pdf   # export/deck.pdf   (add -- --raster for a pixel-exact PDF)
npm run verify       # tokens + build + review + pdf, exit code for CI
```

## Repo layout

```
package.json                     pi package manifest
skills/web-slides/
  SKILL.md                       entry point pi loads (frontmatter + workflow + standard)
  references/
    design-guide.md              story, layout, type scale, color, icons, motion, data
    slide-catalog.md             slide types, component props, file skeleton
    workflow.md                  step-by-step commands and approval gate
    review-checklist.md          automated + visual + facts checklist
  scripts/new-deck.mjs           create a deck from the template
  template/                      the deck engine + 12 example slides
    src/deck/                    Deck (modes, keys, transitions), components, CSS
    src/theme/tokens.css         all design tokens + 3 themes
    src/theme/brand.css          where the brand theme goes
    src/slides/                  one file per slide, sources.ts bibliography
    scripts/                     review.mjs, lint-in-page.js, export-pdf.mjs, check-tokens.mjs
docs/research.md                 stack comparison, decision, sources
docs/verification.md             what was run and the results
examples/                        example-deck.pdf, review-report.md, screenshots/
```

## Research summary

We compared Slidev, reveal.js, Spectacle and a custom React + Motion scaffold (details in [docs/research.md](docs/research.md)).

- **Chosen: custom React + Vite + Motion.** The brief asked for React. Plain TSX components give agents complete layout and animation freedom with well-known libraries. Our own URL modes (`?static`, `?print`) make Playwright screenshots, DOM linting and PDF export deterministic, which is what lets the agent review its own work.
- **Runner-up: Slidev** (Markdown + Vue). It has the richest built-ins: PPTX/PDF/PNG export via Playwright, presenter mode and Shiki Magic Move. Its plain PPTX export is images, and even `pptx-editable` keeps SVG/Mermaid as pictures.
- **reveal.js** has Auto-Animate and fragments, and its `?print-pdf` export is documented for Chrome/Chromium. **Spectacle** is React with a `transition` prop, react-spring Appear/Stepper, and a print mode whose custom page size works fully only in Chrome.
- **Accessibility:** WCAG 2.2 SC 1.4.3 requires 4.5:1 contrast (3:1 for large text). Motion's `reducedMotion="user"` turns off transform and layout animation for users who request it.

### Sources

- Slidev: [Animation](https://sli.dev/guide/animations), [Exporting](https://sli.dev/guide/exporting)
- reveal.js: [PDF Export](https://revealjs.com/pdf-export/), [Auto-Animate](https://revealjs.com/auto-animate/), [Code](https://revealjs.com/code/)
- Spectacle: [Introduction](https://nearform.com/open-source/spectacle/docs/), [API Reference](https://nearform.com/open-source/spectacle/docs/api-reference/)
- Motion: [React accessibility](https://motion.dev/docs/react-accessibility)
- Playwright: [Screenshots](https://playwright.dev/docs/screenshots)
- W3C: [Understanding WCAG 2.2 SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- pi-mono: [skills.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/skills.md), [packages.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/packages.md)

## Known limits

- The presenter view is an in-page notes overlay, not a separate presenter window.
- Automatic contrast checking covers text on solid or semi-transparent backgrounds. Gradient text and text over glows or images must be checked by eye (it's on the checklist).
- There is no editable PPTX output; hand-off is PDF and PNG.
- The vector PDF drops the grain overlay and renders gradient text in the solid accent color. Use `--raster` for a pixel-exact copy.
- The brand theme is not defined yet. Add it in `template/src/theme/brand.css` once the palette arrives.

## License

MIT
