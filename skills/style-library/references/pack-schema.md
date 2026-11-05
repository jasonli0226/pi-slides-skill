# Pack schema

Each pack is a directory:

```
styles/<pack-id>/
  pack.json                 # required metadata
  brand.css                 # optional — [data-theme="brand"] tokens
  patterns/
    <pattern-id>.md         # recipe (when / how to use)
    <pattern-id>.css.snippet   # optional CSS excerpt
    <pattern-id>.tsx.snippet   # optional JSX excerpt
  README.md                 # optional human blurb
```

## `pack.json`

```json
{
  "id": "title-hero-light",
  "name": "Title hero — light left scrim",
  "version": "1.0.0",
  "description": "Full-bleed photo title with light left scrim and dark left-aligned copy.",
  "created": "2026-11-05",
  "updated": "2026-11-05",
  "tags": ["title", "photo", "light-scrim", "hero"],
  "source": {
    "kind": "web-slides-template",
    "path": "skills/web-slides/template",
    "note": "Derived from SlideFrame title-hero + deck.css; no third-party PPTX."
  },
  "theme": {
    "file": "brand.css",
    "selector": "[data-theme=\"brand\"]"
  },
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

### Field rules

| Field | Rules |
|---|---|
| `id` | kebab-case, `[a-z0-9-]+`, matches directory name |
| `version` | semver string |
| `created` / `updated` | ISO date `YYYY-MM-DD` |
| `tags` | short lowercase tokens |
| `theme.file` | omit or null if pack is patterns-only |
| `patterns[].id` | kebab-case; known ids preferred: `title-hero`, `kpi`, `timeline`, `compare`, `bento`, `cards`, `quote` |
| `source.kind` | `web-slides-deck` \| `web-slides-template` \| `manual` |

## `brand.css`

Must define `[data-theme="brand"] { … }` with the same custom properties web-slides expects (`--bg`, `--text`, `--accent`, …). See web-slides `template/src/theme/tokens.css`.

Applying a pack **replaces** (or creates) the deck’s `src/theme/brand.css`. It does not rewrite named presets in `tokens.css`.

## Pattern files

- `*.md` — when to use, structure, lint notes (safe margins, contrast).
- `*.css.snippet` — CSS that already lives in `deck.css` / components; kept for reference so apply can copy into `style-import/pack-<id>/` without mutating the engine.
- `*.tsx.snippet` — minimal JSX using `SlideFrame` / layout classes.

Snippets are **illustrative**. Prefer composing template primitives over pasting large forks.
