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
  /** Optional repository (owner/name or URL) when this bibliography entry is a codebase. */
  repo?: string;
  /** Optional commit SHA when the source is pinned to a checkout. Per-node pins may override. */
  commit?: string;
}

/** Pin a diagram node or edge to a file the agent opened. References a SourceRef id; not a new bibliography entry. */
export interface SourcePin {
  cite: string;
  path: string;
  /** 1-based start line. */
  start: number;
  end?: number;
  /** Optional commit override for this pin. */
  commit?: string;
}

export const defineSlide = (s: SlideDef) => s;
export const defineDeck = (d: DeckConfig) => d;
