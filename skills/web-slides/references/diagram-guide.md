# Diagram guide

How to choose a diagram for a slide, and how to draw it with React + CSS (or Mermaid for small flows). Read this before you invent a free-form SVG. For data charts (trends, stacks, scatter, sankey, heatmaps) read `chart-guide.md` instead.

## Principles (with sources)

1. **One zoom level per slide.** The C4 model uses four static levels — system context, containers, components, code — so you can tell different stories to different audiences. You do not need every level; context and containers are enough for most teams [1]. A single diagram must not mix levels [2][3].
2. **Layer, don't overload.** Prefer a high-level context, then a focused container or flow for one scenario, instead of one dense "whole system" picture [3][4]. If a diagram has more than about 15 nodes, split it and add a parent overview that points to the children [2].
3. **Walk a scenario.** When presenting, start with the main elements, then walk one concrete request across the diagram; only zoom when the audience needs it [4]. Declare that request as `primary_path` and use `stepwise: path` so each click accents the next hop. Print and `?static` show the complete diagram with the path softly accented — meaning must not live only in a mid-walk frame.
4. **Pin real-repo architecture to evidence.** When the brief is to explain a **real codebase**, every component and edge on an architecture, flow, C4, or sequence diagram is pinned to evidence you opened in this session: a bibliography id, file path, start line, optional end line, and commit SHA when practical. Record pins in the diagram IR (`deck-spec.md`) and in `sources.ts`. The slide footer cites those bibliography ids; **do not** put tiny `file:line` labels on the stage (the 18px floor still applies). If a node or edge cannot be evidenced, mark the diagram or that node `illustrative` and say why in the notes. Never invent a path or line range.
5. **Notation must stand alone.** Title the diagram type and scope, label every relationship with a specific verb (not just "uses"), mark element types, and include a key when shapes or colours encode meaning [5]. Prefer unidirectional arrows; avoid ambiguous bidirectional lines [3].
6. **Readable on a slide.** Short labels, consistent shapes, WCAG AA contrast, and no reliance on colour alone [2][3][5].

## Scenario → diagram type

| Scenario on the slide | Prefer | Component | Avoid |
|---|---|---|---|
| Simple process / request path, ≤8 nodes | Flowchart L→R or T→B | `<Mermaid>` or `<FlowSteps>` | Swimlanes |
| Ordered steps the audience should remember (3–6) | Numbered step strip | `<FlowSteps>` | Tiny Mermaid |
| Dense layered enterprise stack (experience → edge → services → data → infra) | Horizontal swimlanes / layer map | `<LayeredArchitecture>` | Mermaid; one hairball |
| Cross-cutting concerns (identity, security, ops) beside the stack | Side rails on the layer map | `leftRail` / `rightRail` | Extra full lanes for one item |
| "Who is in the picture, what talks to what?" | C4 context or container | `<C4Container>` | Mixing code-level boxes into context |
| One request across services over time | Sequence / lifeline | `<Sequence>` | Stuffing the sequence into the layer map |
| Decision / branching policy | Decision tree (few branches) | `<Mermaid>` flowchart with diamonds, or Cards | 20-branch trees on one slide |
| Data flow / pipeline | FlowSteps or Mermaid LR | `<FlowSteps>` / `<Mermaid>` | Bidirectional spaghetti |
| Deployment / zones | LayeredArchitecture by zone, or C4 deployment (draw as layers) | `<LayeredArchitecture>` | Copying vendor reference architectures verbatim |

**Mermaid stays for ≤8 nodes.** Once you need swimlanes, side rails, precise columns, or more than eight boxes, switch to the React components. Do not add React Flow, AntV X6 or similar unless the user asks and edges must be interactive — presentation decks almost never need that.

## When to split across slides

Split when any of these is true:

- More than ~8 nodes for Mermaid, or more than ~6 layers / 5 cells per layer for a swimlane.
- You need both "what exists" and "what happens on one request" — use a layer or C4 slide, then a sequence slide.
- Two audiences (exec vs engineers) need different zoom levels — C4 context first, containers second [1].
- A vendor or customer pasted a dense reference diagram — rebuild a **simplified generic** view (and mark it illustrative). Never copy proprietary labels, logos or exact topology into the deck.
- You cannot evidence a node from a real repo — mark it (or the whole figure) `illustrative` rather than inventing `path` / `start`.

A good pattern for technical talks: **overview (C4 or layered) → one happy-path sequence → governance / controls**.

## Beauty rules (React + CSS)

- **Color by layer or kind, not by box.** Map each swimlane or C4 kind to a `tone` (`accent` / `accent-2` / `accent-3` / `muted`). Keep fills as soft tints of the tone on `--surface` so text stays WCAG AA.
- **Columns:** at most 3–5 cells per row on a layer; at most 3–4 columns in a C4 grid.
- **Labels:** ≤ 3–4 words on a cell; put detail in `sub`, `description`, `tech`, or speaker notes. Spell out acronyms in the caption or legend [5].
- **Spacing:** use the component defaults (12–28px gaps). Do not hand-place with `position: absolute` unless you are drawing SVG edges inside `C4Container`.
- **Motion:** `stepwise: reveal` (or `stepwise` / `true`) still reveals lanes, steps, or messages one click at a time. `stepwise: path` keeps every node visible and accents the next hop on `primary_path`, dimming the rest just enough to stay readable. Do not add zoom, pan, click-to-open inspectors, or tooltips that are the only place a label lives. Static, print, and PDF show the **complete** diagram: every node and label visible, primary path softly accented, nothing dimmed to illegible.
- **Icons:** lucide only, via the `icon` prop on layer cells or FlowSteps. No emoji.
- **Edges:** unidirectional, specifically labelled ("Retrieves docs", "Completions HTTPS"). Dashed = async, return, or optional [3][5]. `C4Container` draws **orthogonal SVG elbows** (no graph library) with pill edge labels on the bend; keep `showRelationList` off. The kind legend overlays the stage (top) so it never hits the footer.
- **Contrast:** body text on cells uses `--text` / `--text-muted` on `--surface`. Run `npm run review` after any custom CSS.

## Anti-patterns

- Forty boxes on one slide, or a screenshot of a Visio/Confluence wall.
- Emoji, clip-art clouds, or mixed icon sets.
- Text under 18px (including edge labels and rail text) — the review lint fails this.
- Hard-coded hex colours in the slide file.
- Bidirectional arrows and unlabeled lines [3].
- Mixing C4 levels (person + class diagram) in one figure [2].
- Mermaid for a 6-layer enterprise map "because it's faster" — it will look worse and the agent cannot control layout.
- Copying a customer's or vendor's architecture diagram into the deck.

## Component cheat sheet

| Component | Best for | Hard limits (soft) |
|---|---|---|
| `Mermaid` | Small flows, decision trees | ≤8 nodes |
| `FlowSteps` | Memorable 3–6 step path | ≤6 steps |
| `LayeredArchitecture` | Stack / zone maps | 3–6 layers, ≤5 cells/layer |
| `Sequence` | One request over time | ≤6 actors, ≤8 messages |
| `C4Container` | Context / container view (elbow edges, kind legend overlay) | ≤8 boxes, ≤3×4 grid; optional `rowSpan`/`colSpan`; set `level` |
| `DiagramLegend` | Tone / kind key | — |

Set `stepwise: path` and `primary_path` when you want to walk one request. Official example architecture slides (`13-layered-platform.tsx`, `14-c4-context.tsx`, `15-chat-sequence.tsx`) are honestly **illustrative** — they demonstrate the IR and path walk without inventing fake `file:line` pins.

Import from `../deck/components` (re-exported) or `../deck/diagrams`.

## Sources

1. C4 model, Diagrams — https://c4model.com/diagrams  
2. Sui docs, Technical Diagram Standards (C4 levels, ≤15 nodes, WCAG) — https://docs.sui.io/references/contribute/diagram-standards  
3. Microsoft Learn, Create architecture design diagrams — https://learn.microsoft.com/en-us/azure/well-architected/architect-role/design-diagrams  
4. Software Architecture Guild, Diagraming and Presenting — https://software-architecture-guild.com/guide/architecture/documentation/diagraming-and-presenting/  
5. C4 model, Notation — https://c4model.com/diagrams/notation  
