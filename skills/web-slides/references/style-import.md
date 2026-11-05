# Style import: build a theme from a URL, images or SVGs

**Prefer built-in presets first.** `tokens.css` already ships `midnight`, `aurora`, `paper`, `tech-dark`, `bento-minimal`, and `navy-pitch` (inspiration reconstructions — see `docs/template-inspiration.md`). Agents should **not** re-scrape SlidesCarnival / Slidesgo / similar free packs each run for those looks.

Use this workflow when the user says "make it look like <*their* site>", "use our brand", "match these images", or hands you SVG artwork for a **new** brand. The result is always a **role-based theme** in `src/theme/brand.css` (`[data-theme="brand"]`), plus optional media under `public/media/`. Slides keep using tokens; never paste hex into TSX.

**Borrow style, not assets.** Colors, a type scale, spacing, corner radius and how much things move are not copyrightable, so you can borrow them. Logos, product photos, illustrations, icon sets and font files can be, so you never take those from a third-party site.

## Commands (run inside the deck)

| Input | Command | Produces |
|---|---|---|
| Public web page | `npm run style:url -- https://example.com` | `style-import/style-spec.json`, `style-import/captures/section-*.png` (reference only), `src/theme/brand.css` |
| Reference images (mood board, brand photos the user owns) | `npm run style:images -- <dir or files>` | spec + `brand.css`; `--copy` also copies the images to `public/media/imported/` |
| SVG artwork the user owns | `npm run style:svg -- <dir or files>` | spec + `brand.css` + normalized copies in `public/media/svg/<kind>-<name>.svg` |

The flags are shared:
- `--apply` sets `theme: "brand"` in `src/slides/index.ts`.
- `--name <theme>` sets the theme name.
- `--mood dark|light` forces the mood.
- `--out <dir>` sets where the spec goes.
- `--css <file>` writes the CSS somewhere else, which is useful for a dry run.

`style:svg` also accepts:
- `--no-copy` skips copying the SVGs.
- `--no-theme` copies and classifies only.
- `--svgo` uses svgo if it is installed.

Every command ends by running `npm run check:tokens` and exits non-zero if a pair fails.

To preview without switching the deck: `npm run dev` then open `/?theme=brand`, or `npm run review -- --theme brand`.

## Agent workflow

1. **Ask what the input is and confirm the rights.**
   - A public URL can be used for style only.
   - For images and SVGs, ask whether the user made them, owns them, or has a license. If they came from Canva, see Licensing below.
2. **Run the matching command.** Read the console summary: palette, mood, the accent picks, font swaps, and contrast fixes.
3. **Open `style-import/style-spec.json`** and sanity-check it against the captures or the source images:
   - Is the bg really the page's background, not a hero photo?
   - Is the accent the brand's link or button color?
   - If either is wrong, either:
     - hand-edit `brand.css` (keep 6-digit hex), or
     - re-run with `--mood`.
4. **Set the theme.** Add `--apply`, or set `theme: "brand"` in `src/slides/index.ts` yourself.
5. **Check it.** Run `npm run check:tokens`, then `npm run review`. Look at the contact sheet: the brand feel should come through, and every slide must still pass contrast.
6. **Fonts.** If the spec says `installed: false`:
   - Run the `npm i <pkg>` it gives.
   - Add `import "<pkg>";` to `src/main.tsx`.
   - Otherwise the stack falls back to Inter.
7. **Hand off.** Tell the user what you borrowed (palette, fonts and what they were swapped to, layout feel) and what you did not borrow (logos, photos). Name any contrast auto-fixes so they know a brand color was darkened or lightened.

## URL → spec (what `style:url` does)

1. **Load the page.** Playwright opens the URL at 1440×900, waits for network idle, and screenshots the hero plus the next 3 viewport sections into `style-import/captures/`. The `style-import/` folder is gitignored. The captures are for your eyes only: never commit them, never put them in `public/`, never show them on a slide.
2. **Read computed styles** across about 4 viewports:
   - **Backgrounds** weighted by painted area: the largest is `bg`.
   - **Text colors** weighted by characters × size: the high-contrast one is `text`.
   - **Link and button colors**, filtered to saturated ones: these are the accents.
   - **Type:** the largest visible heading is the hero, the next size step down is h2, and body text is the dominant 12–24px run. Each gives family, size, weight, line-height and letter-spacing.
   - **Corner radius** of buttons and cards (median), **box shadows** (none, soft or default), **section padding** (airy, default or dense), and **transition durations** (calm, default or expressive).
   - `:root` CSS custom properties whose names look like colors, which are often the design-system tokens themselves.
3. **Build a pixel palette.** k-means (k=10) on the screenshots catches gradients and backgrounds that the CSS walk misses. It counts half as much as the computed colors.
4. **Map to tokens and layout** (see below), write the spec and `brand.css`, and run the contrast check.

The spec has these keys:
- `palette.{css, screenshot, text, accents}`
- `typography.{hero, h2, body, mono}`
- `fonts` (source → used)
- `layout.{measured, tokens}`
- `cssVars`
- `tokens`
- `contrastFixes`
- `captures`

## Images → spec (`style:images`)

- Each image is decoded in headless Chromium (canvas `getImageData`, downsampled to 120px), so no image libraries are needed.
- Deterministic k-means (k=8, `--k` to change) runs per image. The per-image palettes are then pooled so one large photo cannot drown the others.
- **Mood:** each image votes dark or light by its weighted luminance (below 0.3 is dark), and the majority wins. Override with `--mood`.
- **bg** is the heaviest swatch on the mood side.
- **text** is the palette's low-chroma color with the highest contrast against bg if it reaches 7:1, otherwise a tinted near-white or near-black.
- **Accents** are the most saturated swatches, scored by chroma × √weight, at least 28° apart in hue, and in a lightness band that can stand as text on that bg.
- Missing accents are generated by rotating the hue of accent 1.

## SVG → spec and assets (`style:svg`)

1. **Palette.**
   - Read the `fill`, `stroke`, `stop-color` and `color` attributes and the style declarations they appear in. Backgrounds count ×3 and icons ×0.5.
   - Also render every non-icon SVG and take its pixel palette for area weighting.
   - The background SVGs' own pixel palette sets `bg`.
2. **Classify** each file. The class is in the output file name:
   - `icon`: square, a viewBox of 64 or less, or at most 1–2 inks with few paths.
   - `frame`: a stroked rect with no fill and no full-bleed rect.
   - `background`: wide (aspect over 1.5) with a full-bleed rect or a gradient or pattern.
   - `decorative`: anything else.
3. **Normalize.**
   - Remove the XML prolog, comments, `<metadata>`, editor attributes (Inkscape, Sodipodi, Sketch, Figma), `<script>` and `on*` handlers.
   - Add `viewBox` and `xmlns` if they are missing.
   - Icons and frames lose `width`/`height` so they scale with their container.
   - **Icons get `currentColor`** so they follow `--accent` or text color.
   - With `--svgo` and svgo installed (`npm i -D svgo`), svgo runs as well.
4. **Place** the results in `public/media/svg/<kind>-<name>.svg` and use them like this:
   - **background:** `<Figure src="/media/svg/background-….svg" decorative fit="cover" frame={false}>`, or CSS `background-image` on a frame-level wrapper.
   - **frame:** an absolutely positioned overlay inside the slide's content box with `pointer-events: none`.
   - **decorative:** a corner accent using under 25% of the stage, via `<Figure decorative frame={false} shadow={false}>`.
   - **icon:** prefer lucide for UI icons. Use an imported icon only when it is the user's own brand mark or glyph, and keep it monochrome.
   - Re-run `npm run review` (the `img-alt` and `img-broken` rules apply).

## Mapping to role tokens

- **mood:** dark if the dominant bg has luminance below 0.2.
- **`--bg`:** the dominant background, with hue kept and lightness clamped:
  - dark: 3–14%
  - light: 94–100%
- **`--surface`, `--surface-2`, `--bg-elev`, `--border`:** steps from bg toward the text side.
  - On light themes with an off-white bg, cards lift to white (Apple-style).
- **`--text`:** the explicit or best-contrast neutral. **`--text-muted`:** a mix of text and bg (62/38).
- **`--accent`, `--accent-2`, `--accent-3`:** link or button colors first, then saturated swatches, then hue rotation.
- **`--warning`, `--danger`:** stay semantic (amber and red) and are only contrast-adjusted.
- **`--on-accent`:** whichever of white, near-black or bg reads best on accent.
- **`--glow-*`, `--accent-gradient`:** derived from the accents.
- **`--code-bg`:** always dark, so the `github-dark-default` Shiki theme stays readable.

### Contrast auto-fix (keep hue, change lightness)

Each failing pair is fixed by moving the foreground's HSL lightness away from the background 1% at a time, keeping hue and saturation, until it passes. If that direction runs out, the fix tries the other direction, and as a last resort falls back to black or white. The targets have a margin over `check:tokens`:

| Token | Target |
|---|---|
| text | 7:1 |
| text-muted, accents, warning, danger | 4.6:1 |
| on-accent / accent | 4.5:1 |

Every fix is listed in `contrastFixes` and printed in the console. Mention it to the user: "your brand blue #0071e3 became #006cd9 on light surfaces to reach 4.5:1".

## Layout feel → layout tokens

The page's proportions are borrowed and clamped to the 1920×1080 slide scale:

| Measured on the page | Token(s) | Rule |
|---|---|---|
| Card / button radius (median) | `--radius`, `--radius-sm` | 0–40px / 0–24px |
| Hero ÷ body size ratio | `--fs-hero` | ratio × 30px × 0.9, clamped 96–144 |
| h2 ÷ body size ratio | `--fs-title` | ratio × 30px × 0.75, clamped 52–72 |
| Hero / h2 weight | `--hero-weight`, `--title-weight` | rounded to 50, 500–800 |
| Hero letter-spacing | `--hero-tracking`, `--title-tracking` | em, −0.05…0.02 |
| Shadows none / soft / heavy | `--shadow-card`, `--shadow-elev` | flat, soft or default |
| Transition durations ≤0.25s / ≥0.6s | `--motion-scale` | 0.7 calm / 1 / 1.2 expressive (Appear reads it) |
| Section padding ≥80px / ≤32px | `--pad-x`, `--pad-top` | airy 144/112, dense 96/80 |

The minimums still win: text never goes below 18px, and the 40-word and 5-bullet limits still apply. A restrained brand (Apple-like) comes out as weight 600, near-zero tracking, flat cards and lots of whitespace. Lean into that with fewer cards per slide.

## Fonts: swap proprietary for free

Fonts that the site licenses (SF Pro, Söhne, Circular and the like) are never downloaded or embedded. The script maps them:

| Source family | Use | Bundled? | Notes |
|---|---|---|---|
| SF Pro Display / Text, -apple-system, system-ui | Inter Variable | yes | closest open neo-grotesk |
| Helvetica Neue, Helvetica, Arial, Neue Haas | Inter Variable | yes | |
| Segoe UI | Inter Variable | yes | |
| Söhne, GT America, Founders Grotesk, Aktiv Grotesk, Untitled Sans | Inter Variable | yes | |
| Circular, GT Walsheim, Avenir, Futura, Gotham, Proxima Nova, Graphik | Space Grotesk Variable | yes | or install Manrope or Figtree for a softer geometric |
| SF Mono, Menlo, Consolas, Operator Mono, Fira Code | JetBrains Mono Variable | yes | |
| Georgia, Times, Tiempos, Freight, Garamond, New York, Playfair, Lora | Source Serif 4 Variable | no: `npm i @fontsource-variable/source-serif-4` | |
| Free families (Roboto, Open Sans, Manrope, DM Sans, IBM Plex Sans, Poppins, Montserrat, Figtree) | same family via Fontsource | no: install the printed pkg | |

If you install a font, import it in `src/main.tsx` and re-run review, because metrics change.

## Licensing rules

- **Third-party sites:** borrow style only. No logos, wordmarks, product photos, illustrations, icon sets or font files. Don't screenshot the site onto a slide unless the user owns it or it is clearly fair-use commentary that they asked for, and if so cite it.
- **Captures** in `style-import/captures/` are working notes. They are gitignored, and `new-deck` skips them.
- **User images and SVGs:** copy them into `public/media/` only after the user confirms they own the assets or have a license. Record it in the slide notes, for example "logo supplied by user".
- **Canva:** elements, photos and templates from Canva stay under Canva's Content License. Using them outside Canva, in a web deck or PDF, may not be allowed, and logos or trademarks built from Canva elements are restricted. **Ask the user to confirm** that they have the rights (for example, an original upload or a Pro license that covers the use) before importing. If unsure, use the palette only (`style:svg --no-copy`).
- **Fonts:** only open-licensed fonts (OFL/Apache) through Fontsource.

## Troubleshooting

- **bg came out as a photo color:** re-run with `--mood light|dark`, or hand-set `--bg` in `brand.css`. Cookie banners and full-bleed hero video can skew the CSS walk, so check `captures/section-0.png`.
- **Accents look generic** (hue-rotated): the source had only one brand color. That is fine. Optionally set `--accent-2` to a tint of accent, then re-run `check:tokens`.
- **The site blocks headless browsers:** pass the user's own screenshot to `style:images` instead.
- **`check:tokens` fails after a hand edit:** use 6-digit hex values (the checker does not read `rgb()` or 3-digit hex) and re-run.
