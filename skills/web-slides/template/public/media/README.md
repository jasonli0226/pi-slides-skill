# Deck media (agent + human)

Put **user-provided** images, logos, screenshots and custom icons here.

- Path in slides: `/media/<kebab-name>.<ext>` (Vite serves `public/` at `/`).
- Prefer SVG/PNG/WebP/JPEG. Keep originals; do not invent logos or stock photos.
- Name files: `logo-acme.svg`, `screenshot-dashboard-q3.png`, `photo-office.webp`.
- Mark every body use with `<Figure … cite="…" />` or `illustrative` — see `references/media-guide.md`.
- **Title hero photos:** pass as `SlideFrame backdrop={{ src: "/media/…", alt: "…" }}` with `scrim="light"` (soft left white band). Only commit rights-cleared assets.
- Synthetic placeholders shipped with the template (not real photography):
  - `title-hero-photo-placeholder.jpg` — daylight abstract plate for the title recipe
  - `title-hero-plate.svg` — vector fallback when no photo
  - `illustrative-mesh.svg` — media-figure demo only
