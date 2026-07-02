import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

const steps = [
  {
    title: "Discover",
    body: "We dig into your story, your market and your ambition — then map the emotional arc the experience should follow.",
  },
  {
    title: "Define",
    body: "Strategy turns into a creative direction: the look, the motion language, the few ideas worth betting on.",
  },
  {
    title: "Design",
    body: "We design in motion from day one, prototyping the feel of every transition until it disappears into instinct.",
  },
  {
    title: "Deliver",
    body: "We build it for real — fast, accessible and pixel-honest — then hand you the keys and a system to grow with.",
  },
];

export function Process() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const index = Math.min(steps.length - 1, Math.floor(p * steps.length));
    setActive(index);
  });

  return (
    <section
      id="process"
      className="relative bg-green py-[clamp(96px,14vh,180px)] text-paper"
      ref={ref}
    >
      <div className="wrap grid grid-cols-[0.85fr_1.15fr] gap-[clamp(24px,5vw,80px)] max-[820px]:grid-cols-1">
        <div className="sticky top-0 flex h-svh flex-col justify-center gap-[18px] max-[820px]:static max-[820px]:h-auto max-[820px]:pt-10">
          <span className="eyebrow text-terracotta">How we work</span>
          {/* pencil-sketch counter: the old number is "erased" (blurs away),
              the new one lands and gets a hand-drawn circle around it */}
          <div className="relative inline-block self-start">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={active}
                className="font-display text-mega text-transparent [-webkit-text-stroke:1.6px_rgb(244_237_225_/_0.55)]"
                initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -20, filter: "blur(14px)" }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                {String(active + 1).padStart(2, "0")}
              </motion.div>
            </AnimatePresence>
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute top-[-7%] left-[-10%] h-[114%] w-[124%] -rotate-3"
              viewBox="0 0 100 60"
              preserveAspectRatio="none"
            >
              <motion.ellipse
                key={active}
                cx="50"
                cy="30"
                rx="46"
                ry="25"
                fill="none"
                stroke="var(--color-terracotta)"
                strokeWidth={2}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.85 }}
                transition={{ delay: 0.28, duration: 0.7, ease: EASE }}
              />
            </svg>
          </div>
          <motion.div
            key={active}
            className="font-display text-lead text-terracotta italic"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {steps[active].title}
          </motion.div>
        </div>

        <div className="flex flex-col">
          {steps.map((step, i) => (
            <motion.div
              className="border-t border-[rgb(244_237_225_/_0.22)] py-[clamp(34px,9vh,78px)] last:border-b"
              key={step.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30% 0px" }}
              transition={{ duration: 0.7 }}
            >
              <span className="font-mono text-[0.78rem] tracking-[0.2em] text-terracotta">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-[10px] mb-[14px] text-lead text-paper">{step.title}</h3>
              <p className="max-w-[42ch] text-[rgb(244_237_225_/_0.82)]">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
