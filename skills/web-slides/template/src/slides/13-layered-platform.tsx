import { Bot, Database, Network, Server } from "lucide-react";
import { LayeredArchitecture, SlideFrame } from "../deck/components";
import { defineSlide } from "../deck/types";
import { S } from "./sources";

/** Illustrative generic AI platform — not a vendor copy. Shows LayeredArchitecture with a path walk. */
export default defineSlide({
  id: "layered-platform",
  steps: 4,
  notes: "Invented example, marked illustrative — do not treat cells as a real repo. In present mode the path walks Web app → API gateway → Orchestrator → Vector index; print shows the complete stack with that path softly accented.",
  Component: () => (
    <SlideFrame kind="architecture" kicker="Diagram · layered stack · illustrative" sources={[S.c4Diagrams, S.azureDiagrams]}
      title="Dense stacks need swimlanes, not a hairball of boxes.">
      <LayeredArchitecture stepwise="path" primary_path={["web-app", "api-gateway", "orchestrator", "vector-index"]}
        leftRail={{ label: "Trust", tone: "muted", items: ["Identity", "Policy"] }}
        rightRail={{ label: "Operate", tone: "accent-2", items: ["Observe", "Deploy"] }}
        layers={[
          {
            id: "experience", label: "Experience", tone: "accent",
            items: [
              { id: "web-app", label: "Web app", sub: "React", icon: Bot },
              { id: "admin", label: "Admin", sub: "Ops console" },
              { id: "api-clients", label: "API clients", sub: "Partners" },
            ],
          },
          {
            id: "edge", label: "Edge", tone: "accent-2",
            items: [
              { id: "api-gateway", label: "API gateway", sub: "Auth · rate limit", highlight: true, icon: Network },
              { id: "cdn", label: "CDN / WAF", sub: "Edge cache" },
              { id: "stream-gateway", label: "Stream gateway", sub: "SSE / WS" },
            ],
          },
          {
            id: "ai", label: "AI services", tone: "accent-3",
            items: [
              { id: "orchestrator", label: "Orchestrator", sub: "Agents · tools", highlight: true, icon: Bot },
              { id: "rag", label: "RAG service", sub: "Retrieve · rank" },
              { id: "model-router", label: "Model router", sub: "SLA · cost" },
              { id: "eval", label: "Eval harness", sub: "Offline · online" },
            ],
          },
          {
            id: "data", label: "Data", tone: "muted",
            items: [
              { id: "vector-index", label: "Vector index", sub: "Embeddings", icon: Database },
              { id: "feature-store", label: "Feature store", sub: "Online / offline" },
              { id: "kubernetes", label: "Kubernetes", sub: "Services", icon: Server },
              { id: "gpu-pool", label: "GPU pool", sub: "Inference" },
            ],
          },
        ]}
      />
    </SlideFrame>
  ),
});
