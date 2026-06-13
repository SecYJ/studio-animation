import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

export function CTA() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start center"],
  });

  // Function-form transforms stay on Motion's JS path, avoiding the native
  // ScrollTimeline desync that collapses the reveal at the page-bottom boundary.
  const scale = useTransform(scrollYProgress, (p) => 0.78 + Math.min(1, p / 0.85) * 0.22);
  const opacity = useTransform(scrollYProgress, (p) => Math.min(1, p / 0.6));

  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-ink py-[clamp(96px,14vh,180px)] text-center text-paper"
      ref={ref}
    >
      <motion.div
        className="wrap flex flex-col items-center gap-[clamp(28px,5vh,48px)] will-change-transform"
        style={{ scale, opacity }}
      >
        <span className="eyebrow text-terracotta">Let&apos;s talk</span>
        <h2 className="max-w-[14ch] text-cta">
          Let&apos;s make something <em className="text-terracotta italic">worth scrolling</em> for.
        </h2>
        <a
          className="border-b border-[rgb(244_237_225_/_0.4)] pb-1 font-display text-[clamp(1.4rem,3vw,2.4rem)] italic transition-colors hover:border-terracotta hover:text-terracotta"
          href="mailto:hello@nebula.studio"
        >
          hello@nebula.studio
        </a>

        <div className="mt-[clamp(60px,12vh,130px)] flex w-full flex-wrap justify-between gap-x-[clamp(20px,5vw,60px)] gap-y-[14px] border-t border-[rgb(244_237_225_/_0.2)] pt-6 font-mono text-[0.74rem] tracking-[0.14em] text-[rgb(244_237_225_/_0.6)] uppercase">
          <span>Nebula Studio © 2026</span>
          <span>Lisbon · Remote worldwide</span>
          <span>Instagram — Are.na — LinkedIn</span>
        </div>
      </motion.div>
    </section>
  );
}
