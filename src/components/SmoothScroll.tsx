import { useEffect } from "react";
import { useReducedMotion } from "motion/react";
import Lenis from "lenis";

/** Drives buttery momentum scrolling via Lenis. Disabled for reduced-motion users. */
export function SmoothScroll() {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ lerp: 0.09, autoRaf: true });
    return () => lenis.destroy();
  }, [reduce]);

  return null;
}
