# Example packs

Shipped under `styles/`:

## `title-hero-light`

- **Patterns:** `title-hero` (light left scrim, left copy, kicker / hero / subtitle / `heroLabel`)
- **Theme:** none (patterns-only) — pair with any dark or light brand
- **Use when:** photo or mesh full-bleed title; airport / keynote energy without copying a third-party deck

## `navy-pitch-snapshot`

- **Theme:** navy-pitch tokens rewritten as `[data-theme="brand"]`
- **Patterns:** optional `kpi` recipe
- **Use when:** software pitch / conference look without relying on the named preset string (useful after style-import flattened a brand)

## Minimal pack.json (patterns-only)

```json
{
  "id": "title-hero-light",
  "name": "Title hero — light left scrim",
  "version": "1.0.0",
  "description": "Full-bleed title with light left scrim.",
  "created": "2026-11-05",
  "updated": "2026-11-05",
  "tags": ["title", "light-scrim"],
  "source": { "kind": "web-slides-template", "note": "Original CSS/TSX snapshot" },
  "theme": null,
  "patterns": [
    {
      "id": "title-hero",
      "kind": "layout",
      "files": [
        "patterns/title-hero.md",
        "patterns/title-hero.css.snippet",
        "patterns/title-hero.tsx.snippet"
      ]
    }
  ]
}
```
