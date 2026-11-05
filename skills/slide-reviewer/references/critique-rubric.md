# Critique rubric

Use with `review/contact-sheet.png` and each `review/slide-NN.png` open.

## Blockers (must fix before export)

- Box / footer overlap; content off-stage or outside safe margins
- Title not a takeaway sentence (or lint `title-sentence` error)
- Unreadable type (contrast fail, tiny text, light text on light scrim without checking)
- Missing sources on figure slides; leftovers (lorem / TODO)
- Title opener centered on a busy photo without left scrim

## Warnings

- Dense copy (>~40 words on stage)
- Uneven card gaps / heights in a row
- Absolute-spam layout instead of `.layout-*`
- Accent color used on more than one focal
- Spec type/kind mismatch vs approved YAML

## Notes

- Motion / step order (check with `npm run review -- --steps`)
- Illustrative figures not labelled
- Theme feels off-brand vs `style-pack` / brand.css

## Finding template

```markdown
### F-003 — warn — slide 04 (architecture)
- **Issue:** Swimlane labels crowd the right edge.
- **Evidence:** `slide-04.png` — last column text within ~40px of stage edge.
- **Suggestion:** Drop to 4 columns or shorten labels; keep `.layout-*` gutters.
```
