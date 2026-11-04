import type { ComponentType } from "react";

export type TransitionName = "fade" | "slide" | "zoom" | "blur" | "none";
export type SlideKind =
  | "title" | "agenda" | "section" | "big-number" | "architecture" | "comparison"
  | "timeline" | "code" | "quote" | "results" | "governance" | "lessons" | "closing" | "content";

export interface SlideDef {
  /** stable id, used in URLs and screenshot names */
  id: string;
  /** number of click steps on this slide (0 = everything visible at once) */
  steps?: number;
  /** speaker notes, shown with the N key */
  notes?: string;
  transition?: TransitionName;
  Component: ComponentType;
}

export interface DeckConfig {
  title: string;
  /** theme name defined in src/theme/tokens.css or brand.css ([data-theme="..."]) */
  theme: string;
  transition?: TransitionName;
  slides: SlideDef[];
}

export interface SourceRef {
  id: string;
  /** short human label: publisher, title, year */
  label: string;
  url?: string;
}

export const defineSlide = (s: SlideDef) => s;
export const defineDeck = (d: DeckConfig) => d;
