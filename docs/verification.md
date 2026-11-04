# Verification log

Run on the build box on 4 Nov 2026 (Asia/Tokyo): Node v24.22.1, npm 11.21.1, Playwright Chromium, Linux, headless.

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` (TypeScript 7.0.2) | pass |
| Token contrast (3 themes × 16 pairs) | `npm run check:tokens` | all pass WCAG AA |
| Build | `npm run build` (Vite 8.3.5) | built in about 1.7 s |
| Review | `npm run review` | 12 slides, 0 errors, 0 warnings; review step about 8.4 s |
| PDF (vector) | `npm run export:pdf` | 12 pages for 12 slides, about 2.2 MB, about 4 s |
| PDF (raster) | `npm run export:pdf -- --raster` | 12 pages for 12 slides, about 10.8 s |
| All of the above | `npm run verify` | exit 0 |
| Present mode | Playwright: 4× ArrowRight, then N, O, End | hash `#/2/3`, then `#/12`; notes and overview render; no page errors |
| New deck flow | `scripts/new-deck.mjs /tmp/testdeck --title "…" --theme paper`, then `npm run verify` | 1 slide, 0 errors, PDF OK |
| Lint catches bad slides | Deliberately broken slide (one-word title, uncited Stat, unknown cite, TODO, emoji, off-stage box, 1.6:1 contrast, 12px text, tiny chart) | all 9 rules fired as errors |
| pi discovery | `loadSkillsFromDir` from `@earendil-works/pi-coding-agent` 1.5.0 | `web-slides` loaded, 0 diagnostics |
| pi install | `pi install /workspace/pi-slides-skill` (isolated HOME) | installed, listed by `pi list` |

The timings on slide 8 of the example deck are these measured values (`src/slides/measured.ts`). They vary with hardware.
