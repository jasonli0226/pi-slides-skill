# Layout guide (presentation Flexbox + Grid)

Short playbook for arranging content on the **1920×1080** stage. Prefer the named utilities in `deck.css` over one-off positioning.

External references (read as needed; do **not** paste them into the deck or this skill):

- [CSS Tricks — A Complete Guide to Flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [CSS Tricks — A Complete Guide to CSS Grid](https://css-tricks.com/snippets/css/complete-guide-grid/)

CSS Tricks’ own framing: **Grid for the page/stage structure, Flexbox for rows and component alignment.** On a fixed slide that maps cleanly: Grid for the body columns; Flex for KPI strips, icon rows and stacking inside a cell.

## Stage structure vs rows

| Use | When | Deck default |
|---|---|---|
| **CSS Grid** | Dividing the `.frame-body` into columns/rows with known tracks (`1fr 1fr`, `0.55fr 1.45fr`) | `.grid-2/3/4`, `.layout-compare`, `.layout-hero`, `.layout-bento`, `.layout-bento-4` |
| **Flexbox** | One-dimensional rows or columns: KPI strip, title→body stack, media→caption, icon lists | `.row`, `.layout-stack`, `.layout-kpi`, `.layout-media`, `.layout-section`, `.layout-timeline-strip`, `.card` |

`SlideFrame` already owns the outer chrome (padding, title, footer). Your job is only the body.

## Recipes

### Title hero (full-bleed plate + left copy)

Prefer this for opening `kind="title"` slides. **Do not center** the headline.

```tsx
<SlideFrame
  kind="title"
  hero
  footer={false}
  background="plain"
  backdrop={{ src: "/media/hero-plate.webp", decorative: true }}
  title="Ship technical talks that look designed, not generated."
  subtitle="One-line promise under the headline."
>
  <div className="row" style={{ gap: 12 }}>
    <Pill>…</Pill>
  </div>
</SlideFrame>
```

- **`backdrop`**: full-bleed image (cover) behind chrome. Mark ornamental plates `decorative`.
- **`title-scrim`**: automatic left-to-right fade from `--bg` so type stays readable on photos.
- **Left column**: `.frame-title-hero` keeps header/body ≤ ~900px on the left; pills and meta stay with the copy.
- Kind `title` without `center` opts into the hero layout even without a backdrop (scrim over `background`).
- Pass `center` only for rare centered openers or `kind="section"` / quote slides.

### Title + body (stack)

```tsx
<div className="layout-stack">
  <Appear><p className="lede">…</p></Appear>
  <div className="layout-kpi">…</div>
</div>
```

Column flex, `gap` from the scale, `min-height: 0` so children can shrink without blowing the footer.

### KPI strip

```tsx
<div className="layout-kpi">
  <Stat … /><Stat … /><Stat … />
</div>
```

Equal-width children via `flex: 1 1 0` + `min-width: 0`. Prefer this over `justify-content: space-between` with fixed-width boxes (uneven side gaps).

### Two-column compare

```tsx
<div className="layout-compare">
  <Card …>Before</Card>
  <Card …>After</Card>
</div>
```

Equal tracks, `align-items: stretch` so card heights match. For three/four peers use `.grid-3` / `.grid-4`.

### Media + caption

```tsx
<div className="layout-media">
  <Figure src="/media/…" alt="…" cite="…" />
</div>
```

`.layout-media` is a column stack; `<Figure>` already owns the caption row. Put the figure in a grid cell when it shares the stage with copy.

### Hero + chart (asymmetric `fr`)

```tsx
<div className="layout-hero">
  <Stat size="xl" … />
  <BarChart … />
</div>
```

`0.55fr 1.45fr` (or `.layout-hero-flip` for the reverse). Same idea as an inline `style={{ gridTemplateColumns: "0.55fr 1.45fr" }}` on `.grid-2`, but named so agents reuse one pattern.


### Bento grid (asymmetric feature tiles)

```tsx
<div className="layout-bento">
  <Card highlight title="Hero tile">…</Card>
  <Card title="Tile">…</Card>
  <Card title="Tile">…</Card>
  <Card title="Tile">…</Card>
  <Card title="Tile">…</Card>
</div>
```

`layout-bento` is a 3×2 Grid with the first child spanning both rows (product / hardware decks). `layout-bento-4` is a 2×2 Grid with the first child spanning both rows (four tiles total). Prefer these over hand-tuned `gridTemplateAreas`.

### Section divider (chapter break)

```tsx
<div className="layout-section">
  <div className="section-kicker">02 — Roadmap</div>
  <div className="section-rule" />
  <h2 className="section-title">We ship the pilot in twelve weeks.</h2>
  <p className="section-lede">Optional one-line bridge into the next arc.</p>
</div>
```

Use for mid-deck chapter breaks (`type: section`). Big display type + accent hairline; keep body copy short.

### Timeline strip (compact milestones)

```tsx
<div className="layout-timeline-strip">
  {items.map((it) => (
    <div key={it.when} className="timeline-strip-item">
      <div className="timeline-strip-when">{it.when}</div>
      <div className="timeline-strip-title">{it.title}</div>
      <div className="timeline-strip-body">{it.body}</div>
    </div>
  ))}
</div>
```

Equal flex columns with a colored top edge. For the fuller dotted-line roadmap, keep using the `<Timeline>` component (`.timeline`). Use the strip when you need 3–5 short milestones in one row without the tall marker stack.

## Safe patterns

- **`gap`** for gutters (Grid and Flex). Do not fake gutters with margin on every child.
- **`min-width: 0` / `min-height: 0`** on flex/grid children that hold text, charts or figures — otherwise the default `min-size: auto` refuses to shrink and overflows the stage. Utilities: `.u-min0`, and every `.layout-*` / `.grid-*` child should inherit this habit.
- **`flex: 1 1 0`** (not bare `flex: 1` alone when you need equal columns) so basis is zero and free space splits evenly. `.u-grow` and `.layout-kpi > *` do this.
- **`align-items: stretch`** (default for Grid; set explicitly on Flex rows of cards) so peer cards share a height.
- **`justify-content`**: `flex-start` or rely on `gap` for strips; use `center` for sparse hero slides; avoid `space-between` when item count varies (last row looks ragged).

## Anti-patterns

- **Absolute spam.** `position: absolute` belongs to SlideFrame chrome, backgrounds (`.bg`, `.title-backdrop`, `.title-scrim`) and rare diagram overlays — not everyday content. Prefer Grid/Flex. Lint **warns** above 2 absolute nodes in the body and **errors** above 5.
- **Box overlap.** Content units (cards, stats, figures, pills, diagram roots) must not stack on top of each other. Use `gap` / named `.layout-*`. Lint rule `box-overlap` fails the review.
- **Safe-margin breach.** Leaf copy must stay inside the SlideFrame padding band (~120×96). Lint rule `safe-margin` fails the review.
- **Footer collision.** Body content must stop above the sources band. Never extend padding into the footer; lint rule `footer-overlap` fails the review.
- **Centered title openers.** Prefer the left hero + scrim recipe over `center` for `kind="title"`.
- **Uneven cards / gaps.** Sibling cards in one row should share height; gutters between peers should match. Prefer `.layout-compare` / `.layout-kpi` over hand-tuned margins. Lint warns on `uneven-gaps` when measured gutters in a row diverge.
- **Fixed pixel columns** that ignore the 1920 stage padding. Use `fr`, `%` of the body, or the named layouts.

## 1920×1080 overflow rules

1. Stage is exactly **1920×1080** with `overflow: hidden`. Anything past the edge is an `off-stage` error.
2. Safe padding is owned by SlideFrame (~120px x, 96px top, 88px bottom). Do not fight it with negative margins.
3. `.frame-body` is `flex: 1; min-height: 0; overflow: hidden`. Children that need scroll never belong on a slide — shorten copy or split the slide.
4. Text clipped inside an `overflow: hidden` box is a `clipped` error. Shrink type, reduce nodes, or give the column more `fr`.
5. Long words / URLs: keep them in `notes` or break with shorter labels; do not rely on tiny type.
6. After layout changes, run `npm run review` and open the PNGs — automated geometry catches spills; you still judge balance.

## Checklist before leaving a slide

- [ ] Body uses a `.layout-*` / `.grid-*` / `.row`, not a pile of absolutes.
- [ ] Peer cards share height; KPI gutters look even.
- [ ] No content in the footer band; contact sheet shows breathing room.
- [ ] Review report has no `off-stage`, `footer-overlap`, `box-overlap`, `safe-margin`, `clipped`, or `uneven-gaps` hits for this slide.
