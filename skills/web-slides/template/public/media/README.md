# Deck media (agent + human)

Put **user-provided** images, logos, screenshots and custom icons here.

- Path in slides: `/media/<kebab-name>.<ext>` (Vite serves `public/` at `/`).
- Prefer SVG/PNG/WebP. Keep originals; do not invent logos or stock photos.
- Name files: `logo-acme.svg`, `screenshot-dashboard-q3.png`, `photo-office.webp`.
- Mark every use with `<Figure … cite="…" />` or `illustrative` — see `references/media-guide.md`.
- Title hero plates: same folder; pass as `SlideFrame backdrop={{ src: "/media/…", decorative: true }}` (full-bleed + left scrim).
- Example decorative plate: `title-hero-plate.svg` (no instructional copy). Keep `illustrative-mesh.svg` for the media-figure demo.
