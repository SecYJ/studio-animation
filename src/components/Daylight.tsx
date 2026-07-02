import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";

/** Page-wide ambience that turns the scroll into one studio day:
 *  a warm afternoon sun hangs over the hero, sinks as you travel down,
 *  and a blue dusk settles over the last sections until the CTA is night. */
export function Daylight() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 30, restDelta: 0.001 });

  const sunY = useTransform(progress, [0, 0.8], ["0vh", "55vh"]);
  const sunOpacity = useTransform(progress, [0, 0.5, 0.78], [0.9, 0.55, 0]);
  const duskOpacity = useTransform(progress, [0.6, 0.94], [0, 0.4]);

  if (reduce) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[4]" aria-hidden="true">
      {/* afternoon sun — warm halo that slides below the "horizon" as the page ends */}
      <motion.div
        className="absolute top-[-32vh] right-[-18vw] size-[80vw] rounded-full mix-blend-soft-light will-change-transform"
        style={{
          y: sunY,
          opacity: sunOpacity,
          background:
            "radial-gradient(circle at center, rgb(255 206 130 / 0.95), rgb(255 206 130 / 0.3) 42%, transparent 68%)",
        }}
      />
      {/* dusk — cool ink wash multiplying over whatever section is on screen */}
      <motion.div
        className="absolute inset-0 bg-[#18203a] mix-blend-multiply"
        style={{ opacity: duskOpacity }}
      />
    </div>
  );
}
