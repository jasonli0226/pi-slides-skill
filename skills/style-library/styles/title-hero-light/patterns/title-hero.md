# Pattern: title-hero (light left scrim)

Use for the opening slide when the backdrop is a photo, mesh, or illustration.

## Structure

1. `SlideFrame` with `titleHero`, `backdrop` (image URL or import), `scrim="light"` (or `"dark"` on bright photos), optional `heroLabel`.
2. Left-aligned kicker → hero title → subtitle. Keep copy in the left ~45–55% (scrim zone).
3. Prefer `safe` margins; avoid absolute-spam for title text (use frame slots).

## Lint

- Light scrim + dark text: contrast is checked as-if on white.
- Dark scrim + light text: normal dark-theme contrast.
- Do not place KPIs or dense body on the title hero; use a following slide.

## Media

Generate or use a cleared placeholder. Do not commit uncleared third-party photos.
