import { Appear, Figure, IconList, SlideFrame } from "../deck/components";
import { defineSlide } from "../deck/types";
import { Copy, Image, ShieldCheck, Sparkles } from "lucide-react";

export default defineSlide({
  id: "media-figure",
  notes:
    "Illustrative only — shows how the agent places a user-provided file in public/media/ and renders it with <Figure>. Replace the SVG with the user's asset; never invent logos.",
  Component: () => (
    <SlideFrame
      kind="content"
      kicker="Media • Figure"
      title="User-provided media lands in public/media and renders through Figure."
    >
      <div className="grid-2" style={{ alignItems: "center", gap: 40 }}>
        <Appear variant="fade">
          <Figure
            src="/media/illustrative-mesh.svg"
            alt="Abstract blue mesh sample for a user-supplied image"
            fit="contain"
            maxHeight={400}
            illustrative
            caption="Illustrative sample. Swap for the user's file."
          />
        </Appear>
        <Appear delay={0.12}>
          <IconList
            items={[
              { icon: Copy, text: <>Copy to <code style={{ fontFamily: "var(--font-mono)", fontSize: 22 }}>public/media/&lt;kebab&gt;.&lt;ext&gt;</code></> },
              { icon: Image, text: <>Render with <code style={{ fontFamily: "var(--font-mono)", fontSize: 22 }}>&lt;Figure src="/media/…" alt="…" /&gt;</code></> },
              { icon: ShieldCheck, text: <>Add <code style={{ fontFamily: "var(--font-mono)", fontSize: 22 }}>cite</code> or <code style={{ fontFamily: "var(--font-mono)", fontSize: 22 }}>illustrative</code> — never invent logos</> },
              { icon: Sparkles, text: "Prefer Lucide for UI icons; Figure for photos, logos and screenshots" },
            ]}
          />
        </Appear>
      </div>
    </SlideFrame>
  ),
});
