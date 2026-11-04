import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "./theme/tokens.css";
import "./theme/brand.css";
import "./deck/deck.css";
import { Deck } from "./deck/Deck";
import { deck } from "./slides";

// set theme before first render so async renderers (mermaid) read the right tokens
document.documentElement.dataset.theme = deck.theme;

createRoot(document.getElementById("root")!).render(<Deck config={deck} />);
