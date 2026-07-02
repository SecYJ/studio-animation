import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Motes } from "../components/Motes";

/** The studio at night: a moon climbs as the section scrolls in,
 *  embers drift in the dark, and the email link strikes like a match. */
export function CTA() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start center"],
  });

  // Function-form transforms stay on Motion's JS path, avoiding the native
  // ScrollTimeline desync that collapses the reveal at the page-bottom boundary.
  const scale = useTransform(scrollYProgress, (p) => 0.78 + Math.min(1, p / 0.85) * 0.22);
  const opacity = useTransform(scrollYProgress, (p) => Math.min(1, p / 0.6));
  const moonY = useTransform(scrollYProgress, (p) => (1 - Math.min(1, p / 0.9)) * 110);
  const moonOpacity = useTransform(scrollYProgress, (p) => Math.min(1, p / 0.75));

  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-ink py-[clamp(96px,14vh,180px)] text-center text-paper"
      ref={ref}
    >
      {!reduce && (
        <>
          {/* moonrise — the quiet counterpart to the hero's afternoon sun */}
          <motion.div
            className="pointer-events-none absolute top-[9%] right-[10%] size-[clamp(48px,5vw,76px)] will-change-transform"
            style={{ y: moonY, opacity: moonOpacity }}
            aria-hidden="true"
          >
            <div
              className="size-full rounded-full"
              style={{
                background: "radial-gradient(circle at 36% 32%, #fbf6ec, #b8ae9a 75%)",
                boxShadow: "0 0 44px rgb(244 237 225 / 0.3)",
              }}
            />
            {/* offset shadow disc carves the crescent */}
            <div className="absolute top-[-7%] left-[16%] size-[92%] rounded-full bg-ink/90" />
          </motion.div>
          <Motes variant="ember" count={10} seed={57} />
        </>
      )}

      <motion.div
        className="wrap relative z-2 flex flex-col items-center gap-[clamp(28px,5vh,48px)] will-change-transform"
        style={{ scale, opacity }}
      >
        <span className="eyebrow text-terracotta">Let&apos;s talk</span>
        <h2 className="max-w-[14ch] text-cta">
          Let&apos;s make something <em className="text-terracotta italic">worth scrolling</em> for.
        </h2>
        <a
          className="match-link font-display text-[clamp(1.4rem,3vw,2.4rem)] italic"
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
