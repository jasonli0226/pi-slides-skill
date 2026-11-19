# Plan: source-backed diagrams, a validated diagram IR, and a path walk

**Status:** proposed plan only — not implemented. This document is the approval artifact for a later implementation PR. Package version stays **0.10.0**; this work does not bump the package, publish to npm, or change visibility.

Drafted 19 Nov 2026 (Asia/Hong_Kong), after Jason reviewed [Archify](https://github.com/tt-a1i/archify) (Apache-2.0, current stable **v3.2.0**, [release](https://github.com/tt-a1i/archify/releases/tag/v3.2.0)) against pi-slides-skill and approved the scope below. Archify is cited as **inspiration only**. We will not copy its source, schemas, or documentation verbatim, vendor it, or embed its HTML viewer.

Related skill docs: [diagram-guide.md](../skills/web-slides/references/diagram-guide.md), [deck-spec.md](../skills/web-slides/references/deck-spec.md), [workflow.md](../skills/web-slides/references/workflow.md), [SKILL.md](../skills/web-slides/SKILL.md), [slide-catalog.md](../skills/web-slides/references/slide-catalog.md).

## Why

### Gap versus today

pi-slides-skill already has a strong diagram path for a 1920×1080 React 19 + Vite + Motion deck: Mermaid for ≤8-node flows, and React + CSS components (`LayeredArchitecture`, `FlowSteps`, `Sequence`, `C4Container`, `DiagramLegend`) for denser stacks, C4 views, and sequences. The design spec (`content/deck.spec.yaml`) is the approval gate. `npm run spec` validates theme, types, ids, titles, and known component names, and it already runs structured checks on `EChart` entries. Review lint requires `cite` or `illustrative` on Stat, BarChart, EChart, Quote, and Figure, and rejects diagram text under 18px (including SVG).

Architecture diagrams are behind that standard:

- Example architecture slides (`13-layered-platform.tsx`, `14-c4-context.tsx`, `15-chat-sequence.tsx`) are honestly marked *illustrative* in the kicker and notes, and they cite methodology sources (C4, Microsoft Learn, Software Architecture Guild) rather than files in a real codebase. That is correct for the template. When a brief is “explain this repo,” the skill does not yet require components or edges to be pinned to `path` + line (and commit when practical) the way numbers and quotes already require a source.
- `SourceRef` in `src/deck/types.ts` is `{ id, label, url? }`. There is no convention for a file, line range, or commit.
- The spec can already hold a raw `mermaid:` string and loosely shaped component maps (`LayeredArchitecture.layers`, `Sequence.actors` / `messages`, `C4Container.nodes`). `npm run spec` does **not** validate those shapes: unlabeled edges, mixed C4 levels, over-size graphs, or missing evidence are not errors. Stubs for every diagram component are placeholder cards (“Replace this stub with the real component…”), not a rendering of the declared nodes.
- `LayeredArchitecture`, `FlowSteps`, and `Sequence` already support `stepwise` via `Appear` (reveal lanes, steps, or messages one click at a time). `C4Container` only fades nodes in on enter; it has no click-step path walk. None of the components can highlight a declared primary path while dimming the rest. The diagram guide already says “walk one concrete request,” but that advice is not a first-class, validatable field.

### What Archify taught us (concepts only)

Archify v3.2.0 is an agent skill that turns a description or a repository into a standalone interactive HTML diagram (and, in 3.2, a one-page explainer). Three ideas transfer well if we rewrite them in our voice and map them onto the existing workflow:

1. **Source-backed architecture from a real repo.** When the agent reads a codebase, nodes can carry evidence pinned to a file and line range, and to a commit when practical — the same honesty we already demand of Stats and quotes. Topology without evidence must be marked illustrative.
2. **A structured, validatable diagram** — nodes, labeled edges, and a primary path — not just a `mermaid:` string or an untyped component blob. Validation happens before TSX is treated as shippable.
3. **Walk one request / highlight one path** so a presenter can trace a scenario. In our deck that belongs on existing `Appear` / `Stagger` / `stepwise` machinery, as a presentation walk, not as a click-to-zoom canvas.

Useful surrounding practice, already close to our guides: prefer unidirectional, specifically labelled relationships; keep exports free of viewer chrome; static and print must still read when motion is off.

### What we will not adopt

- Archify’s interactive HTML viewer, zoom/pan, click-to-open source cards, toolbars, or hash-driven focus chrome on the meeting stage.
- Replacing the deck with Archify explainers or dashboards. Our product remains a 1920×1080 slide deck with PDF/PNG hand-off. Data charts stay on `BarChart` / `EChart` (`chart-guide.md`).
- Vendoring Archify, embedding its HTML inside a slide, or adding React Flow, AntV X6, or another heavy graph library.
- Archify-style tiny mono source labels on the stage. Diagram text stays ≥18px; evidence belongs in the spec, `sources.ts`, captions, speaker notes, and footer citations — not in 12px badges on cells.
- A full type catalog in v1 (class, waterfall, tree, dataflow as separate products). State/lifecycle and a simple ERD are optional follow-ons only, and still split across slides if dense.
- Mermaid beautifiers that only restyle a string without improving information architecture.
- Motion that carries meaning which disappears in `?static` / `?print` / PDF.
- Unbounded icon marketplaces, or inferring vendor logos from labels (existing media and icon rules stay).

## Product constraints (unchanged)

- The skill remains a 1920×1080 React 19 + Vite + Motion web slide deck skill: brief → research → `content/deck.spec.yaml` → user approval → build → screenshots/lint → PDF.
- Pack content from the title downward with tight vertical spacing; diagrams fill remaining body height (`layout-guide.md`).
- Static and print/PDF already set `useIsStatic()` so `Appear` shows its final state and motion duration is 0. Path-walk work must keep that contract: the complete diagram is readable with motion off. A soft accent on the primary path in the final frame is allowed; hiding nodes until a click is not allowed in print.
- The approval gate (`approved: true` only after the user says yes; `status: locked` files are never overwritten) stays mandatory.
- No `.github/workflows/*` in the implementation PR either.

## Proposed changes (later implementation PR)

Do not implement these in the plan PR. The list is the proposed work, file by file, under `skills/web-slides/` unless noted.

### 1. Source-backed architecture diagrams

**`references/diagram-guide.md`** — Add a principle alongside “Walk a scenario”:

- When the brief is to explain a **real codebase**, every component and edge on an architecture / flow / C4 / sequence diagram is pinned to evidence the agent opened in this session: repository (or source id), file path, start line, optional end line, and commit SHA when practical.
- Evidence is recorded in the diagram IR (below) and in `sources.ts` conventions. The slide footer cites the bibliography ids; the stage does not grow tiny `file:line` labels.
- If a node or edge cannot be evidenced, mark the **diagram** (or that node) `illustrative` and say why in notes. Never invent a path or line range.
- Vendor or customer wall-charts stay under the existing rule: rebuild a simplified generic view and mark it illustrative; never copy proprietary labels, logos, or exact topology.

**`template/src/deck/types.ts` and `template/src/slides/sources.ts`** — Keep `SourceRef` as the bibliography entry (`id`, `label`, `url?`). Extend it *lightly* so a repo source can carry optional `repo` (owner/name or URL) and `commit`. Per-node / per-edge pins do **not** each become a new `SourceRef`; they reference a bibliography id plus `path` / `start` / `end` / optional `commit` override. Document the convention in a short comment on `sources.ts`, same tone as the existing “Add the URL you actually opened, not a guess.”

**`references/review-checklist.md` and `references/workflow.md`** — When the brief is a real repo, research notes record the commit and the file:line excerpts used for the diagram, just as they already record verbatim figures and quotes. The checklist gains a row: architecture figures are cited or illustrative; evidence paths were opened, not guessed.

**`SKILL.md`** — One sentence in the non-negotiable standard / research step: architecture claims about a real codebase follow the same source rule as numbers.

### 2. A validated diagram IR inside `deck.spec.yaml`

Do **not** invent a second parallel spec file. The IR lives under the existing `components[]` single-key maps (and, for the current shortcut, alongside a slide-level `mermaid:` string).

**`references/deck-spec.md`** — Document a shared envelope plus the per-component mapping. Proposed YAML shape (illustrative of the schema, not a copy of any third-party format):

```yaml
components:
  - C4Container:
      level: context          # context | container — one zoom level per slide
      caption: Chat ask across the platform
      cite: repoMain          # bibliography id, or illustrative: true
      stepwise: path          # off | reveal | path  (see path walk)
      primary_path: [user, platform, docs]
      nodes:
        - id: user
          label: Analyst
          kind: person
          description: Asks in natural language
          row: 2
          col: 1
          evidence:
            - { cite: repoMain, path: apps/web/src/chat.ts, start: 40, end: 88, commit: 3d8f38e }
        - id: platform
          label: AI Platform
          kind: system
          description: Answers with grounded tools
          highlight: true
          row: 2
          col: 2
          evidence:
            - { cite: repoMain, path: services/orchestrator/src/index.ts, start: 1, end: 80 }
        - id: docs
          label: Corp docs
          kind: external
          description: Wiki · files
          row: 3
          col: 1
          illustrative: true  # no repo pin; node is explicitly illustrative
      relations:
        - { from: user, to: platform, label: Asks / reviews, evidence: [{ cite: repoMain, path: apps/web/src/chat.ts, start: 90, end: 120 }] }
        - { from: platform, to: docs, label: Retrieves docs }
```

Mapping onto existing components (prefer improving these over replacing them):

| Component | Nodes in the IR | Edges in the IR | Primary path | Notes |
|---|---|---|---|---|
| `C4Container` | existing `nodes` (`id`, `label`, `kind`, `description`, `tech`, grid) | existing `relations` (`from`, `to`, `label`, `dashed?`) | node id list that walks relations | Add `level`, `evidence`, `primary_path`, `stepwise` |
| `LayeredArchitecture` | each cell gets a stable `id`; layers keep `id` / `label` / `tone` | optional explicit edges; default walk is top-down through highlighted or listed cells | cell / layer ids | Keep rails; do not require a hairball of edges |
| `Sequence` | `actors` | `messages` (already labeled, unidirectional, `dashed?`) | message index list or actor id walk | Closest natural “one request” picture |
| `FlowSteps` | each step gets a stable `id` | implicit sequential edges | usually the full strip, or a subset | Keep 3–6 steps |
| `Mermaid` | optional `nodes` / `edges` beside `chart:` | same | optional | If the brief is a real repo and only `chart:` is present, warn and ask for IR **or** `illustrative: true`. Do not try to parse Mermaid into IR in v1 |

A slide-level `mermaid:` string may remain as a shortcut for small illustrative flows. When a `Mermaid` component and `mermaid:` both exist, they must match (already duplicated in the template spec sample — the implementation should warn on drift).

**`template/scripts/spec.mjs`** — Extend `validate()` in the same style as `echartWarnings()`: diagram issues are **errors** when they break hard rules, **warnings** when they are soft caps or missing-but-marked-illustrative. Emit a richer stub (below). Still never overwrite `status: locked` TSX.

**Stub generation.** Today every diagram component becomes a placeholder card. For v1, `renderComponentPlaceholder` should emit the **real** component from the validated IR (lucide `icon` fields may be omitted or mapped from a small allowed-name list). Stubs remain `status: stub` and are not ship quality, but the approval preview should show the actual topology, not a “replace this stub” card. Promote / merge rules are unchanged: polish, motion timing, and typography live in locked TSX; regenerating must not wipe those files.

**`references/slide-catalog.md`** — Update the diagram prop tables to include `evidence`, `primary_path`, `stepwise`, `level` (C4), and the cite / illustrative rule.

### 3. “Walk one request” as a first-class stepwise animation

**`template/src/deck/diagrams.tsx`** (and prop docs in `slide-catalog.md` / `diagram-guide.md`):

- Add a `stepwise` mode for **path highlight**, not only reveal. Suggested values: `false` / `"reveal"` (today’s lane-or-message Appear) / `"path"` (all nodes visible; each click accents the next node and edge on `primary_path` and dims the rest).
- `C4Container` is the main gap: it needs `stepwise` plus edge accent (the SVG already has a highlight marker). `Sequence` and `FlowSteps` already reveal messages or steps; `"path"` should also accent the current hop. `LayeredArchitecture` can accent cells on the path after lanes have appeared, or in `"path"` mode show all lanes and walk the cells.
- Presentation walk only: keyboard / click steps already in the deck engine. **No** interactive chrome, **no** click-to-zoom, **no** pan, **no** node tooltips that are the only place a label lives.
- `?static`, `?print`, and PDF show the **complete final state**. Prefer: every node and label visible, primary path softly accented, no dimmed-to-illegible leftovers. Meaning must not live only in a mid-walk frame.
- Slide `steps` in the spec / `defineSlide` must equal the path length (or reveal count). `npm run spec` should warn when they disagree.

Layout: path accent is a tone / stroke change on existing cells and elbows, not a floating inspector that steals body height. Diagrams still fill the leftover body under the title.

### 4. New diagram types — follow-ons only

v1 does **not** add new components. If a later slice needs them:

- **State / lifecycle** — few states, labeled transitions, still ≥18px, split if dense.
- **Simple ERD** — a handful of entities and relationships, not a full schema dump; split by bounded context if needed.

Class diagrams, waterfall / span charts, trees, and dataflow-as-a-new-product stay off the v1 list. Existing `Timeline`, `FlowSteps`, `Mermaid`, and `EChart` already cover several of those jobs on a slide.

### 5. Optional Archify companion (not a dependency)

**`references/workflow.md`** (a short optional subsection) and a sentence in `SKILL.md` Don’ts / hand-off:

- If the user wants a **leave-behind** the audience can explore after the talk, the agent *may* produce a standalone Archify HTML (user-installed skill, Apache-2.0 terms, not vendored here) and cite it.
- The meeting deck still rebuilds a **frozen** view as our React + CSS diagram, or a `<Figure>` screenshot of that view with `cite` / `illustrative`. Do not nest their viewer in the slide app.
- `npm run build`, `npm run review`, and `npm run export:pdf` must succeed **without** Archify installed. The companion is never required to author or ship a deck.

### Validation / lint additions

`npm run spec` (`template/scripts/spec.mjs`):

- Every edge has a specific verb label (not empty, not a bare “uses”); edges are unidirectional (no bidirectional pair as a substitute for two labeled directions, matching the diagram guide).
- C4: `level` is set; kinds on the slide match that level; do not mix context and code/container concerns on one figure.
- Size caps already in `diagram-guide.md` (errors or strong warnings at the published soft limits): Mermaid ≤8 nodes; FlowSteps ≤6; LayeredArchitecture 3–6 layers and ≤5 cells/layer; Sequence ≤6 actors and ≤8 messages; C4Container ≤8 boxes on a ≤3×4 grid.
- `primary_path` ids exist and, for C4 / Sequence, follow declared edges or messages.
- If the diagram is not `illustrative`, each node has at least one evidence entry with `path` and `start` (end and commit recommended). Missing evidence on a non-illustrative architecture diagram is an error. Invented-looking placeholders (`foo.ts`, line `1` on every node, or a commit the notes never mention) should be a warning in v1; a later optional check can verify paths when the target repo is checked out beside the deck.
- Cite ids used in evidence appear in the slide `sources` list (same idea as `cite-unknown`).
- Unknown component names stay warnings (forward-compatible).

`npm run review` / `lint-in-page.js`:

- Keep the 18px `tiny-text` rule, including diagram and edge labels.
- Do not require on-stage `file:line` text. Optionally, if a diagram has no `cite` / `illustrative` and no footnote-quality caption, warn — but the primary enforcement is in `npm run spec` plus the existing `source-missing` pattern if we add a small `FigureMark` (or equivalent) on architecture figures.
- Path-walk mid-steps are already screenshottable with `npm run review -- --steps`; the **final** step must still pass overflow, contrast, and tiny-text.

Tests (later PR): extend `test/` or template-level fixtures with a valid IR, an unlabeled-edge failure, a mixed-C4 failure, and a missing-evidence failure. Do not add GitHub Actions workflows.

## Implementation slices

| Slice | Scope | Ships when |
|---|---|---|
| **v1 (first implementation PR)** | IR schema in `deck-spec.md` + `npm run spec` validation; evidence conventions in the diagram guide, `types.ts` / `sources.ts`, workflow, SKILL, checklist; stubs emit real components from IR; `stepwise: path` on existing `C4Container`, `Sequence`, `FlowSteps`, and `LayeredArchitecture`; 18px and print-final-state unchanged; one documented example in the template spec and/or a locked sample slide | A deck about a real repo can declare evidenced nodes, fail validation when evidence or labels are missing, and walk one path in present mode. PDF shows the complete diagram. Package still 0.10.0 unless a separate publish decision is made later |
| **v1.1 (optional)** | Verify evidence paths when the target repo is available; tighten Mermaid + IR drift warnings; `FigureMark` on architecture figures | Spec check can catch fake paths in the common “deck lives next to the repo” case |
| **Follow-on** | State/lifecycle and a simple ERD, still split if dense | Only if a real brief needs them |
| **Companion** | Documented optional Archify HTML leave-behind + frozen Figure / rebuild | Never a build dependency |

v1 must stay small and shippable. Docs for v1 land in the implementation PR (this plan stays the design record). Do not rewrite the product README as if the feature has already shipped; a short pointer to this plan is enough until v1 merges.

## Risks

- **18px floor versus dense graphs.** Source-backed systems are often wider than a slide. The existing split rules (~15 nodes overall, tighter caps per component) stay in force. Agents must split “what exists” and “one request” rather than shrink labels. Path highlight must not add a second legend that crowds the footer.
- **Agents inventing fake `file:line` refs.** The worst failure mode for this work. Mitigation: require evidence fields; demand `illustrative` when the file was not opened; warn on uniform dummy lines; optional path verification later; the human approval gate on `deck.spec.yaml` remains mandatory — the user should see the IR before production TSX.
- **Stubs that look finished.** Emitting real components from IR helps preview, but locked polish is still required. Keep the “stubs are not final” line in SKILL.md.
- **Double sources of truth.** Locked TSX can drift from the IR. Existing promote/merge already says: if the user edits a locked slide in the spec, update the TSX by hand (or unlock → regenerate → re-polish). The implementation should report IR-vs-locked drift as “manual merge needed,” not overwrite.
- **License and attribution.** We take concepts, not code. Implementation must be original React + CSS in this repo (MIT). If a later companion workflow points at Archify, credit the project and keep it optional.

## Success criteria

For **this plan PR**: the document is accurate against `origin/main` (`3d8f38e` at drafting), scoped as above, and reviewable without any code change.

For a later **v1 implementation** (acceptance tests to write then):

1. A `C4Container` / `Sequence` / `LayeredArchitecture` / `FlowSteps` entry in `deck.spec.yaml` can declare nodes, labeled unidirectional edges (or the component’s existing equivalent), a `primary_path`, and per-node evidence; `npm run spec -- --check` passes on a valid example and fails (non-zero) on unlabeled edges, mixed C4 levels, over-cap size, a `primary_path` id that does not exist, or a non-illustrative architecture diagram with no evidence.
2. Stubs generated from that IR render the real component topology, not only a placeholder card; `status: locked` files are still not overwritten.
3. In present mode, `stepwise: path` walks the primary path on existing components with click steps; no zoom/pan/viewer chrome is introduced.
4. `npm run review` and `npm run export:pdf` show the complete final diagram, readable with motion off, and still enforce ≥18px text. No new graph library and no vendored Archify.
5. The approval gate, layout packing rules, and package version policy are unchanged. Archify is not required to build or export a deck.
6. Guides (`diagram-guide.md`, `deck-spec.md`, `workflow.md`, `SKILL.md`, `slide-catalog.md`, review checklist) describe the new rules in this repo’s voice, with Archify mentioned only as optional inspiration / leave-behind.

## Sources

1. Archify repository (Apache-2.0, v3.2.0) — https://github.com/tt-a1i/archify
2. Archify v3.2.0 release — https://github.com/tt-a1i/archify/releases/tag/v3.2.0
3. C4 model, Diagrams — https://c4model.com/diagrams
4. C4 model, Notation — https://c4model.com/diagrams/notation
5. Microsoft Learn, Create architecture design diagrams — https://learn.microsoft.com/en-us/azure/well-architected/architect-role/design-diagrams
6. Software Architecture Guild, Diagraming and Presenting — https://software-architecture-guild.com/guide/architecture/documentation/diagraming-and-presenting/
7. Current skill guides and implementation on `origin/main` (`3d8f38e`, 19 Nov 2026): `skills/web-slides/references/diagram-guide.md`, `deck-spec.md`, `workflow.md`, `slide-catalog.md`, `SKILL.md`; `template/scripts/spec.mjs`; `template/src/deck/diagrams.tsx`, `types.ts`, `components.tsx`; `template/src/slides/sources.ts`; `template/scripts/lint-in-page.js`.
