# Workflow (detailed)

## 1. Brief: ask once, briefly

- Who is the audience, and what do they decide or do after the talk?
- What is the duration or slide count? Will it be presented live, sent as a PDF, or both?
- What must be in it, and what must not?
- What are the brand palette, fonts and logo? If there's no brand yet, pick a built-in theme and say the brand can be swapped later in `brand.css`.
- Which sources should be used: user documents, internal data, or public research?

## 2. Research

- Keep `research/notes.md` in the deck directory. For each source, record the id, title, publisher, date, URL, and the exact figures and quotes (copied verbatim) with page or section.
- Prefer primary sources. Write down the date you accessed each one.
- If a needed number does not exist, say so in the outline. Do not estimate silently.

## 3. Design spec and approval gate

From the user's raw notes (no layout required), write **`content/deck.spec.yaml`**. Schema and promote/merge rules: `deck-spec.md`. Example: `template/content/deck.spec.yaml`.

Minimum per slide: `n`, `id`, `type`, `title` (full-sentence takeaway), `layout`, `status` (`stub` until polished), plus components / body / media / chart data / sources / notes as needed.

```yaml
title: "…"
theme: midnight
approved: false          # set true ONLY after the user approves this file
slides:
  - n: 1
    id: title
    type: title
    title: "Research-backed decks that look like a design team built them."
    layout: layout-stack
    status: stub
    background: aurora
```

Send the YAML (or a clear summary) to the user: approve, or what to change. They may edit the file directly. **Do not set `approved: true` or build production slides until they approve.** Optional: a one-line `outline.md` brainstorm first; optional light `content/deck.outline.md` for `npm run live` (`npm run spec -- --sync-outline`).

## 4. Scaffold

```bash
node <skill>/scripts/new-deck.mjs ./decks/<slug> --title "<title-slide takeaway>." --theme midnight   # or aurora|paper|tech-dark|bento-minimal|navy-pitch
cd ./decks/<slug> && npm install && npx playwright install chromium
```

- If Chromium download is blocked, set `CHROME_PATH=/path/to/chrome`; the scripts fall back to `/usr/bin/google-chrome` or `/usr/bin/chromium`.
- `--keep-examples` copies the 16 example slides; delete the ones you don't use, and their sources.

## 4b. Style import (optional)

If the user gives a site to match, brand images or SVG artwork, run this before building:

```bash
npm run style:url -- https://brand.example.com --apply   # or
npm run style:images -- ./refs --apply                   # or
npm run style:svg -- ./art --apply
```

Check `style-import/style-spec.json`, then preview with `npm run dev` → `/?theme=brand`. The rules are in `style-import.md`.

## 5. Build from the approved spec

- After approval, set `approved: true` and run `npm run spec` (validate + write `from-spec.tsx` for `status: stub` only).
- Promote stubs → `src/slides/NN-id.tsx`, set `status: locked`, register in `index.ts`. **Never overwrite locked files** when regenerating (`deck-spec.md`).
- Lay out with Grid/Flex recipes in `layout-guide.md` (`.layout-*`) — not absolute positioning.
- **Live preview (HMR):** `npm run dev` → http://127.0.0.1:5173.
- **Spec watch / light outline:** `npm run spec -- --watch` or `npm run live` (outline). Uncomment `specSlides` / `outlineSlides` in `index.ts` only while iterating.
- Run `npm run typecheck` to catch prop mistakes early.

## 5b. User-provided media (agent does this)

If the user attaches or pastes an image, logo, screenshot or says "use this asset":

1. Write the bytes to `public/media/<kebab-name>.<ext>` (create the folder if needed).
2. On the slide, import `Figure` and render `<Figure src="/media/…" alt="…" cite|illustrative maxHeight={…} />`.
3. Prefer Lucide for abstract UI icons; use Figure for brand/photo/screenshot evidence.
4. Do **not** invent logos or download unlicensed stock. If the asset is missing, ask.
5. Re-run `npm run review` so screenshots and `img-alt` / `img-broken` lint cover the new media.

Details and sizing: `media-guide.md`.

## 6 and 7. Review loop

```bash
npm run review              # build + screenshot + lint → review/
npm run review -- --steps   # also every click step
```

- Read `review/report.md`, open `review/contact-sheet.png`, then open every `review/slide-*.png`. The lint can't judge taste, so look at each image.
- Go through `review-checklist.md`, fix the problems, and run review again. Repeat until there are 0 errors.

## 8. Export

```bash
npm run export:pdf                 # export/deck.pdf (vector text, one 1920×1080 page per slide)
npm run export:pdf -- --raster     # export/deck-raster.pdf (pixel-identical to screenshots)
npm run export:png                 # export/png/slide-NN-id.png
npm run verify                     # tokens + typecheck + build + review + pdf in one go (CI-friendly)
```

- `npm run build` writes `dist/`, a static site (relative paths) that opens from any static host.

## 9. Hand-off message

Include:
- The PDF path and contact sheet.
- How to present: `npm run dev`, or serve `dist/`; press F for fullscreen and N for notes.
- The sources list.
- Open issues: anything unsourced, illustrative, or still waiting for the brand.

## Live editing tips

- Prefer editing the polished `src/slides/NN-id.tsx` files under `npm run dev` — that is the beauty path.
- Use the outline file for titles/bullets scaffolding only; it will not recreate LayeredArchitecture / C4 / Motion for you.
- After outline changes, if stubs are wired into `index.ts`, Vite HMR picks up the regenerated TSX automatically.
