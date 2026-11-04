import { Bot, Database, Network, Server } from "lucide-react";
import { LayeredArchitecture, SlideFrame } from "../deck/components";
import { defineSlide } from "../deck/types";
import { S } from "./sources";

/** Illustrative generic AI platform — not a vendor copy. Shows LayeredArchitecture. */
export default defineSlide({
  id: "layered-platform",
  steps: 4,
  notes: "Invented example. Walk lanes top→bottom, then the rails. Use this when Mermaid cannot lay out a stack.",
  Component: () => (
    <SlideFrame kind="architecture" kicker="Diagram · layered stack · illustrative" sources={[S.c4Diagrams, S.azureDiagrams]}
      title="Dense stacks need swimlanes, not a hairball of boxes.">
      <LayeredArchitecture stepwise
        leftRail={{ label: "Trust", tone: "muted", items: ["Identity", "Policy"] }}
        rightRail={{ label: "Operate", tone: "accent-2", items: ["Observe", "Deploy"] }}
        layers={[
          {
            id: "experience", label: "Experience", tone: "accent",
            items: [
              { label: "Web app", sub: "React", icon: Bot },
              { label: "Admin", sub: "Ops console" },
              { label: "API clients", sub: "Partners" },
            ],
          },
          {
            id: "edge", label: "Edge", tone: "accent-2",
            items: [
              { label: "API gateway", sub: "Auth · rate limit", highlight: true, icon: Network },
              { label: "CDN / WAF", sub: "Edge cache" },
              { label: "Stream gateway", sub: "SSE / WS" },
            ],
          },
          {
            id: "ai", label: "AI services", tone: "accent-3",
            items: [
              { label: "Orchestrator", sub: "Agents · tools", highlight: true, icon: Bot },
              { label: "RAG service", sub: "Retrieve · rank" },
              { label: "Model router", sub: "SLA · cost" },
              { label: "Eval harness", sub: "Offline · online" },
            ],
          },
          {
            id: "data", label: "Data", tone: "muted",
            items: [
              { label: "Vector index", sub: "Embeddings", icon: Database },
              { label: "Feature store", sub: "Online / offline" },
              { label: "Kubernetes", sub: "Services", icon: Server },
              { label: "GPU pool", sub: "Inference" },
            ],
          },
        ]}
      />
    </SlideFrame>
  ),
});
