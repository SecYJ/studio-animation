import { useEffect } from "react";
import { useReducedMotion } from "motion/react";
import Lenis from "lenis";

/** Drives buttery momentum scrolling via Lenis. Disabled for reduced-motion users. */
export function SmoothScroll() {
  const reduce = useReducedMotion();

  /* always start at the top — restoring scroll mid-page skips the intro
     and looks like the page scrolled to the end by itself */
  useEffect(() => {
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ lerp: 0.09, autoRaf: true, anchors: true });
    return () => lenis.destroy();
  }, [reduce]);

  return null;
}
