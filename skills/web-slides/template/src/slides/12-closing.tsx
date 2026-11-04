import { Appear, SlideFrame } from "../deck/components";
import { defineSlide } from "../deck/types";
import { allSources } from "./sources";

export default defineSlide({
  id: "closing",
  transition: "zoom",
  notes: "Close with the ask, then leave the references on screen for questions.",
  Component: () => (
    <SlideFrame kind="closing" background="aurora" kicker="Next step"
      title="Start with an approved outline, and the scaffold handles the polish.">
      <Appear delay={0.3} variant="fade">
        <div className="card" style={{ height: "auto" }}>
          <div className="card-title" style={{ fontSize: 26 }}>References</div>
          <ol className="card-body" style={{ margin: 0, paddingLeft: 28, fontSize: 20, columns: 2, columnGap: 48 }}>
            {allSources.map((s) => <li key={s.id}>{s.label}{"url" in s && s.url ? ` (${s.url.replace(/^https:\/\//, "")})` : ""}</li>)}
          </ol>
        </div>
      </Appear>
    </SlideFrame>
  ),
});
