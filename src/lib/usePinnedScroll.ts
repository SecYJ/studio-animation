import type { RefObject } from "react";
import { useScroll } from "motion/react";

/** Scroll progress through a pinned section (taller than the viewport):
 *  0 when its top meets the viewport top, 1 when its bottom meets the bottom.
 *
 *  Motion hands simple `useTransform(progress, [..], [..])` → opacity/filter
 *  chains to a native ViewTimeline, mapping "start start"/"end end" onto the
 *  timeline's `contain` range — which runs backwards for targets taller than
 *  the viewport, so those values stall mid-way (an opacity stuck at 0.42
 *  instead of 1). Dropping the acceleration keeps every pinned scrub on
 *  Motion's JS path, which tracks correctly. */
export function usePinnedScroll(target: RefObject<HTMLElement | null>) {
  const { scrollYProgress } = useScroll({ target, offset: ["start start", "end end"] });
  scrollYProgress.accelerate = undefined;
  return scrollYProgress;
}
