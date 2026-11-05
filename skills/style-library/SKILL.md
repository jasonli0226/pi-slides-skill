---
name: style-library
description: Save, list, apply and update named style packs for web-slides decks — theme tokens plus React/CSS component patterns (title hero, KPI, timeline, …). Use when the user likes a deck or component look and wants to reuse it later, asks to save a theme pack, apply a saved style, or browse the style library. Companion to web-slides; does not replace building a deck.
license: MIT
compatibility: Needs Node.js 20+. Works with decks scaffolded by the web-slides skill.
metadata:
  version: "0.1.0"
  companion: "web-slides"
---

# Style library

Capture a look you (or the user) liked — **theme tokens** and/or **component/layout patterns** — as a named **pack**, then reuse it on the next deck.

This skill does **not** vendor third-party PPTX/Google Slides. Packs are **original CSS/TSX snapshots** (and short Markdown recipes) derived from a web-slides deck you already built or from this repo’s template.

Paths below are relative to this skill directory unless noted. Read `references/` when a step tells you to.

## When to use

- User says “save this style”, “remember this theme”, “use the airport title look again”, “apply pack X”.
- After polishing a deck whose brand or layout recipes are worth reusing.
- Before inventing a new brand from scratch when a pack already covers the need.

Prefer **web-slides** built-in / inspiration themes (`midnight`, `aurora`, `paper`, `tech-dark`, `bento-minimal`, `navy-pitch`) for generic looks. Use this library for **user-specific** or **named** packs (project brand, title-hero recipe, KPI strip convention).

## Pack locations

| Location | Path | Who owns it |
|---|---|---|
| **Repo packs** | `skills/style-library/styles/<pack-id>/` | Shared with the skill; commit when the pack is general |
| **User packs** | `~/.pi/agent/style-library/styles/<pack-id>/` | Personal; never commit secrets or uncleared photos |
| **Override** | `$STYLE_LIBRARY_DIR/<pack-id>/` | Wins over both when set |

Search order for `list` / `apply`: `$STYLE_LIBRARY_DIR` → user dir → repo `styles/`. Same `id` in a higher-priority dir shadows a lower one.

Schema: `references/pack-schema.md`. Workflow detail: `references/workflow.md`. Examples: `references/examples.md`.

## Commands

Run from the **repo root** (or any cwd; the script resolves the skill dir):

```bash
node skills/style-library/scripts/style-lib.mjs list
node skills/style-library/scripts/style-lib.mjs save  --id <pack-id> --from <deck-dir> [--name "..."] [--theme brand|navy-pitch|…] [--patterns title-hero,kpi,timeline] [--dest repo|user]
node skills/style-library/scripts/style-lib.mjs apply --id <pack-id> --deck <deck-dir> [--patterns-only] [--theme-only]
node skills/style-library/scripts/style-lib.mjs update --id <pack-id> --from <deck-dir> [--patterns title-hero,kpi]
node skills/style-library/scripts/style-lib.mjs show  --id <pack-id>
```

| Command | Does |
|---|---|
| **list** | Print pack id, name, tags, path |
| **save** | Snapshot `brand.css` / a theme block + selected pattern recipes into a new pack |
| **apply** | Write theme into the deck’s `src/theme/brand.css`, set `theme: "brand"` in `src/slides/index.ts` when present, copy pattern notes/snippets into `style-import/pack-<id>/` |
| **update** | Refresh an existing pack from a deck (bumps `updated`, replaces files) |
| **show** | Dump `pack.json` + file list |

## Agent workflow

1. **Study.** Open the deck (or template slide) the user liked. Note theme (`brand` / preset) and which patterns matter (title hero, KPI strip, timeline, compare, …).
2. **Save.** Pick a kebab `pack-id`. Run `save` with `--from <deck>` and `--patterns …` as needed. Prefer `--dest user` for one-off client brands; `--dest repo` only for packs meant to ship with this skill.
3. **Confirm.** `list` / `show` and tell the user the id and what was captured (theme tokens? which patterns?).
4. **Apply later.** On a new deck, `apply --id <pack-id> --deck <dir>`, then `cd <dir> && npm run check:tokens && npm run review`. Adapt copy; do not paste third-party assets.
5. **Update.** If the user refined the look, `update --id <pack-id> --from <deck>`.

## Scope (what a pack holds)

- **Theme:** CSS custom properties under `[data-theme="brand"]` (colors, fonts, radii, layout-feel tokens). Source: deck `src/theme/brand.css`, or a named block extracted from `tokens.css`.
- **Patterns:** Markdown recipes + optional `.css.snippet` / `.tsx.snippet` for layouts/components already in web-slides (`title-hero`, `kpi`, `timeline`, `compare`, `bento`, …). Patterns describe how to compose existing primitives — they do not fork the whole engine.
- **Not in scope:** vendored PPTX, hotlinked stock photos, proprietary fonts, copying another vendor’s slide masters.

## Pairing with web-slides

- Scaffold with web-slides (`new-deck.mjs`), then **apply** a pack.
- Or finish a deck, **save** a pack, then point web-slides brief at that pack next time.
- Style **import** (`style:url` / `style:images` / `style:svg`) creates a one-off `brand.css`. If the user likes it, **save** it here so the next deck does not re-scrape.

See web-slides `references/style-import.md` and `docs/template-inspiration.md` for one-shot brand capture; this skill is the **reuse** layer.
