import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

export function CTA() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end end"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.8], [0.78, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1]);

  return (
    <section id="contact" className="section cta" ref={ref}>
      <motion.div className="wrap cta__inner" style={{ scale, opacity }}>
        <span className="eyebrow" style={{ color: "var(--terracotta)" }}>
          Let&apos;s talk
        </span>
        <h2 className="cta__title">
          Let&apos;s make something <em>worth scrolling</em> for.
        </h2>
        <a className="cta__mail" href="mailto:hello@nebula.studio">
          hello@nebula.studio
        </a>

        <div className="cta__foot">
          <span>Nebula Studio © 2026</span>
          <span>Lisbon · Remote worldwide</span>
          <span>Instagram — Are.na — LinkedIn</span>
        </div>
      </motion.div>
    </section>
  );
}
