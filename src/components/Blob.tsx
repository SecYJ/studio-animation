import { type PointerEvent, useState } from "react";
import {
  motion,
  type MotionValue,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";

const SPRING = { stiffness: 150, damping: 16, mass: 0.7 };
const MAX_SHIFT = 90; // px the blob can drift toward the cursor
const FOLLOW = 0.22; // fraction of the cursor offset it chases

type BlobProps = {
  /** position + size utility classes for the (stationary) hit area */
  position: string;
  /** background gradient utility class for the visible blob */
  gradient: string;
  restOpacity: number;
  hoverOpacity: number;
  /** scroll-driven parallax offset shared from the hero */
  parallaxY: MotionValue<number>;
};

/** A soft gradient orb that brightens, swells and magnetically follows the cursor on hover. */
export function Blob({ position, gradient, restOpacity, hoverOpacity, parallaxY }: BlobProps) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(false);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const x = useSpring(px, SPRING);
  const y = useSpring(py, SPRING);

  const handleMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - (r.left + r.width / 2);
    const relY = e.clientY - (r.top + r.height / 2);
    px.set(Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, relX * FOLLOW)));
    py.set(Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, relY * FOLLOW)));
  };

  const handleLeave = () => {
    px.set(0);
    py.set(0);
    setActive(false);
  };

  return (
    <motion.div
      className={`absolute ${position}`}
      style={{ y: parallaxY }}
      onPointerEnter={() => setActive(true)}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      {/* the blurred orb is its own layer: the compositor moves the already-
          blurred texture instead of re-rastering a 40px blur on every hover frame */}
      <motion.div
        className={`size-full rounded-full blur-2xl will-change-transform ${gradient}`}
        style={{ x, y }}
        animate={{ scale: active ? 1.16 : 1, opacity: active ? hoverOpacity : restOpacity }}
        transition={{ type: "spring", stiffness: 140, damping: 20 }}
      />
    </motion.div>
  );
}
