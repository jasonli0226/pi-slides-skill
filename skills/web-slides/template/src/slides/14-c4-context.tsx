import { C4Container, SlideFrame } from "../deck/components";
import { defineSlide } from "../deck/types";
import { S } from "./sources";

export default defineSlide({
  id: "c4-context",
  notes: "C4 system-context view of the same illustrative platform. One zoom level only. Edge labels: Asks, Completions, Retrieves, Tickets.",
  Component: () => (
    <SlideFrame kind="architecture" kicker="Diagram · C4 context · illustrative" sources={[S.c4Diagrams, S.c4Notation]}
      title="C4 context shows who is in the picture before you open the stack.">
      <C4Container cols={3} rows={2} legend={false} nodes={[
        { id: "user", label: "Analyst", kind: "person", description: "Asks in natural language", row: 1, col: 1 },
        { id: "platform", label: "AI Platform", kind: "system", description: "Answers with grounded tools", tech: "illustrative", highlight: true, row: 1, col: 2 },
        { id: "llm", label: "Model vendor", kind: "external", description: "Hosted LLM API", row: 1, col: 3 },
        { id: "docs", label: "Corp docs", kind: "external", description: "Wiki · files", row: 2, col: 1 },
        { id: "ticket", label: "ITSM", kind: "external", description: "Tickets · CMDB", row: 2, col: 3 },
      ]} relations={[
        { from: "user", to: "platform", label: "Asks" },
        { from: "platform", to: "llm", label: "Completions" },
        { from: "platform", to: "docs", label: "Retrieves" },
        { from: "platform", to: "ticket", label: "Tickets", dashed: true },
      ]} />
    </SlideFrame>
  ),
});
