# Template inspiration (free tech slide packs)

Use free Google Slides / PowerPoint **tech** themes as **design references**, not as the deck engine. pi-slides-skill builds React 19 + Vite decks; palettes and layout *ideas* from the shortlist below are **already baked** into built-in `[data-theme]` presets in `tokens.css` and named recipes in `deck.css`. Agents should **prefer those presets** and must **not** re-scrape the external pack pages on every deck run. Use `style:url` / `style:images` only when the user supplies a **new** brand. We do **not** convert full PPTX/Slides files into React, and we do **not** commit third-party template files into this repo unless they are clearly CC0 / public domain.

Related skill docs: [style-import.md](../skills/web-slides/references/style-import.md), [layout-guide.md](../skills/web-slides/references/layout-guide.md), [deck-spec.md](../skills/web-slides/references/deck-spec.md).

## Why this helps

| What free packs give us | How we use it |
|---|---|
| Dark / clean IT aesthetic | Built-in presets (`tech-dark`, `bento-minimal`, `navy-pitch`) — or `style:images` only for a *new* user brand |
| KPI strips, compare columns, section dividers, pitch / bento / timeline | `.layout-kpi`, `.layout-compare`, `.layout-hero`, `.layout-bento`, `.layout-section`, `.layout-timeline-strip` |
| Accent + surface relationships | Contrast-checked tokens (`check:tokens`), never paste hex into TSX |
| Slide *count* and story beats | Inform `content/deck.spec.yaml` ordering — not one-to-one PPTX import |

What they will **not** do well: live Motion, Mermaid/C4 React diagrams, Playwright screenshot lint, or editable PPTX as the source of truth.

## License rules (read before extracting)

Always re-check the linked terms; sites update FAQs.

| Source | Typical free terms (as of research date) | OK for our workflow? |
|---|---|---|
| [SlidesCarnival](https://www.slidescarnival.com/terms-of-use) | **CC BY 4.0** — personal + commercial; attribute SlidesCarnival + link; do **not** redistribute unmodified template files | Yes — inspiration + screenshot → `style:images`. Keep attribution if you also ship a deck that embeds their graphics (we prefer not to). |
| [Slidesgo](https://slidesgo.com/faqs) | Free personal + commercial; free users **must keep credits slide**; no reselling/redistributing templates (or modified templates) for download | Yes — style/layout reference only. Do not vendor their PPTX/GS into this repo. |
| [PresentationGO](https://www.presentationgo.com/) | Free personal/edu/commercial **with attribution** (“Design by PresentationGO” or link); no reselling templates | Yes for diagram/layout inspiration; credit if shipping their art. |
| [Microsoft Create](https://create.microsoft.com/en-us/templates/presentations) | Microsoft-hosted Office templates for use in PowerPoint / Microsoft 365 | Fine as visual reference; do not republish the template files here. |
| Canva / SlidesCarnival Canva-only packs | Canva Content License often **restricts** use outside Canva | Prefer native PPT/GS packs. If user insists on Canva exports, confirm rights before `style:svg` / media copy (see style-import Licensing). |

**Hard rule for this repository:** document URLs + extraction steps. Do **not** commit downloaded `.pptx` / `.potx` / Google Slides exports / Canva packs unless the license is clearly CC0/public domain and you record proof in the PR.

## Shortlist (5 picks)

Chosen for: dark or clean tech look, modern IT/AI audience fit, useful architecture / KPI / compare layouts, clear commercial-friendly free terms, not childish or heavily character-branded.

| # | Pack | Source | URL | License / attribution | Why it helps this skill | Extract (not convert) |
|---|---|---|---|---|---|---|
| 1 | **Dark Modern Tech Startup Brand Slides** | SlidesCarnival | https://www.slidescarnival.com/template/tech-startup-brand/154090 | CC BY 4.0 — credit SlidesCarnival | Dark 16:9 startup / tech pitch energy; matches `midnight`-class decks | Palette (near-black surfaces, one bright accent); title/agenda/section rhythm; sparse 3D chrome → ignore as decoration, keep spacing |
| 2 | **Dark Minimal Consumer Electronics Brand Slides** | SlidesCarnival | https://www.slidescarnival.com/template/consumer-electronics-brand/154101 | CC BY 4.0 — credit SlidesCarnival | Bento / product-grid feel; Inter; black & white restraint close to Apple-style decks we already demo | Card grid → `.grid-2/3/4` + equal-height cards; KPI + feature tiles; high whitespace → `--pad-*` / calm `--motion-scale` |
| 3 | **Minimalistic IT Software Pitch Deck** | SlidesCarnival | https://www.slidescarnival.com/template/it-software-pitch-deck/55642 | CC BY 4.0 — credit SlidesCarnival | Navy / blue geometry for software pitches; 25+ slides with charts and plan beats | Pitch sequence for `deck.spec.yaml`; comparison and roadmap layouts; blue accent family for a `brand` preset |
| 4 | **Tech Business Conference** | Slidesgo | https://slidesgo.com/theme/tech-business-conference | Free use; **keep credits slide** on free tier | Dark gradient conference kit: calendars, timelines, graphs — good for IT event / roadmap decks | Timeline → existing timeline slide type; planner/KPI strips → `.layout-kpi`; dark gradient accents (rebuild as CSS tokens, not imported gradient art) |
| 5 | **Futuristic Background** | Slidesgo | https://slidesgo.com/theme/futuristic-background | Free use; **keep credits slide** on free tier | Dark navy + orange contrast; multi-color variants; multipurpose tech vibe without cartoon mascots | Hero title weight/tracking; accent contrast pairs; optional second brand mood (`brand-futura`-style preset via renamed `brand.css`) |


## Built-in presets (prefer these)

Original CSS reconstructions in `skills/web-slides/template/src/theme/tokens.css`. **No** PPTX/GS files, stock photos, icons, or vendor font files were vendored — palette and type *feel* only. Our CSS is original; attribute inspiration sources as noted.

| Theme id | When to use | Inspiration (do not re-scrape) | License note |
|---|---|---|---|
| `tech-dark` | Startup / product keynotes; near-black + electric lime; bold condensed display | SlidesCarnival [Dark Modern Tech Startup Brand](https://www.slidescarnival.com/template/tech-startup-brand/154090) | CC BY 4.0 — credit SlidesCarnival for the *inspiration*; our tokens are a reconstruction |
| `bento-minimal` | Hardware / product grids; black & white restraint; Inter; airy padding; calm motion | SlidesCarnival [Dark Minimal Consumer Electronics Brand](https://www.slidescarnival.com/template/consumer-electronics-brand/154101) | CC BY 4.0 — same attribution practice |
| `navy-pitch` | Software pitches, IT roadmaps, conference kits; deep navy + blue / violet | SlidesCarnival [Minimalistic IT Software Pitch Deck](https://www.slidescarnival.com/template/it-software-pitch-deck/55642); layout energy also from Slidesgo [Tech Business Conference](https://slidesgo.com/theme/tech-business-conference) + [Futuristic Background](https://slidesgo.com/theme/futuristic-background) | SlidesCarnival CC BY 4.0; Slidesgo free tier requires keeping *their* credits slide **only if** you ship their content (these presets do not) |

Also still available: `midnight`, `aurora`, `paper` (general-purpose defaults).

Related layouts added for the same study pass: `.layout-bento` / `.layout-bento-4`, `.layout-section`, `.layout-timeline-strip` (see `layout-guide.md`).

**Agent rule:** pick a row above with `npm run new-deck … --theme <id>` (or set `theme:` in `src/slides/index.ts`). Do **not** open the pack URLs to re-extract colors unless the user asks to refresh the presets or brings a different pack.

### Honorable mentions (use carefully)

| Pack | URL | Note |
|---|---|---|
| Cool Minimal 3D Technology Consulting (SlidesCarnival) | https://www.slidescarnival.com/template/technology-consulting/149905 | Strong blue/black consulting look, but **Canva-first** export path — extra license friction |
| Cyber Tech (PresentationGO) | https://www.presentationgo.com/presentation/cyber-tech-template-powerpoint-google-slides/ | Clean 6-slide tech kit + palette slide; attribution required; robot art is optional — prefer palette/layout only |
| Microsoft Create gallery (e.g. Dark modernist / Hexagon dark) | https://create.microsoft.com/en-us/templates/presentations | Official free Office looks; browse in-product — URLs rotate; good clean dark reference |

Browse hubs: [SlidesCarnival technology](https://www.slidescarnival.com/tag/technology), [Slidesgo technology](https://slidesgo.com/technology), [PresentationGO](https://www.presentationgo.com/), [Microsoft Create presentations](https://create.microsoft.com/en-us/templates/presentations).

## Agent workflow

### Default (every deck)

1. **Pick a built-in theme** with the user: `midnight` / `aurora` / `paper`, or an inspiration preset `tech-dark` / `bento-minimal` / `navy-pitch` (table above).
2. Scaffold with `--theme <id>` and use the matching layout recipes (`.layout-bento`, `.layout-section`, `.layout-timeline-strip`, plus the older `.layout-kpi` / `.layout-compare` / `.layout-hero`).
3. Do **not** open the shortlist URLs to re-extract colors unless refreshing presets.

### Only when the user supplies a *new* brand

Do this **outside** committing vendor files. Prefer the user’s own screenshots / brand assets.

1. **Confirm rights.** Link the terms above if the look came from a free pack. Say you will borrow **style** (colors, spacing, layout recipes), not logos, stock photos, icon packs, or font files.
2. **Capture references** the user owns into a local folder (not `public/`, not git unless their designs).
3. **Import palette:**
   ```bash
   cd <deck>
   npm run style:images -- ~/refs/their-brand --mood dark --apply
   npm run check:tokens
   npm run review -- --theme brand
   ```
   Or `npm run style:url -- <their marketing page>`.
4. **Translate layouts into recipes** (edit skill/deck CSS, don’t paste PPTX). If a pattern repeats and isn’t covered, add a named class in `deck.css` and document it in `layout-guide.md`.
5. **Update the design spec** in `content/deck.spec.yaml`. Never commit SlidesCarnival/Slidesgo binary packs.
6. **Attribution hygiene:** if any third-party graphic ships in the **user’s** exported PDF, follow that pack’s credit rules. Inspiration-only React rebuilds that use Lucide + our tokens typically need no vendor credit slide — still link this doc when a palette was borrowed.

## Anti-patterns

- Committing `.pptx` / Google Slides exports “for reference” under `examples/` or `fixtures/`
- Screenshotting a vendor deck onto a slide without citation / rights
- Treating Mermaid or `LayeredArchitecture` as replaceable by a static PPT diagram image
- Copying SF Pro / proprietary fonts from a preview — use Fontsource swaps per style-import
- Assuming Slidesgo free = no credits (free tier requires the credits slide if you use their content)

## Research notes

- Researched for pi-slides-skill (IT/AI React decks) on 2026-11-05 (Asia/Hong_Kong).
- Primary sources: SlidesCarnival [Terms](https://www.slidescarnival.com/terms-of-use) + [technology tag](https://www.slidescarnival.com/tag/technology); Slidesgo [FAQs](https://slidesgo.com/faqs); PresentationGO template terms; Microsoft Create presentations gallery.
- Prefer **documenting picks + `style:images` workflow** over vendoring copyrighted packs.
