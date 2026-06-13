import { useRef } from "react";
import { motion, useScroll, useTransform, type Variants } from "motion/react";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.15 } },
};

const charVariant: Variants = {
  hidden: { y: "115%" },
  show: { y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
};

function AnimatedWord({ text }: { text: string }) {
  return (
    <>
      {Array.from(text).map((char, i) => (
        <motion.span
          key={`${char}-${i}`}
          className="inline-block will-change-transform"
          variants={charVariant}
        >
          {char}
        </motion.span>
      ))}
    </>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.16]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const blobA = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const blobB = useTransform(scrollYProgress, [0, 1], [0, 90]);

  return (
    <section id="top" className="relative flex min-h-svh items-center overflow-hidden" ref={ref}>
      <div className="absolute inset-0 z-0">
        <motion.div
          className="absolute -top-[8vw] -right-[6vw] size-[46vw] rounded-full bg-[radial-gradient(circle_at_30%_30%,var(--color-terracotta),transparent_70%)] opacity-55 blur-[40px] will-change-transform"
          style={{ y: blobA }}
        />
        <motion.div
          className="absolute -bottom-[10vw] -left-[8vw] size-[38vw] rounded-full bg-[radial-gradient(circle_at_60%_40%,var(--color-green),transparent_70%)] opacity-40 blur-[40px] will-change-transform"
          style={{ y: blobB }}
        />
      </div>

      <motion.div className="wrap relative z-[2] w-full" style={{ scale, y, opacity }}>
        <motion.span
          className="eyebrow mb-[clamp(20px,4vh,40px)] text-terracotta-deep"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.8 }}
        >
          Independent design &amp; motion studio — est. 2018
        </motion.span>

        <motion.h1
          className="font-display text-hero"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <span className="block overflow-hidden">
            <AnimatedWord text="NEBULA" />
          </span>
          <span className="block overflow-hidden font-[360] text-terracotta italic">
            <AnimatedWord text="studio" />
          </span>
        </motion.h1>

        <motion.div
          className="mt-[clamp(40px,8vh,88px)] flex flex-wrap items-end justify-between gap-[clamp(18px,5vw,64px)]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 1 }}
        >
          <p className="max-w-[34ch] text-[clamp(1rem,1.4vw,1.18rem)] text-ink-soft">
            We craft motion-led brands and digital places people don&apos;t want to leave — from a
            sunlit studio in Lisbon.
          </p>
          <div className="flex gap-[clamp(16px,3vw,40px)] font-mono text-[0.74rem] tracking-[0.16em] text-muted uppercase">
            <span>Lisbon · 38.7°N</span>
            <span>Open for 2026</span>
            <span className="inline-flex items-center gap-[0.6em]">
              <motion.span
                className="inline-block h-9 w-px origin-top bg-terracotta"
                animate={{ scaleY: [1, 0.3, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
              Scroll
            </span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
