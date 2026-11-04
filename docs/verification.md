# Verification log

Run on the build box on 4 Nov 2026 (Asia/Hong_Kong): Node v24.22.1, npm 11.21.1, Playwright Chromium, Linux, headless.

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` (TypeScript 7.0.2) | pass |
| Token contrast (3 themes × 16 pairs) | `npm run check:tokens` | all pass WCAG AA |
| Build | `npm run build` (Vite 8.3.5) | built in about 1.4 s |
| Review | `npm run review` | **15 slides**, 0 errors, 0 warnings; review step about 9.5 s |
| PDF (vector) | `npm run export:pdf` | 15 pages for 15 slides, about 3.4 s |
| All of the above | `npm run verify` | exit 0 |
| Diagram examples | slides 06–08 (`layered-platform`, `c4-context`, `chat-sequence`) | footer-overlap / clipped / off-stage clean |
| Present mode | Playwright: ArrowRight, N, O, End | notes and overview render; no page errors |
| New deck flow | `scripts/new-deck.mjs` then `npm run verify` | 1 slide, 0 errors, PDF OK |
| Lint catches bad slides | Deliberately broken slide | all rules fired as errors |
| pi discovery | `loadSkillsFromDir` from `@earendil-works/pi-coding-agent` | `web-slides` loaded |
| pi install | `pi install` (isolated HOME) | installed, listed by `pi list` |

Example screenshots for the diagram work: `examples/screenshots/slide-06-layered-platform.png`, `slide-07-c4-context.png`, `slide-08-chat-sequence.png`.

### 4 Nov 2026 (evening, Asia/Hong_Kong) — C4 polish + live mode

- Refined `C4Container` (orthogonal elbows, kind hierarchy, fade Appear, overlay legend).
- Added `npm run live` / `npm run outline` + `content/deck.outline.md`.
- `npm run verify`: 15 slides, 0 errors, PDF OK.
