import { motion, type Variants } from "motion/react";

const lines = [
  <>We believe the best work</>,
  <>
    feels less like a <em className="text-terracotta">website</em>
  </>,
  <>and more like a place</>,
  <>you didn&apos;t want to leave.</>,
];

const marqueeWords = [
  "Brand",
  "Motion",
  "Web",
  "Art Direction",
  "Identity",
  "Interaction",
  "Type",
  "3D",
];

const lineContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const lineVariant: Variants = {
  hidden: { y: "110%" },
  show: { y: 0, transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } },
};

export function Manifesto() {
  return (
    <section className="relative overflow-hidden border-y border-line bg-cream-deep py-[clamp(96px,14vh,180px)]">
      <div className="wrap">
        <motion.h2
          className="max-w-[18ch] font-display text-statement"
          variants={lineContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-20% 0px" }}
        >
          {lines.map((line, i) => (
            <span className="block overflow-hidden" key={i}>
              <motion.span className="block will-change-transform" variants={lineVariant}>
                {line}
              </motion.span>
            </span>
          ))}
        </motion.h2>

        <motion.p
          className="mt-[clamp(40px,7vh,80px)] max-w-[40ch] text-ink-soft"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          A small, senior team obsessed with the feel of things — the weight of a transition, the
          rhythm of a scroll, the half-second that makes someone smile.
        </motion.p>
      </div>

      <div
        className="mt-[clamp(56px,9vh,110px)] overflow-hidden border-y border-line py-[18px] whitespace-nowrap [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] [-webkit-mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]"
        aria-hidden="true"
      >
        <motion.div
          className="inline-flex will-change-transform"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        >
          {[...marqueeWords, ...marqueeWords].map((word, i) => (
            <span
              className="inline-flex items-center px-[0.5em] font-display text-marquee font-[380] text-ink italic after:ml-[0.7em] after:text-[0.62em] after:text-terracotta after:not-italic after:content-['✳']"
              key={i}
            >
              {word}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
