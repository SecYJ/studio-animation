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
    <section id="studio" className="relative bg-paper py-[clamp(96px,14vh,180px)]">
      <div className="wrap">
        <div className="max-w-[60ch]">
          <span className="eyebrow text-terracotta-deep">By the numbers</span>
          <h2 className="mt-[0.4em] text-display">
            Small studio, <em className="text-terracotta italic">loud</em> output.
          </h2>
        </div>

        <div className="mt-[clamp(40px,7vh,72px)] grid grid-cols-4 gap-[clamp(20px,3vw,48px)] max-[720px]:grid-cols-2">
          {stats.map((stat, i) => (
            <motion.div
              className="border-t border-line pt-[18px] will-change-transform"
              key={stat.label}
              /* each figure stamps down like a rubber stamp on paper, settling
                 a touch crooked — the springy overshoot sells the thump */
              initial={{ opacity: 0, scale: 1.7, rotate: (i % 2 ? 1 : -1) * 5 }}
              whileInView={{ opacity: 1, scale: 1, rotate: (i % 2 ? -1 : 1) * 1.1 }}
              viewport={{ once: true, margin: "-12% 0px" }}
              transition={{ type: "spring", stiffness: 340, damping: 19, delay: 0.15 + i * 0.11 }}
            >
              <div className="flex items-baseline font-display text-stat">
                <CountUp to={stat.value} />
                <span className="text-terracotta">{stat.suffix}</span>
              </div>
              <div className="mt-[14px] font-mono text-[0.76rem] tracking-[0.16em] text-muted uppercase">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
