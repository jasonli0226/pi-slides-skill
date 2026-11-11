# Media guide (agent workflow)

Teach the **agent** how to insert user-provided images, logos, screenshots and custom icons into a deck. Humans can follow the same steps; the skill expects the agent to do them unprompted when the user drops an asset or says "use this logo / screenshot / image".

## When the user provides an asset

1. **Save the file into the deck.** Copy it to `public/media/<kebab-descriptive-name>.<ext>` in the deck project (Vite serves `public/` at `/`). Prefer the user's original filename cleaned to kebab-case (`Acme Logo.png` → `logo-acme.png`). Keep the original format when possible (SVG / PNG / WebP).
2. **Do not invent.** Never generate, download, or fabricate a company logo, product UI, photo of a person, or stock "AI brain" art. If the user did not supply it, ask or use Lucide / a diagram instead.
3. **Render with `<Figure>`**, not a raw `<img>`, so cite/illustrative and lint rules apply:

```tsx
import { Figure, SlideFrame } from "../deck/components";

<Figure
  src="/media/logo-acme.svg"
  alt="Acme Corp wordmark"
  fit="contain"          // contain = full logo visible; cover = crop to fill
  maxHeight={280}
  cite="brandKit"        // or illustrative
  caption="Brand kit, used with permission"
  frame
  shadow
/>
```

4. **Register a source** when the asset is factual evidence (screenshot of a dashboard, chart from a report). Put the source in `sources.ts` and on the slide's `sources={[...]}`. Decorative or demo-only media uses `illustrative`.
5. **Re-run review.** After wiring the slide: `npm run review` (or HMR via `npm run dev`). Confirm the PNG shows the asset, alt is present, and lint is clean (`img-alt`, `img-broken`, `source-missing`).
6. **Hand-off.** Mention which media files were added under `public/media/` and whether each is cited or illustrative.

## Where files live

| Location | Use |
|---|---|
| `public/media/` | **Default.** Logos, screenshots, photos. Referenced as `/media/file.ext`. Copied by `new-deck.mjs`. |
| `src/assets/` | Only if you need Vite imports / hashed URLs. Prefer `public/media/` so paths stay stable in notes and PDFs. |

Keep a short `public/media/README.md` in the template; do not commit secrets or private screenshots the user did not ask to include.

## Lucide vs custom image

| Need | Use |
|---|---|
| UI metaphor (shield, rocket, database) | `<Icon>` / `Card icon` / `IconList` from **lucide-react** only |
| Brand logo, product screenshot, photo, diagram export the user supplied | `<Figure src="/media/…">` |
| Architecture / flow you are drawing | Diagram components (`diagram-guide.md`), not a pasted PNG, unless the user provided a diagram image to show as evidence |

Never mix emoji or a second icon pack with Lucide.

## Sizing for the 1920×1080 stage

- Safe content area is roughly **1680×860** inside SlideFrame padding. Target figure **maxHeight 420–620** for a hero image; **180–280** for a logo strip.
- Prefer **`fit="contain"`** for logos and UI screenshots (no crop). Use **`fit="cover"`** only for full-bleed photos where cropping is intentional.
- Source resolution: aim for at least **2×** the displayed CSS size (e.g. a 800px-wide display → ≥1600px-wide PNG) so export/PDF stays sharp. SVG for logos when available.
- Do not stretch a tiny favicon into a hero. If the asset is too small, ask the user for a higher-res file.
- Leave margin above the footer band; `Figure` captions count as content for footer-overlap lint.

## WCAG and text over images

- Every `<Figure>` / `<img>` needs a meaningful **`alt`**. Purely decorative art (imported SVG backgrounds or ornaments from `npm run style:svg`) uses `<Figure decorative>`, which gives an empty alt and `data-decorative="true"`.
- To derive a theme from the user's images or SVGs, see `style-import.md`.
- **Do not put body text directly on a busy photo** without a scrim. If you must overlay a title, wrap with `className="deck-figure-overlay"` (adds a bottom gradient) **and** check the screenshot by eye — automated contrast lint cannot measure text over images.
- Prefer text beside the image (`.grid-2`) rather than on top of it.
- Captions stay ≥18px (theme caption size).

## Cite / illustrative rules

- Same as `Stat` / `BarChart` / `Quote`: every `Figure` needs **`cite="id"`** or **`illustrative`**.
- Screenshots used as proof → cite the report / system / date.
- Brand logos supplied by the user for a pitch → usually `illustrative` or a `brandKit` source the user confirmed.
- Lint fails on missing cite (`source-missing`), missing alt (`img-alt`), and failed loads (`img-broken` / `render`).

## Review checklist (media)

- [ ] File exists under `public/media/` and `src` path is `/media/…`.
- [ ] `alt` describes the image for someone who cannot see it.
- [ ] `cite` or `illustrative` is set; illustrative figures show the label.
- [ ] Image is fully on-stage; caption does not hit the footer.
- [ ] No invented logos or unlicensed stock.
- [ ] Contact-sheet PNG shows the real asset (not a broken-image icon).
- [ ] Any `<SplineScene>` came from the user, sits on a title / closing / hero slide, and has a local `poster` that reads well on its own.

## Anti-patterns

- Hotlinking `https://…` logos you do not have rights to.
- Embedding base64 blobs in TSX for large photos (use `public/media/`).
- Using a screenshot as a substitute for a redrawn architecture diagram when you could use `LayeredArchitecture` / `C4Container`.
- Leaving the template `illustrative-mesh.svg` in a final customer deck.

## Title hero backdrop

Opening slides prefer a **full-bleed photograph** on `SlideFrame`, not a framed `<Figure>` in the body:

```tsx
<SlideFrame
  kind="title"
  hero
  footer={false}
  background="plain"
  scrim="light"
  backdrop={{ src: "/media/hero-photo.jpg", alt: "Aerial campus at dusk" }}
  kicker="…"
  title="…"
  subtitle={"Org line\nDepartment"}
  heroLabel="Proposal for discussion"
/>
```

- Soft **left light scrim** (~45–55% width) keeps dark type readable; the right of the photo stays vivid.
- Put **rights-cleared** user photos in `public/media/`. Do not commit third-party photos whose license is unclear.
- Template placeholder: `title-hero-photo-placeholder.jpg` (synthetic, not a real photo). Swap it for the talk's real plate.
- Ornamental SVG meshes (`title-hero-plate.svg`, `illustrative-mesh.svg`) are fallbacks when no photo exists — prefer a photo for the airport-style opener.

## 3D scenes (Spline, optional)

`<SplineScene>` embeds a 3D scene **the user built in the Spline editor**. You can't author or edit a scene; you can only embed one the user hands you. Never search for or reuse someone else's public scene.

**Use it only when the user gives you a scene and asks for 3D**, and only on a title, closing or hero slide. It counts as that slide's one hero effect (lint `hero-effects`), so drop any `aurora` / `spotlight` background or gradient text on the same slide.

What you need from the user:

1. The scene's **Public URL**: in Spline, Export → Public URL → copy the `https://my.spline.design/<name>-<id>/` link [S1]. Only that form is accepted.
2. A **poster**: a still image of the scene (a screenshot of the editor's play view is fine), saved as `public/media/<kebab-name>.png|jpg`. If they don't send one, ask; don't ship a scene without it.

```tsx
import { SlideFrame, SplineScene } from "../deck/components";

<SlideFrame kind="closing" background="plain" title="…">
  <SplineScene
    src="https://my.spline.design/orbit-hero-1a2b3c4d/"
    poster="/media/orbit-hero-poster.jpg"
    alt="Rotating glass orbit around the product logo"   // or decorative
    height={620}
  />
</SlideFrame>
```

How it behaves:

- **Poster first, always.** The local poster renders immediately. The live scene loads in a sandboxed iframe and the poster fades out only once the scene page has loaded.
- **Poster only** in `?static` screenshots, `?print` / PDF export, the overview grid, with `prefers-reduced-motion: reduce`, when the browser is offline, when the URL can't be reached, and after `timeout` (12 s by default). So review, PDF and an offline talk all show the poster.
- **It fetches from Spline's servers** in present mode. Tell the user the talk needs network for the live scene, and that the scene's look comes from their Spline file (theme tokens don't reach inside it).
- The iframe ignores pointer and keyboard input (`pointer-events: none`, `tabIndex=-1`), so clicks and arrow keys keep driving the deck. Interactive orbit or hover events in the scene won't fire; use Spline's turntable or autoplay animation for motion.
- Why an iframe and not `@splinetool/react-spline`: the iframe needs no npm package (the runtime is tens of MB unpacked and would sit in every deck's install), works with any React version, and keeps Spline's code in its own origin. The cost is no scene API (no variables or events from React) [S2].

Lint: `spline-fallback` (error) when a scene has no poster or a raw Spline iframe skips `<SplineScene>`; `spline-placement` (warn) for a scene off title / closing / hero slides, or more than one per slide; `img-broken` when the poster file is missing.

Sources: [S1] Spline docs, Exporting as Public URLs — https://docs.spline.design/exporting-your-scene/web/exporting-as-public-ur-ls · [S2] Spline docs, Exporting as Spline Viewer (Public URL vs Viewer) — https://docs.spline.design/exporting-your-scene/web/exporting-as-spline-viewer
