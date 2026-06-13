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
        <motion.span key={`${char}-${i}`} className="hero__char" variants={charVariant}>
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
    <section id="top" className="hero" ref={ref}>
      <div className="hero__bg">
        <motion.div className="blob blob--a" style={{ y: blobA }} />
        <motion.div className="blob blob--b" style={{ y: blobB }} />
      </div>

      <motion.div className="hero__content wrap" style={{ scale, y, opacity }}>
        <motion.span
          className="eyebrow hero__eyebrow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.8 }}
        >
          Independent design &amp; motion studio — est. 2018
        </motion.span>

        <motion.h1 className="hero__title" variants={container} initial="hidden" animate="show">
          <span className="hero__line">
            <AnimatedWord text="NEBULA" />
          </span>
          <span className="hero__line hero__line--accent">
            <AnimatedWord text="studio" />
          </span>
        </motion.h1>

        <motion.div
          className="hero__foot"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 1 }}
        >
          <p className="hero__tagline">
            We craft motion-led brands and digital places people don&apos;t want to leave — from a
            sunlit studio in Lisbon.
          </p>
          <div className="hero__meta">
            <span>Lisbon · 38.7°N</span>
            <span>Open for 2026</span>
            <span className="hero__cue">
              <motion.span
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
