import type { SourceRef } from "../deck/types";

/** Single bibliography for the deck. Every figure, quote or factual claim on a slide
 *  cites one of these. Add the URL you actually opened, not a guess. */
export const S = {
  wcag: { id: "wcag", label: "W3C, Understanding WCAG 2.2 SC 1.4.3 Contrast (Minimum)", url: "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html" },
  slidevExport: { id: "slidevExport", label: "Slidev docs, Exporting", url: "https://sli.dev/guide/exporting" },
  slidevAnim: { id: "slidevAnim", label: "Slidev docs, Animation", url: "https://sli.dev/guide/animations" },
  reveal: { id: "reveal", label: "reveal.js docs, PDF Export & Auto-Animate", url: "https://revealjs.com/pdf-export/" },
  spectacle: { id: "spectacle", label: "Spectacle docs, Introduction", url: "https://nearform.com/open-source/spectacle/docs/" },
  spectacleApi: { id: "spectacleApi", label: "Spectacle docs, API Reference", url: "https://nearform.com/open-source/spectacle/docs/api-reference/" },
  motionA11y: { id: "motionA11y", label: "Motion docs, React accessibility", url: "https://motion.dev/docs/react-accessibility" },
  playwright: { id: "playwright", label: "Playwright docs, Screenshots", url: "https://playwright.dev/docs/screenshots" },
  piSkills: { id: "piSkills", label: "pi-mono, coding-agent docs/skills.md", url: "https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/skills.md" },
  verifyRun: { id: "verifyRun", label: "Measured with npm run review + export:pdf on the build box, 4 Nov 2026" },
} satisfies Record<string, SourceRef>;

export const allSources: SourceRef[] = Object.values(S);
