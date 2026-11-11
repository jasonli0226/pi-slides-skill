/**
 * <SplineScene>: optional 3D hero from a scene the user built in the Spline editor.
 * The agent can only embed a scene URL the user provides; it can't author one.
 *
 * Embedded as a sandboxed iframe of the scene's public URL (https://my.spline.design/…), so no
 * Spline package ships with the deck and decks without a scene pay nothing. The scene loads from
 * Spline's servers, so a local `poster` image (public/media) is always rendered first and stays up
 * in static, print/PDF and review screenshots, with reduced motion, offline, and when the scene
 * fails or takes longer than `timeout` ms. It counts as the slide's one hero effect.
 * See references/media-guide.md ("3D scenes (Spline)").
 */
import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { reportError, useIsStatic } from "./context";

const SPLINE_URL = /^https:\/\/my\.spline\.design\/[A-Za-z0-9][\w-]*\/?$/;

export function SplineScene({ src, poster, alt, decorative = false, height = 720, timeout = 12000, revealDelay = 800 }: {
  /** public scene URL from Spline's Export → Public URL, e.g. https://my.spline.design/name-1a2b3c/ */
  src: string;
  /** local fallback image under public/media (required): a still of the scene */
  poster: string;
  /** describes the scene; required unless `decorative` */
  alt?: string;
  decorative?: boolean;
  height?: number | string;
  /** give up on the live scene after this many ms and keep the poster */
  timeout?: number;
  /** wait after the iframe loads before fading the poster (the scene paints after load) */
  revealDelay?: number;
}) {
  const isStatic = useIsStatic();
  const reduced = useReducedMotion();
  const valid = SPLINE_URL.test(src);
  const online = typeof navigator === "undefined" || navigator.onLine !== false;
  const live = valid && !isStatic && !reduced && online;
  // probing → loading (iframe mounted) → live (poster fades). A cross-origin iframe fires `load` even for
  // an error page, so first probe the URL: a network failure (offline, blocked) keeps the poster.
  const [state, setState] = useState<"poster" | "probing" | "loading" | "live" | "failed">(live ? "probing" : "poster");

  useEffect(() => {
    if (!valid) reportError(`spline: src must be a public https://my.spline.design/… scene URL (got ${JSON.stringify(src)})`);
    if (!poster) reportError("spline: a local poster image is required");
  }, [valid, src, poster]);

  useEffect(() => {
    if (state !== "probing") return;
    let alive = true;
    fetch(src, { mode: "no-cors", cache: "force-cache", referrerPolicy: "no-referrer" })
      .then(() => alive && setState((s) => (s === "probing" ? "loading" : s)))
      .catch(() => alive && setState("failed"));
    return () => { alive = false; };
  }, [state, src]);

  useEffect(() => {
    if (!live) return;
    const t = setTimeout(() => setState((s) => (s === "probing" || s === "loading" ? "failed" : s)), timeout);
    return () => clearTimeout(t);
  }, [live, timeout]);

  const onLoad = () => setTimeout(() => setState((s) => (s === "loading" ? "live" : s)), revealDelay);
  const h = typeof height === "number" ? `${height}px` : height;
  return (
    <figure className="spline-scene" data-figure="spline" data-spline-state={state} style={{ height: h }}>
      {(state === "loading" || state === "live") && (
        <iframe className="spline-frame" src={src} title={alt || "3D scene"} tabIndex={-1} aria-hidden
          sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" loading="eager" onLoad={onLoad} />
      )}
      {decorative
        ? <img className="spline-poster" data-spline-poster src={poster} alt="" aria-hidden="true" data-decorative="true" decoding="async"
            onError={() => reportError(`spline: poster failed to load ${poster}`)} />
        : <img className="spline-poster" data-spline-poster src={poster} alt={alt ?? ""} decoding="async"
            onError={() => reportError(`spline: poster failed to load ${poster}`)} />}
    </figure>
  );
}
