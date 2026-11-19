import { FlowSteps, Sequence, SlideFrame } from "../deck/components";
import { defineSlide } from "../deck/types";
import { S } from "./sources";

export default defineSlide({
  id: "chat-sequence",
  steps: 6,
  notes: "Illustrative walk of one chat turn — not pinned to a real repo. FlowSteps summarise the strip; Sequence uses stepwise path so every message stays visible while clicks accent the current hop. Print shows the complete sequence with the path softly accented.",
  Component: () => (
    <SlideFrame kind="architecture" kicker="Diagram · sequence · illustrative" sources={[S.archPresenting]}
      title="After the overview, walk one request so the room can follow the path.">
      <div style={{ display: "flex", flexDirection: "column", gap: 28, height: "100%" }}>
        <FlowSteps steps={[
          { id: "ask", title: "Ask", body: "User prompt", tone: "accent-3" },
          { id: "ground", title: "Ground", body: "Retrieve docs", tone: "accent-2" },
          { id: "reason", title: "Reason", body: "Model + tools", tone: "accent" },
          { id: "answer", title: "Answer", body: "Stream + cite", tone: "accent" },
        ]} />
        <Sequence stepwise="path" primary_path={[0, 1, 2, 3, 4, 5]} actors={[
          { id: "u", label: "User", tone: "accent-3" },
          { id: "gw", label: "Gateway", tone: "accent-2" },
          { id: "or", label: "Orchestrator", tone: "accent" },
          { id: "m", label: "Model", tone: "muted" },
        ]} messages={[
          { from: "u", to: "gw", label: "Chat request" },
          { from: "gw", to: "or", label: "Auth'd prompt" },
          { from: "or", to: "m", label: "Tool-aware call" },
          { from: "m", to: "or", label: "Tokens", dashed: true },
          { from: "or", to: "gw", label: "Grounded answer", dashed: true },
          { from: "gw", to: "u", label: "Streamed reply", dashed: true },
        ]} />
      </div>
    </SlideFrame>
  ),
});
