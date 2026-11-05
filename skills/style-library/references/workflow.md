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
3. Copies pattern files to `new-deck/style-import/pack-acme-q4/` for the agent to follow (unless `--theme-only`)
4. Prints next steps: `npm run check:tokens && npm run review`

Apply never overwrites `src/components.tsx` or `deck.css` automatically — that would fight template upgrades. The agent (or user) follows the pattern recipes.

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
