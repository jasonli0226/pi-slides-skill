// Diagram IR validation + stub emission for the v1 evidence / path-walk slice.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { isolatedTemplate, run, template, tryRun } from "./helpers.mjs";

const { validate, diagramIssues } = await import(
  pathToFileURL(join(template, "scripts/spec.mjs")).href
);

const baseSlide = {
  n: 1,
  id: "arch",
  type: "architecture",
  title: "Analysts ask the platform and get a grounded answer.",
  status: "stub",
  sources: ["repoMain"],
};

function deckWith(component, extra = {}) {
  return {
    title: "Diagram checks",
    theme: "midnight",
    approved: false,
    slides: [{ ...baseSlide, ...extra, components: [component] }],
  };
}

test("diagramIssues accepts a valid illustrative C4 IR with a path", () => {
  const props = {
    illustrative: true,
    level: "context",
    stepwise: "path",
    primary_path: ["user", "platform", "docs"],
    nodes: [
      { id: "user", label: "Analyst", kind: "person", row: 1, col: 1 },
      { id: "platform", label: "Platform", kind: "system", row: 1, col: 2 },
      { id: "docs", label: "Docs", kind: "external", row: 2, col: 1 },
    ],
    relations: [
      { from: "user", to: "platform", label: "Asks / reviews" },
      { from: "platform", to: "docs", label: "Retrieves docs" },
    ],
  };
  const { errors, warnings } = diagramIssues("C4Container", props, baseSlide);
  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 0);
  const v = validate(deckWith({ C4Container: props }, { steps: 3 }));
  assert.equal(v.ok, true, v.errors.join("\n"));
});

test("diagramIssues errors on an unlabeled edge", () => {
  const { errors } = diagramIssues("C4Container", {
    illustrative: true,
    level: "context",
    nodes: [
      { id: "a", label: "A", kind: "person", row: 1, col: 1 },
      { id: "b", label: "B", kind: "system", row: 1, col: 2 },
    ],
    relations: [{ from: "a", to: "b", label: "uses" }],
  }, baseSlide);
  assert.ok(errors.some((e) => /specific verb label/.test(e)), errors.join("\n"));
});

test("diagramIssues errors on mixed C4 levels", () => {
  const { errors } = diagramIssues("C4Container", {
    illustrative: true,
    level: "context",
    nodes: [
      { id: "user", label: "Analyst", kind: "person", row: 1, col: 1 },
      { id: "api", label: "API", kind: "container", row: 1, col: 2 },
    ],
    relations: [{ from: "user", to: "api", label: "Calls HTTPS" }],
  }, baseSlide);
  assert.ok(errors.some((e) => /mixes container/.test(e)), errors.join("\n"));
});

test("diagramIssues errors when a non-illustrative architecture diagram has no evidence", () => {
  const { errors } = diagramIssues("C4Container", {
    level: "context",
    nodes: [
      { id: "user", label: "Analyst", kind: "person", row: 1, col: 1 },
      { id: "platform", label: "Platform", kind: "system", row: 1, col: 2 },
    ],
    relations: [{ from: "user", to: "platform", label: "Asks / reviews" }],
  }, baseSlide);
  assert.ok(errors.some((e) => /lack evidence/.test(e)), errors.join("\n"));
});

test("diagramIssues accepts evidenced nodes on a non-illustrative C4", () => {
  const props = {
    level: "context",
    cite: "repoMain",
    nodes: [
      {
        id: "user", label: "Analyst", kind: "person", row: 1, col: 1,
        evidence: [{ cite: "repoMain", path: "apps/web/src/chat.ts", start: 40, end: 88 }],
      },
      {
        id: "platform", label: "Platform", kind: "system", row: 1, col: 2,
        evidence: [{ cite: "repoMain", path: "services/orchestrator/src/index.ts", start: 1, end: 80 }],
      },
    ],
    relations: [{ from: "user", to: "platform", label: "Asks / reviews" }],
  };
  const { errors } = diagramIssues("C4Container", props, baseSlide);
  assert.deepEqual(errors, []);
});

test("validate fails non-zero on unlabeled edges via --check", (t) => {
  const dir = isolatedTemplate(t);
  writeFileSync(join(dir, "content/deck.spec.yaml"), `title: Fail
theme: midnight
approved: false
slides:
  - n: 1
    id: unlabeled
    type: architecture
    title: This diagram is missing a verb on its only edge.
    status: stub
    sources: [repoMain]
    components:
      - C4Container:
          level: context
          illustrative: true
          nodes:
            - { id: a, label: A, kind: person, row: 1, col: 1 }
            - { id: b, label: B, kind: system, row: 1, col: 2 }
          relations:
            - { from: a, to: b, label: "" }
`);
  const r = tryRun(process.execPath, ["scripts/spec.mjs", "--check"], dir);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /specific verb label/);
});

test("validate fails on mixed C4 and missing evidence via --check", (t) => {
  const dir = isolatedTemplate(t);
  writeFileSync(join(dir, "content/deck.spec.yaml"), `title: Fail
theme: midnight
approved: false
slides:
  - n: 1
    id: mixed
    type: architecture
    title: Context slides must not mix in container boxes.
    status: stub
    sources: [repoMain]
    components:
      - C4Container:
          level: context
          illustrative: true
          nodes:
            - { id: user, label: Analyst, kind: person, row: 1, col: 1 }
            - { id: api, label: API, kind: container, row: 1, col: 2 }
          relations:
            - { from: user, to: api, label: Calls HTTPS }
  - n: 2
    id: no-evidence
    type: architecture
    title: Real repo nodes need evidence or an illustrative mark.
    status: stub
    sources: [repoMain]
    components:
      - C4Container:
          level: context
          nodes:
            - { id: user, label: Analyst, kind: person, row: 1, col: 1 }
            - { id: platform, label: Platform, kind: system, row: 1, col: 2 }
          relations:
            - { from: user, to: platform, label: Asks / reviews }
`);
  const r = tryRun(process.execPath, ["scripts/spec.mjs", "--check"], dir);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /mixes container/);
  assert.match(r.out, /lack evidence/);
});

test("spec.mjs emits a real C4Container stub from validated IR", (t) => {
  const dir = isolatedTemplate(t);
  writeFileSync(join(dir, "content/deck.spec.yaml"), `title: Stub emit
theme: midnight
approved: false
slides:
  - n: 1
    id: stub-c4
    type: architecture
    title: Stubs should show the actual topology from the IR.
    status: stub
    steps: 2
    sources: [repoMain]
    components:
      - C4Container:
          illustrative: true
          level: context
          stepwise: path
          primary_path: [user, platform]
          nodes:
            - { id: user, label: Analyst, kind: person, row: 1, col: 1 }
            - { id: platform, label: Platform, kind: system, row: 1, col: 2 }
          relations:
            - { from: user, to: platform, label: Asks / reviews }
`);
  run(process.execPath, ["scripts/spec.mjs"], dir);
  const gen = readFileSync(join(dir, "src/slides/generated/from-spec.tsx"), "utf8");
  assert.match(gen, /C4Container/);
  assert.match(gen, /stepwise="path"/);
  assert.match(gen, /primary_path/);
  assert.match(gen, /Asks \/ reviews/);
  assert.doesNotMatch(gen, /Replace this stub with the real component/);
  assert.match(gen, /from "\.\.\/\.\.\/deck\/components"/);
});

test("template design spec still validates with the diagram examples", () => {
  const out = run(process.execPath, ["scripts/spec.mjs", "--check"], template);
  assert.match(out, /spec: OK/);
  assert.match(out, /0 warning\(s\)/);
});
