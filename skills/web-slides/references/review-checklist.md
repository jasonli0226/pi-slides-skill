# Self-review checklist

Run `npm run review`, then `npm run critique` (writes `review/critique.md`). Go through this list with the screenshots open. Complete visual findings in the critique; do not auto-rewrite unless the user asks. Every box must be true before export.

## Automated (from review/report.md; must be 0 errors)

- [ ] `frame`: every slide uses SlideFrame.
- [ ] `duplicate-id`: every slide id in `index.ts` is unique.
- [ ] `title-sentence`: titles have 5 or more words and end with punctuation.
- [ ] `source-missing` / `cite-unknown`: every Stat, BarChart, EChart, Quote and Figure cites a source listed on that slide (or is `illustrative`).
- [ ] `img-alt` / `img-broken`: every `<img>` / `<Figure>` has meaningful alt text and loads successfully.
- [ ] `leftover`: no lorem, TODO, TBD, FIXME, placeholder, `{{ }}`, undefined or NaN.
- [ ] `emoji-icon`: no emoji.
- [ ] `off-stage`, `footer-overlap`, `clipped`, `box-overlap`, `safe-margin`: nothing spills off the stage, into the footer, out of a container, on top of peer content, or outside the padding band.
- [ ] `uneven-gaps` (warn) / `absolute-spam` (warn >2, error >5): sibling gutters and peer card heights stay even; body content is Grid/Flex, not a pile of absolutes (see `layout-guide.md`).
- [ ] Title openers use the left hero + scrim recipe (full-bleed `backdrop` when an image is available); avoid centered headlines over busy plates.
- [ ] `tiny-text`: nothing under 18px, including chart and diagram text.
- [ ] `chart-type` / `chart-legibility` / `chart-baseline` / `chart-dual-axis` (warn): EChart follows `chart-guide.md`: no pie or 3D, ≤5 series with the title's series named in `highlight`, ≤12 bars per series, bar axes from zero, one value axis unless the notes justify two.
- [ ] `spline-fallback` (error) / `spline-placement` (warn): every Spline scene goes through `<SplineScene>` with a local poster, on a title, closing or hero slide, one per slide.
- [ ] `contrast`: solid-background text meets 4.5:1 (3:1 if large).
- [ ] `render` / console: no Mermaid or Shiki errors and no runtime errors.
- [ ] `npm run check:tokens` passes for the theme in use (including an imported `brand` theme). Every theme must define each checked token as 6-digit hex (`#rrggbb`); `#fff`, `rgb()` or a missing token fails.
- [ ] `spec-mismatch` (when `content/deck.spec.yaml` has `approved: true`): build slide **count**, **ids in order**, and SlideFrame **kinds** match the approved spec. If the user changed the spec after approval, re-approve or justify; do not silently diverge.

## Style import (if a URL, images or SVGs set the look)

- [ ] Contrast passes, and any auto-adjusted brand colors (`contrastFixes` in `style-import/style-spec.json`) were reported to the user.
- [ ] Licensing is confirmed. Only style was borrowed from third-party sites: no logos, product photos, illustrations or captures in `public/` or on slides. User images and SVGs are owned or licensed, and Canva elements were confirmed by the user.
- [ ] Fonts are swapped. No proprietary font (SF Pro, Söhne, Circular and so on) is referenced or embedded, and any non-bundled free font is installed and imported in `main.tsx`.
- [ ] The theme reads as the brand in the contact sheet (bg, accent, type weight, radius), and the hand-off names what was borrowed.

## Visual (you judge, from the PNGs)

- [ ] Reading only the titles in order tells the whole story.
- [ ] Each slide has one focal point, and the accent color is used on that point only.
- [ ] The theme was chosen on purpose. The deck isn't still on the template default (`midnight`, stock tokens, empty `brand.css`) unless the user asked for that.
- [ ] Alignment: left edges line up across slides; cards in a row have equal heights; gutters match; nothing looks accidentally off-center. Prefer `.layout-*` recipes from `layout-guide.md`.
- [ ] There's enough whitespace: no slide feels crammed (over 40 words is a smell).
- [ ] Gradient text and text over glows are clearly readable, since the lint can't measure these.
- [ ] Icons are all lucide with the same stroke, and the same concept uses the same icon everywhere.
- [ ] User-provided media sits under `public/media/`, uses `<Figure>`, and is cited or marked illustrative (see `media-guide.md`). No invented logos.
- [ ] Charts are labelled with units and timeframes, start at zero, and highlight the bar or series the title mentions. The chart type fits the story (`chart-guide.md`).
- [ ] Any Spline scene's poster reads well on its own (it is what the PDF and offline talk show), and the user knows the live scene needs network.
- [ ] Diagram type matches the scenario (see `diagram-guide.md`): Mermaid only if ≤8 nodes; swimlanes / C4 / sequence use the React components.
- [ ] Layered maps: ≤6 layers, ≤5 cells per layer; C4: one zoom level, ≤8 boxes; Sequence: ≤6 actors, ≤8 messages.
- [ ] Diagram labels aren't cut off; arrows are unidirectional and specifically labelled; no emoji; text ≥18px.
- [ ] Illustrative / generic rebuilds of vendor architectures are marked as such (Pill or caption), never copied proprietary.
- [ ] The technical deck includes architecture, results, governance and lessons slides.
- [ ] The final slide has a clear ask or next step and lists references.

## Design spec

- [ ] `content/deck.spec.yaml` was the approval artifact; `approved: true` only after the user signed off.
- [ ] Locked slides were not clobbered by `npm run spec`; stubs were promoted per `deck-spec.md`.
- [ ] Spec fields (title, type, components, sources) still match the polished TSX for locked slides, or manual merge was reported.

## Facts

- [ ] Every number appears verbatim in a source you opened. Re-open the source if you're unsure.
- [ ] Every quote is verbatim and attributed.
- [ ] Nothing is `illustrative` unless the user agreed, and the notes say why.
- [ ] Example slides and example sources from the template are deleted.

## Motion (run `npm run dev` or `review -- --steps`)

- [ ] Click steps reveal in a logical order, and the step count matches `steps`.
- [ ] No more than 2 or 3 transition kinds are used, and nothing animates in a loop over content.
- [ ] `hero-effects` (warn): each slide has at most one hero effect: a count-up `Stat` group (any number of `Stat`s together counts once), an `aurora` or `spotlight` background, `.text-gradient` text outside a `Stat`, or a `SplineScene`.
