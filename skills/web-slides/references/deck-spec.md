# Deck design spec (editable middle layer)

The design spec is the **approval artifact** between raw content and React slides. The user (or agent) edits it; the agent waits for approval before generating TSX; regenerating must not wipe hand-polished slides.

Canonical file in a deck project: **`content/deck.spec.yaml`** (YAML). Schema below. Optional light companion: `content/deck.outline.md` (titles/bullets only) for `npm run live` — keep or sync from the spec with `npm run spec -- --sync-outline`.

Full details for layout recipes: `layout-guide.md`. Slide types and component props: `slide-catalog.md`. Diagrams: `diagram-guide.md`. Charts: `chart-guide.md`. Media: `media-guide.md`.

## Flow the agent must follow

1. User provides raw content (markdown, notes, docs, images) **without** layout info.
2. Agent writes a rich **`content/deck.spec.yaml`** the user can edit: slide order/number, takeaway title, slide type, layout recipe, components, text blocks, media paths, chart data, sources, speaker notes.
3. User edits the file to change design or add content.
4. **Approval gate:** set `approved: true` (and optionally `approved_at`) **only after the user explicitly approves** that file. Do not generate production slides until then (stubs for preview are OK if the user asked for a live preview).
5. If a **style-library** pack was applied, keep `content/style-pack.json` (written by `style-lib apply`). Running `npm run spec` overlays pack theme + pattern defaults onto matching slides (title-hero → left scrim + backdrop stubs; KPI / timeline layouts). The overlay only fills fields the YAML leaves blank: an explicit `theme` or per-slide `layout` in `deck.spec.yaml` always wins. Prefer those pack layouts over inventing new ones.
6. Agent runs `npm run spec` then builds React from the approved spec. Use **`npm run live`** / **`npm run dev`** for polish. Spec stays editable; regenerating must follow the **promote / merge** rules below.

## Schema

### Deck (document root)

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | Deck title (may match the title-slide takeaway or a short name) |
| `theme` | `midnight` \| `aurora` \| `paper` \| `tech-dark` \| `bento-minimal` \| `navy-pitch` \| `brand` | yes | |
| `style_pack` | string | optional | Id of an applied `style-library` pack (`content/style-pack.json`). Set by `style-lib apply`. |
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
| `layout` | string | recommended | Recipe from `layout-guide.md`: `layout-stack`, `layout-kpi`, `layout-compare`, `layout-media`, `layout-hero`, `layout-hero-flip`, `layout-bento`, `layout-bento-4`, `layout-section`, `layout-timeline-strip`, or `grid-2` / `grid-3` / `grid-4` / `row`. Pack apply may set this (e.g. KPI → `layout-kpi`, timeline → `layout-timeline-strip`). |
| `pattern` | string | optional | Style-library pattern id (`title-hero`, `kpi`, `timeline`, …). Stub generator honors `title-hero`. |
| `scrim` | `light` \| `dark` \| `auto` | optional | Title-hero scrim; set by pack apply |
| `hero` | boolean | optional | Title-hero left layout (`SlideFrame` `hero`) |
| `heroLabel` | string | optional | Small bottom-left label on title hero |
| `backdrop` | object | optional | `{ src, alt? }` or `{ src, decorative: true }` full-bleed title photo |
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
| `chart` | object | optional | Shortcut for one BarChart: `{ unit?, highlight?, data: [{label, value}] }`. For any other chart, add an `EChart` entry to `components`. |
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
  - EChart:                 # lines, stacks, distributions, scatter, sankey, heatmap — see chart-guide.md
      cite: pilotReport       # or illustrative: true
      highlight: Pilot team   # series name the title talks about
      label: Median triage minutes per week, pilot vs other teams
      option:                 # plain ECharts option; no colors (theme tokens apply)
        xAxis: { type: category, data: [W1, W2, W3, W4] }
        yAxis: { type: value, min: 0 }
        series:
          - { name: Pilot team, type: line, data: [42, 35, 27, 22] }
          - { name: Other teams, type: line, data: [41, 40, 42, 39] }
  - Mermaid:
      chart: |
        flowchart LR
          A[Agent] --> B[Spec]
  - LayeredArchitecture:
      illustrative: true          # or cite: repoMain plus per-node evidence
      stepwise: path              # false | reveal | path
      primary_path: [spec, slides]
      caption: illustrative stack
      layers:
        - id: author
          label: Author
          items:
            - { id: spec, label: Design spec, highlight: true }
            - { id: slides, label: React slides }
  - FlowSteps:
      illustrative: true
      steps:
        - { id: research, title: Research, body: Sources first }
  - Sequence:
      illustrative: true
      stepwise: path
      primary_path: [0, 1]
      actors: [{ id: u, label: User }, { id: a, label: Agent }]
      messages:
        - { from: u, to: a, label: raw notes }
        - { from: a, to: u, label: draft spec, dashed: true }
  - C4Container:
      level: context              # context | container — required
      stepwise: path
      primary_path: [user, platform, docs]
      illustrative: true          # official examples stay illustrative; do not invent file:line
      caption: Chat ask across the platform
      nodes:
        - id: user
          label: Analyst
          kind: person
          description: Asks in natural language
          row: 2
          col: 1
        - id: platform
          label: AI Platform
          kind: system
          highlight: true
          row: 2
          col: 2
        - id: docs
          label: Corp docs
          kind: external
          row: 3
          col: 1
      relations:
        - { from: user, to: platform, label: Asks / reviews }
        - { from: platform, to: docs, label: Retrieves docs }
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

`npm run spec` also warns when an `EChart` entry breaks `chart-guide.md` (no `cite` / `illustrative` or `label`, pie or 3D, more than 5 series, several series without `highlight`, more than 12 bars, a bar axis not starting at zero, two value axes). EChart / BarChart / Figure / Code / Timeline stubs still render as placeholder cards; build the real component when you promote the slide.

### Diagram IR (inside `components[]`)

Do not invent a second spec file. Nodes, labeled unidirectional edges (or the component's existing equivalent), `primary_path`, and per-node `evidence` live on the existing single-key maps. A slide-level `mermaid:` string may remain as a shortcut for small illustrative flows; when a `Mermaid` component and `mermaid:` both exist, they must match.

Evidence pins reference a bibliography id already listed in the slide `sources` plus a file range:

```yaml
evidence:
  - { cite: repoMain, path: apps/web/src/chat.ts, start: 40, end: 88, commit: 3d8f38e }
```

A repo bibliography entry in `sources.ts` may also carry optional `repo` and `commit`. Per-node pins are not themselves `SourceRef`s. The stage does not show `file:line` labels.

`npm run spec` treats diagram issues as **errors** when they break hard rules, and **warnings** at the soft caps in `diagram-guide.md`:

| Severity | Checks |
|---|---|
| Error | Unlabeled edges (empty or a bare "uses"); a bidirectional pair used instead of two labeled directions (C4 / Mermaid / explicit layered edges; sequence request/return is allowed); C4 `level` missing or mixed (e.g. container boxes on a context figure); `primary_path` id that does not exist, or (for C4 / Sequence) does not follow declared relations / messages; a non-illustrative architecture diagram whose nodes lack `evidence` with `path` + `start`; evidence / `cite` ids missing from the slide `sources` list |
| Warning | Size caps (Mermaid ≤8 nodes; FlowSteps ≤6; LayeredArchitecture 3–6 layers and ≤5 cells/layer; Sequence ≤6 actors and ≤8 messages; C4Container ≤8 boxes on a ≤3×4 grid); a Mermaid-only `chart` with no IR and not `illustrative` when it looks like a real-repo diagram; invented-looking placeholders (`foo.ts`, line 1 on every node); `steps` disagreeing with the path length or reveal count; `mermaid:` vs `Mermaid.chart` drift |

On a real-repo brief, add nodes/edges IR next to a Mermaid `chart:` or mark the figure `illustrative`. Official template architecture slides stay illustrative — do not invent fake file:line evidence for them.

Stubs for `Mermaid`, `LayeredArchitecture`, `FlowSteps`, `Sequence`, and `C4Container` emit the **real** component from the validated IR (lucide `icon` names come from a small allow-list, or are omitted). Stubs remain `status: stub` and are not ship quality, but the preview shows the actual topology, not a "replace this stub" card. `status: locked` files are still never overwritten.

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
