import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";

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
    <section id="process" className="section process" ref={ref}>
      <div className="wrap process__grid">
        <div className="process__sticky">
          <span className="eyebrow" style={{ color: "var(--terracotta)" }}>
            How we work
          </span>
          <div className="process__num">{String(active + 1).padStart(2, "0")}</div>
          <motion.div
            key={active}
            className="process__active"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {steps[active].title}
          </motion.div>
        </div>

        <div className="process__steps">
          {steps.map((step, i) => (
            <motion.div
              className="step"
              key={step.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30% 0px" }}
              transition={{ duration: 0.7 }}
            >
              <span className="step__n">{String(i + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
