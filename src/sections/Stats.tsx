import { useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

const stats = [
  { value: 120, suffix: "+", label: "Projects shipped" },
  { value: 8, suffix: "", label: "Years independent" },
  { value: 32, suffix: "", label: "Happy clients" },
  { value: 11, suffix: "", label: "Awards & nods" },
];

/** One wheel of the odometer. Rests on 0, then rolls `steps` cells down —
 *  full revolutions plus the target digit — whenever `steps` grows. */
function OdometerColumn({
  steps,
  duration,
  delay,
}: {
  steps: number;
  duration: number;
  delay: number;
}) {
  return (
    <span className="inline-block h-[1em] overflow-hidden">
      <motion.span
        className="block will-change-transform"
        animate={{ y: `${-steps}em` }}
        transition={{ duration, ease: EASE, delay }}
      >
        {Array.from({ length: steps + 1 }, (_, i) => (
          <span className="block h-[1em] leading-[1em]" key={i}>
            {i % 10}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

/** Mechanical counter: every digit is its own wheel. Wheels further right
 *  spin through more revolutions (like a real odometer) and settle later,
 *  cascading left → right. Hovering rolls the whole figure one more turn. */
function OdometerFigure({
  value,
  suffix,
  delayBase,
}: {
  value: number;
  suffix: string;
  delayBase: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  const [extraTurns, setExtraTurns] = useState(0);
  const digits = String(value).split("").map(Number);
  const stampDelay = delayBase + 1.2 + (digits.length - 1) * 0.28;

  if (reduce) {
    return (
      <div className="flex items-center font-display text-stat lining-nums tabular-nums">
        {value}
        <span className="text-terracotta">{suffix}</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center font-display text-stat lining-nums tabular-nums"
      ref={ref}
      onMouseEnter={() => setExtraTurns((turns) => Math.min(turns + 10, 40))}
    >
      {digits.map((digit, i) => (
        <OdometerColumn
          key={i}
          steps={inView ? (2 + i) * 10 + digit + extraTurns : 0}
          duration={1.2 + i * 0.28}
          delay={extraTurns ? 0 : delayBase}
        />
      ))}
      {suffix && (
        <motion.span
          className="text-terracotta will-change-transform"
          initial={{ opacity: 0, scale: 2.2, rotate: -14 }}
          animate={inView ? { opacity: 1, scale: 1, rotate: 0 } : undefined}
          transition={{ type: "spring", stiffness: 320, damping: 15, delay: stampDelay }}
        >
          {suffix}
        </motion.span>
      )}
    </div>
  );
}

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
              className="will-change-transform"
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0, rotate: (i % 2 ? -1 : 1) * 0.9 }}
              viewport={{ once: true, margin: "-12% 0px" }}
              transition={{ duration: 0.7, ease: EASE, delay: i * 0.1 }}
            >
              <motion.span
                className="block h-px origin-left bg-ink/20"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: "-12% 0px" }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.1 + i * 0.1 }}
              />
              <div className="pt-[18px]">
                <OdometerFigure
                  value={stat.value}
                  suffix={stat.suffix}
                  delayBase={0.2 + i * 0.12}
                />
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
