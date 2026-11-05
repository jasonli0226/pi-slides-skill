# Workflow: save → list → apply → update

## Save

```bash
# Theme from a finished deck’s brand.css + two patterns
node skills/style-library/scripts/style-lib.mjs save \
  --id acme-q4 \
  --name "Acme Q4 brand" \
  --from ./my-deck \
  --patterns title-hero,kpi \
  --dest user

# Theme block extracted from template tokens (no brand.css yet)
node skills/style-library/scripts/style-lib.mjs save \
  --id navy-pitch-snapshot \
  --from skills/web-slides/template \
  --theme navy-pitch \
  --dest repo
```

What gets written:

1. `pack.json`
2. `brand.css` — from `src/theme/brand.css` if present; else the `--theme` block rewritten as `[data-theme="brand"]`
3. `patterns/*` — recipes + snippets for each `--patterns` id (from the skill’s built-in recipe library, lightly parameterized)

## List / show

```bash
node skills/style-library/scripts/style-lib.mjs list
node skills/style-library/scripts/style-lib.mjs show --id acme-q4
```

## Apply

```bash
node skills/style-library/scripts/style-lib.mjs apply --id acme-q4 --deck ./new-deck
```

Effects:

1. Writes `new-deck/src/theme/brand.css` (unless `--patterns-only`)
2. If `src/slides/index.ts` has `theme: "…"`, sets `theme: "brand"` (unless `--patterns-only`)
3. Writes `content/style-pack.json` and patches `content/deck.spec.yaml` (`style_pack`, theme, per-slide `pattern` / `layout` / title-hero fields)
4. Wires matching `src/slides/*.tsx` (title-hero props, layout-* classNames) and `src/slides/generated/from-pack.ts`
5. Copies pattern files + `WIRE.md` to `style-import/pack-<id>/` (unless `--theme-only`)
6. Prints next steps: `npm run spec && npm run check:tokens && npm run review`

Use `--no-wire` to skip YAML/TSX wiring. Apply does not overwrite `deck.css` / engine components — only deck content and brand tokens.

## Update

```bash
node skills/style-library/scripts/style-lib.mjs update --id acme-q4 --from ./my-deck --patterns title-hero,kpi
```

Same capture as save, but requires the pack to exist; bumps `updated` and replaces theme/pattern files.

## Agent checklist after apply

1. Open `style-import/pack-<id>/` and wire patterns into slides (title hero first slide, KPI row, …).
2. Drop or generate media; do not commit uncleared photos.
3. `npm run check:tokens && npm run lint:in-page && npm run review`
4. If the user likes further tweaks, `update` the pack.
