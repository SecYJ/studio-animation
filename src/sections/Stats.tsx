import { motion } from "motion/react";
import { CountUp } from "../components/CountUp";

const stats = [
  { value: 120, suffix: "+", label: "Projects shipped" },
  { value: 8, suffix: "", label: "Years independent" },
  { value: 32, suffix: "", label: "Happy clients" },
  { value: 11, suffix: "", label: "Awards & nods" },
];

export function Stats() {
  return (
    <section id="studio" className="section stats">
      <div className="wrap">
        <div className="section__head">
          <span className="eyebrow">By the numbers</span>
          <h2 className="section__title">
            Small studio, <em style={{ fontStyle: "italic", color: "var(--terracotta)" }}>loud</em>{" "}
            output.
          </h2>
        </div>

        <div className="stats__grid">
          {stats.map((stat, i) => (
            <motion.div
              className="stat"
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-12% 0px" }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
            >
              <div className="stat__num">
                <CountUp to={stat.value} />
                <span className="stat__suffix">{stat.suffix}</span>
              </div>
              <div className="stat__label">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
