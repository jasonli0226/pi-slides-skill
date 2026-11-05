# Deck design spec (editable middle layer)

The design spec is the **approval artifact** between raw content and React slides. The user (or agent) edits it; the agent waits for approval before generating TSX; regenerating must not wipe hand-polished slides.

Canonical file in a deck project: **`content/deck.spec.yaml`** (YAML). Schema below. Optional light companion: `content/deck.outline.md` (titles/bullets only) for `npm run live` — keep or sync from the spec with `npm run spec -- --sync-outline`.

Full details for layout recipes: `layout-guide.md`. Slide types and component props: `slide-catalog.md`. Diagrams: `diagram-guide.md`. Media: `media-guide.md`.

## Flow the agent must follow

1. User provides raw content (markdown, notes, docs, images) **without** layout info.
2. Agent writes a rich **`content/deck.spec.yaml`** the user can edit: slide order/number, takeaway title, slide type, layout recipe, components, text blocks, media paths, chart data, sources, speaker notes.
3. User edits the file to change design or add content.
4. **Approval gate:** set `approved: true` (and optionally `approved_at`) **only after the user explicitly approves** that file. Do not generate production slides until then (stubs for preview are OK if the user asked for a live preview).
5. Agent runs `npm run spec` then builds React from the approved spec. Use **`npm run live`** / **`npm run dev`** for polish. Spec stays editable; regenerating must follow the **promote / merge** rules below.

## Schema

### Deck (document root)

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | Deck title (may match the title-slide takeaway or a short name) |
| `theme` | `midnight` \| `aurora` \| `paper` \| `brand` | yes | |
| `audience` | string | recommended | Who watches |
| `goal` | string | recommended | Decision or ask |
| `minutes` | number | optional | Talk length |
| `approved` | boolean | yes | **Approval gate.** Default `false`. User must approve before building for ship. |
| `approved_at` | string | optional | ISO date when approved (Asia/Hong_Kong local date is fine) |
| `version` | number | optional | Bump when structure changes after approval |
| `notes` | string | optional | Deck-level working notes |
| `slides` | array | yes | Ordered list of slide objects |

### Slide object

| Field | Type | Required | Notes |
|---|---|---|---|
| `n` | number | yes | 1-based order; must match array order |
| `id` | string | yes | kebab-case, unique; used as React slide `id` |
| `type` | string | yes | One of the catalog kinds: `title`, `agenda`, `big-number`, `comparison`, `architecture`, `timeline`, `code`, `results`, `quote`, `governance`, `lessons`, `closing`, `section`, `content` |
| `title` | string | yes | **Full-sentence takeaway** (5+ words, ends with punctuation) |
| `layout` | string | recommended | Recipe from `layout-guide.md`: `layout-stack`, `layout-kpi`, `layout-compare`, `layout-media`, `layout-hero`, `layout-hero-flip`, `layout-bento`, `layout-bento-4`, `layout-section`, `layout-timeline-strip`, or `grid-2` / `grid-3` / `grid-4` / `row` |
| `status` | `stub` \| `locked` | yes | See promote / merge |
| `kicker` | string | optional | Small label above the title |
| `subtitle` | string | optional | Title slide / closing |
| `background` | `grid` \| `aurora` \| `spotlight` \| `plain` | optional | SlideFrame background |
| `steps` | number | optional | Click-step count |
| `sources` | string[] | optional | Bibliography ids from `sources.ts` (empty / omit on title if none) |
| `notes` | string | optional | Speaker notes |
| `body` | string[] | optional | Short text blocks / bullets (≤5; ≤~40 words total on stage) |
| `media` | array | optional | `{ path, alt, cite?, illustrative?, decorative?, maxHeight? }` — paths under `public/` as URL paths e.g. `/media/logo.png` |
| `components` | array | optional | Declared visuals (see below) |
| `chart` | object | optional | Shortcut for one BarChart: `{ unit?, highlight?, data: [{label, value}] }` |
| `code` | object | optional | `{ lang, filename?, focus?: string[], source: string }` |
| `mermaid` | string | optional | Mermaid chart text (≤8 nodes) |
| `timeline` | array | optional | `{ when, title, body? }[]` |
| `quote` | object | optional | `{ text, by, role?, cite }` |

### `components[]` entries

Each entry is a single-key map naming a catalog / diagram component:

```yaml
components:
  - Stat:
      value: 48
      suffix: "%"
      label: median triage drop
      cite: pilotReport
      size: xl
  - BarChart:
      cite: pilotReport
      highlight: 1
      unit: min
      data:
        - { label: Before, value: 42 }
        - { label: After, value: 22 }
  - Mermaid:
      chart: |
        flowchart LR
          A[Agent] --> B[Spec]
  - LayeredArchitecture:
      # shape per slide-catalog; stub generator may render a placeholder Card
      caption: illustrative stack
  - FlowSteps:
      steps:
        - { title: Research, body: Sources first }
  - Sequence:
      actors: [{ id: u, label: User }, { id: a, label: Agent }]
      messages: [{ from: u, to: a, label: raw notes }]
  - C4Container:
      nodes: []
  - Figure:
      src: /media/pilot-dashboard.png
      alt: Pilot ops dashboard after rollout
      cite: pilotReport
  - Code:
      lang: tsx
      filename: index.ts
      focus: ["3-5"]
      source: |
        export const deck = defineDeck({ ... });
  - Timeline:
      items:
        - { when: "W1", title: Spec approved }
  - Pill:
      text: React 19 + Motion
      tone: accent
  - Card:
      icon: Shield
      title: Human gate
      highlight: true
  - IconList:
      items:
        - { icon: Check, text: Cite every figure }
  - Quote:
      text: "…"
      by: Name
      role: Role
      cite: sourceId
```

Unknown component names are validation **warnings** (forward-compatible). Missing `type` / `id` / `title` / `status` / `n` are **errors**.

## Promote / merge (do not wipe polish)

| `status` | Meaning | `npm run spec` behavior |
|---|---|---|
| `stub` | Not yet hand-polished | Emit into `src/slides/generated/from-spec.tsx` as a stub (layout class + placeholder components). Safe to regenerate. |
| `locked` | Hand-polished `src/slides/NN-<id>.tsx` is source of truth | **Do not** emit a stub for this id. Do not overwrite the TSX file. |

**Promote a stub → locked**

1. Copy the stub into `src/slides/NN-<id>.tsx`, refine layout/motion/diagrams.
2. Register that module in `src/slides/index.ts` (named import).
3. Set `status: locked` on that slide in `deck.spec.yaml`.
4. Re-run `npm run spec` — the id disappears from `specSlides`.
5. Keep the spec fields (title, type, components, sources) in sync with the TSX; if the user edits a locked slide in the spec, **update the TSX by hand** (or unlock → regenerate → re-polish). Never blindly overwrite locked files.

**Regenerate after user edits the approved spec**

- New / `stub` slides: regenerate stubs, wire via `...specSlides` if used.
- `locked` slides whose title/type/components changed: report them as **manual merge needed**; do not clobber the TSX.
- If the user changed the spec after `approved: true`, either bump `version` and re-confirm approval, or note the delta in the hand-off.

## Commands

```bash
npm run spec                 # validate + write from-spec.tsx + spec-manifest.json
npm run spec -- --check      # validate only (non-zero on errors)
npm run spec -- --watch      # rebuild stubs when the YAML changes
npm run spec -- --sync-outline  # also write a light content/deck.outline.md from titles
npm run live                 # Vite + outline watcher (optional); prefer editing the YAML + npm run spec -- --watch
```

Wire stubs in `src/slides/index.ts` only while iterating:

```ts
import { specSlides } from "./generated/from-spec";
// ...
slides: [ /* locked imports */, ...specSlides ],
```

## Review checklist addition

When `approved: true`, the built deck **must** match the spec:

- Same **slide count** as `slides.length` (unless the user changed the spec after approval — then re-approve or justify).
- Same **ids in order**.
- Same **types** (`SlideFrame kind` / catalog type) for each id.

`npm run review` loads `content/deck.spec.yaml` when present and, if `approved`, emits `spec-mismatch` errors for count / id / type drift. Fix the deck or update+re-approve the spec.

## Relationship to `outline.md` / `deck.outline.md`

| Artifact | Role |
|---|---|
| `content/deck.spec.yaml` | **Primary** design + approval gate |
| `outline.md` (working notes) | Optional one-liner brainstorm before the YAML |
| `content/deck.outline.md` | Optional **light** stub for `npm run live` / `npm run outline` only |

Prefer writing the YAML. If you already have a thin outline, expand it into the YAML before asking for approval.
