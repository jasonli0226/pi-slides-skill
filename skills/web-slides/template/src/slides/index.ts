import { defineDeck } from "../deck/types";
import title from "./01-title";
import agenda from "./02-agenda";
import bigNumber from "./03-big-number";
import comparison from "./04-comparison";
import architecture from "./05-architecture";
import layeredPlatform from "./13-layered-platform";
import c4Context from "./14-c4-context";
import chatSequence from "./15-chat-sequence";
import timeline from "./06-timeline";
import code from "./07-code";
import results from "./08-results";
import quote from "./09-quote";
import governance from "./10-governance";
import lessons from "./11-lessons";
import closing from "./12-closing";
// Live outline stubs (optional): uncomment the next two lines while using `npm run live`
// and editing content/deck.outline.md. Replace stubs with polished slide files before ship.
// import { outlineSlides } from "./generated/from-outline";

export const deck = defineDeck({
  title: "Agent-authored web decks",
  theme: "midnight",
  transition: "fade",
  slides: [
    title, agenda, bigNumber, comparison, architecture,
    layeredPlatform, c4Context, chatSequence,
    timeline, code, results, quote, governance, lessons, closing,
    // ...outlineSlides,
  ],
});
