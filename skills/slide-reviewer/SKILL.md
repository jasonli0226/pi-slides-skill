---
name: slide-reviewer
description: Critique web-slides deck screenshots after npm run review — overlap, density, weak titles, safe margins, contrast feel — and write findings to review/critique.md. Does not auto-rewrite slides unless the user asks. Use after screenshots exist and before PDF export, or when the user asks for a visual review / design critique of the deck.
license: MIT
compatibility: Needs a deck that already ran npm run review (review/slide-*.png + report.md). Companion to web-slides.
metadata:
  version: "0.1.0"
  companion: "web-slides"
---

# Slide reviewer

A **critique phase**, not a silent fixer. After `npm run review` produces screenshots, study them (and the lint report), write structured findings, and **stop**. Only rewrite slides when the user asks you to address specific findings.

## When to use

- Immediately after web-slides workflow **Screenshots and review**, before **Export**.
- When the user asks “does this look good?”, “critique the deck”, or “reviewer pass”.

## Commands

From a deck directory (script ships in the template):

```bash
npm run review                 # screenshots + lint → review/
npm run critique               # aggregate lint + scaffold critique.md
# then the agent opens PNGs and fills visual findings
```

From this repo without a deck script path:

```bash
node skills/slide-reviewer/scripts/critique.mjs --deck <deck-dir>
```

## Agent workflow

1. Ensure `review/report.md` and `review/slide-*.png` (and `contact-sheet.png`) exist. If not, run `npm run review` first.
2. Run `npm run critique` (or the script above). It writes / refreshes `review/critique.md` with:
   - Automated findings from `report.md` (overlap, safe-margin, tiny-text, contrast, title-sentence, …)
   - Empty **Visual findings** sections for you to complete
3. **Open the contact sheet and every slide PNG.** Use the rubric in `references/critique-rubric.md`.
4. Append or edit findings under Visual. Each finding: `severity` (blocker / warn / note), `slide` id or number, `issue`, `evidence` (what you saw), `suggestion` (optional — do not implement yet).
5. Show the critique to the user. **Do not auto-rewrite** TSX/YAML unless they ask to fix items (by severity or by id).
6. If they ask to fix: address blockers first, re-run `npm run review` + `npm run critique`, repeat until they accept.

## What to critique

| Area | Look for |
|---|---|
| Overlap | Text through cards, peer boxes colliding, footer collisions |
| Density | >~40 words, cramped KPI rows, no whitespace |
| Titles | Not a full-sentence takeaway; weak verbs; section labels as titles |
| Safe margins | Content in padding band; edge-hugging type |
| Title hero | Centered headline over busy photo; missing left scrim; low contrast on scrim |
| Hierarchy | Competing focals; accent used everywhere |
| Spec drift | Approved `deck.spec.yaml` types/order vs what screenshots show |

Automated lint already covers many of these as errors/warnings in `report.md` — the critique **aggregates** them and adds judgment the lint cannot make.

## Outputs

| File | Role |
|---|---|
| `review/report.md` | Machine lint from `npm run review` |
| `review/critique.md` | Human+agent critique (this skill) |
| `review/contact-sheet.png` | First look |

## Non-goals

- No automatic TSX edits.
- No PDF export (that stays web-slides step after critique acceptance).
- No inventing facts or changing sourced figures during critique.
