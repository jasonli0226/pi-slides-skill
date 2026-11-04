import { FlowSteps, Sequence, SlideFrame } from "../deck/components";
import { defineSlide } from "../deck/types";
import { S } from "./sources";

export default defineSlide({
  id: "chat-sequence",
  steps: 6,
  notes: "Walk one chat turn. FlowSteps summarise; Sequence shows the hand-offs.",
  Component: () => (
    <SlideFrame kind="architecture" kicker="Diagram · sequence · illustrative" sources={[S.archPresenting]}
      title="After the overview, walk one request so the room can follow the path.">
      <div style={{ display: "flex", flexDirection: "column", gap: 28, height: "100%" }}>
        <FlowSteps steps={[
          { title: "Ask", body: "User prompt", tone: "accent-3" },
          { title: "Ground", body: "Retrieve docs", tone: "accent-2" },
          { title: "Reason", body: "Model + tools", tone: "accent" },
          { title: "Answer", body: "Stream + cite", tone: "accent" },
        ]} />
        <Sequence stepwise actors={[
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
