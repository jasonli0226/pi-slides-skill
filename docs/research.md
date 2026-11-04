# Research: which stack for agent-built, "stunning" web slides?

Researched on 4 Nov 2026 (Asia/Tokyo). Versions are from `npm view` on that day. Every claim below links to the page it came from.

## Requirements (from the deck standard)

1. Visual ceiling: fancy transitions, step reveals, animated numbers and charts, and diagrams.
2. Agent-friendly: the stack should be easy for a coding agent to write correctly. Typed components beat free-form markup.
3. Automatable review: deterministic per-slide screenshots and DOM access for lint checks (sources, contrast, overflow, leftovers).
4. Export: a PDF handout and PNGs.
5. Brand-swappable theme tokens and WCAG AA contrast.
6. Runs inside the pi coding agent as an Agent Skill.

## Candidates

| | Slidev | reveal.js | Spectacle | **Custom React + Motion (chosen)** |
|---|---|---|---|---|
| Authoring | Markdown + Vue components | HTML or Markdown sections | React (JSX or Markdown) [4] | Typed React components (TSX) |
| Motion | `v-click`, `v-motion` (@vueuse/motion), slide transitions incl. view transitions, Shiki Magic Move [1] | Auto-Animate, fragments [3] | Deck `transition` prop; Appear/Stepper on react-spring [4][5] | Full Motion API: layout, spring, stagger; reduced motion via `MotionConfig` [6] |
| Code | Shiki, line highlights, Magic Move [1] | highlight.js plugin [3] | `CodePane` with `highlightRanges` (Prism) [5] | Shiki with per-step line focus |
| Export | PDF/PPTX/PNG via Playwright; plain PPTX is images, `pptx-editable` rebuilds shapes but SVG/Mermaid stay pictures [2] | `?print-pdf`, documented for Chrome/Chromium; decktape alternative [3] | Print/export mode with `pageSize`/`printScale`, full custom page size only in Chrome [5] | Playwright `page.pdf` (vector) or raster PDF from screenshots [7] |
| Fit with "React" brief | No (Vue) | Framework-agnostic | Yes | Yes |
| Lock-in / freedom | Opinionated layouts and themes | Opinionated DOM structure | Opinionated Deck/Slide API | Plain React, any npm library |

## Decision

**We chose a custom React 19 + Vite + Motion scaffold.** The user's brief was a React web deck. A plain React stage gives agents unlimited layout and animation freedom with libraries they already know (Motion, Mermaid, Shiki, lucide). It also lets us build URL modes (`?static`, `?print`) that make Playwright screenshots, linting and PDF export deterministic. All of the guardrails live in the review script rather than the framework.

**Slidev is the runner-up.** It has the strongest built-in features: PPTX export, presenter mode and Magic Move [1][2]. Choose it if Markdown authoring or PPTX output matters more than React. The skill's workflow, design guide and checklist carry over to it unchanged.

### Trade-offs we accept

- The presenter view is a simple notes overlay (N) rather than a separate window. Slidev and Spectacle ship richer presenter modes.
- There is no editable PPTX. PDF and PNG are the hand-off formats. (Slidev's editable PPTX also keeps diagrams as pictures [2].)
- We maintain about 1,000 lines of deck engine ourselves.

## Accessibility and standard references

- WCAG 2.2 SC 1.4.3 requires a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text (at least 18pt, or 14pt bold) [8]. The contrast ratio is (L1 + 0.05) / (L2 + 0.05), using sRGB relative luminance [8]. Non-text graphics are covered by SC 1.4.11.
- Motion's docs warn that "Animations can have serious usability implications, even inducing motion sickness in some people." With `reducedMotion="user"`, transform and layout animations are disabled for users who ask for reduced motion, while opacity is kept [6].

## How pi loads the skill

From `packages/coding-agent/docs/skills.md` and `docs/packages.md` in badlogic/pi-mono, at commit `e885255` (4 Nov 2026) [9][10]:

- pi implements the Agent Skills spec. A skill is a directory containing `SKILL.md` with `name` and `description` frontmatter. Names use lowercase letters, digits and hyphens, up to 64 characters; descriptions can be up to 1024 characters.
- At startup only the name, description and location go into the system prompt. The body is read on demand, and `/skill:name` forces it.
- Skills are discovered in `~/.pi/agent/skills/`, `.pi/skills/`, `~/.agents/skills/` and `.agents/skills/`, plus installed packages.
- `pi install git:github.com/<owner>/<repo>` installs a package. A `package.json` with `"pi": { "skills": [...] }` (or a conventional `skills/` directory) exposes the skills.

## Sources

1. Slidev docs, Animation: https://sli.dev/guide/animations
2. Slidev docs, Exporting: https://sli.dev/guide/exporting
3. reveal.js docs, PDF Export: https://revealjs.com/pdf-export/ Auto-Animate: https://revealjs.com/auto-animate/ and Code: https://revealjs.com/code/
4. Spectacle docs, Introduction: https://nearform.com/open-source/spectacle/docs/
5. Spectacle docs, API Reference: https://nearform.com/open-source/spectacle/docs/api-reference/
6. Motion docs, React accessibility: https://motion.dev/docs/react-accessibility
7. Playwright docs, Screenshots: https://playwright.dev/docs/screenshots
8. W3C, Understanding WCAG 2.2 SC 1.4.3 Contrast (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
9. pi-mono, coding-agent docs/skills.md: https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/skills.md
10. pi-mono, coding-agent docs/packages.md: https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/packages.md

npm versions checked on 4 Nov 2026: spectacle 10.2.4, @slidev/cli 53.0.0, reveal.js 6.0.2, motion 14.9.1, mermaid 12.3.0, shiki 4.6.0, playwright 1.64.1, react 19.3.1, vite 8.3.5.
