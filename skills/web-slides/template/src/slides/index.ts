import { defineDeck } from "../deck/types";
import title from "./01-title";
import agenda from "./02-agenda";
import bigNumber from "./03-big-number";
import comparison from "./04-comparison";
import architecture from "./05-architecture";
import timeline from "./06-timeline";
import code from "./07-code";
import results from "./08-results";
import quote from "./09-quote";
import governance from "./10-governance";
import lessons from "./11-lessons";
import closing from "./12-closing";

export const deck = defineDeck({
  title: "Agent-authored web decks",
  theme: "midnight", // midnight | aurora | paper | your brand theme from brand.css
  transition: "fade",
  slides: [title, agenda, bigNumber, comparison, architecture, timeline, code, results, quote, governance, lessons, closing],
});
