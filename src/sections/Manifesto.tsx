import { motion, type Variants } from "motion/react";

const lines = [
  <>We believe the best work</>,
  <>
    feels less like a <em>website</em>
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
    <section className="section manifesto">
      <div className="wrap">
        <motion.h2
          className="manifesto__lines"
          variants={lineContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-20% 0px" }}
        >
          {lines.map((line, i) => (
            <span className="m-line" key={i}>
              <motion.span className="m-line__inner" variants={lineVariant}>
                {line}
              </motion.span>
            </span>
          ))}
        </motion.h2>

        <motion.p
          className="manifesto__aside"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          A small, senior team obsessed with the feel of things — the weight of a transition, the
          rhythm of a scroll, the half-second that makes someone smile.
        </motion.p>
      </div>

      <div className="marquee" aria-hidden="true">
        <motion.div
          className="marquee__track"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        >
          {[...marqueeWords, ...marqueeWords].map((word, i) => (
            <span className="marquee__item" key={i}>
              {word}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
