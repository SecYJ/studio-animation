import { useRef, useState } from "react";
import {
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useMediaQuery } from "../lib/useMediaQuery";

const EASE = [0.22, 1, 0.36, 1] as const;

/* the moment the ink of the "8" floods the viewport and the vault opens */
const COVERED_AT = 0.52;

const stats = [
  { value: 120, suffix: "+", label: "Projects out the door" },
  { value: 29, suffix: "", label: "Clients who came back" },
  { value: 11, suffix: "", label: "Awards on the shelf" },
  { value: 0, suffix: "", label: "Templates used, ever" },
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

/** Mechanical counter: every digit is its own wheel; wheels further right
 *  spin through more revolutions and settle later. The zero stat spins two
 *  full turns and lands right back on 0 — that's the joke. Hovering rolls
 *  the whole figure one more turn. */
function OdometerFigure({
  value,
  suffix,
  delayBase,
  play,
}: {
  value: number;
  suffix: string;
  delayBase: number;
  play: boolean;
}) {
  const reduce = useReducedMotion();
  const [extraTurns, setExtraTurns] = useState(0);
  const digits = String(value).split("").map(Number);
  const stampDelay = delayBase + 1.2 + (digits.length - 1) * 0.28;

  if (reduce) {
    return (
      <div className="flex items-center font-display text-stat text-paper lining-nums tabular-nums">
        {value}
        <span className="text-gold">{suffix}</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center font-display text-stat text-paper lining-nums tabular-nums"
      onMouseEnter={() => setExtraTurns((turns) => Math.min(turns + 10, 40))}
    >
      {digits.map((digit, i) => (
        <OdometerColumn
          key={i}
          steps={play ? (2 + i) * 10 + digit + extraTurns : 0}
          duration={1.2 + i * 0.28}
          delay={extraTurns ? 0 : delayBase}
        />
      ))}
      {suffix && (
        <motion.span
          className="text-gold will-change-transform"
          initial={false}
          animate={
            play ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 2.2, rotate: -14 }
          }
          transition={{ type: "spring", stiffness: 320, damping: 15, delay: play ? stampDelay : 0 }}
        >
          {suffix}
        </motion.span>
      )}
    </div>
  );
}

/** Inside the eight: the studio's ledger vault, deep green with gold trim.
 *  Everything enters only once the ink has flooded the screen. */
function VaultScene({ entered }: { entered: boolean }) {
  return (
    <div className="relative flex h-full flex-col justify-center overflow-hidden bg-green-deep text-paper">
      {/* ledger-paper dot grid */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: "radial-gradient(rgb(251 246 236 / 0.13) 1px, transparent 1.5px)",
          backgroundSize: "30px 30px",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute top-[-30%] right-[-15%] aspect-square w-[50vw] rounded-full"
        style={{
          background: "radial-gradient(closest-side, rgb(255 219 166 / 0.09), transparent 72%)",
        }}
        aria-hidden="true"
      />

      <div className="wrap relative">
        <motion.span
          className="eyebrow text-gold"
          initial={false}
          animate={entered ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.55, ease: EASE, delay: entered ? 0.1 : 0 }}
        >
          The receipts
        </motion.span>

        <div className="overflow-hidden pb-[0.1em]">
          <motion.h2
            className="mt-[0.35em] max-w-[16ch] text-headline will-change-transform"
            initial={false}
            animate={entered ? { y: "0%" } : { y: "115%" }}
            transition={{ duration: 0.8, ease: EASE, delay: entered ? 0.18 : 0 }}
          >
            Counted the <em className="text-gold italic">slow</em> way.
          </motion.h2>
        </div>

        <div className="mt-[clamp(36px,6vh,64px)] grid grid-cols-4 gap-[clamp(20px,3vw,48px)] max-[1050px]:grid-cols-2">
          {stats.map((stat, i) => (
            <div key={stat.label}>
              <motion.span
                className="block h-px origin-left bg-gold/40"
                initial={false}
                animate={entered ? { scaleX: 1 } : { scaleX: 0 }}
                transition={{ duration: 0.8, ease: EASE, delay: entered ? 0.25 + i * 0.09 : 0 }}
              />
              <motion.div
                className="pt-[18px]"
                initial={false}
                animate={entered ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                transition={{ duration: 0.6, ease: EASE, delay: entered ? 0.3 + i * 0.1 : 0 }}
              >
                <OdometerFigure
                  value={stat.value}
                  suffix={stat.suffix}
                  delayBase={0.4 + i * 0.12}
                  play={entered}
                />
                <div className="mt-[14px] font-mono text-[0.74rem] tracking-[0.16em] text-paper/60 uppercase">
                  {stat.label}
                </div>
              </motion.div>
            </div>
          ))}
        </div>

        <motion.p
          className="mt-[clamp(36px,6vh,60px)] font-mono text-[0.72rem] tracking-[0.2em] text-paper/40 uppercase"
          initial={false}
          animate={entered ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, delay: entered ? 1.5 : 0 }}
        >
          No vanity metrics — every figure counted the slow way.
        </motion.p>
      </div>
    </div>
  );
}

/** Zoom portal, type edition: a giant ink "8" on daylight paper; scrolling
 *  dives the camera into the glyph's waist until ink floods the screen,
 *  then the vault inside plays its entrance. Transform + opacity only. */
function StatsZoom() {
  const ref = useRef<HTMLElement>(null);
  const [entered, setEntered] = useState(false);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  /* geometric zoom: linear scale would flood the screen almost immediately —
     exponential growth keeps the perceived dive speed constant, so the ink
     hits full coverage exactly as the vault fades in */
  const zoomT = useTransform(scrollYProgress, [0.06, COVERED_AT], [0, 1]);
  const glyphScale = useTransform(zoomT, (t) => Math.pow(85, t));
  const glyphRotate = useTransform(zoomT, (t) => t * -8);
  const outerScale = useTransform(scrollYProgress, [0, 0.34], [1, 1.12]);
  const outerOpacity = useTransform(scrollYProgress, [0.1, 0.3], [1, 0]);
  const sceneOpacity = useTransform(
    scrollYProgress,
    [COVERED_AT - 0.03, COVERED_AT + 0.04],
    [0, 1],
  );

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const inside = p >= COVERED_AT;
    setEntered((prev) => (prev === inside ? prev : inside));
  });

  return (
    <section id="studio" className="relative h-[380vh] bg-cream" ref={ref}>
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* daylight side: one cocky sentence and the door */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-between py-[clamp(80px,12vh,140px)] text-ink will-change-transform"
          style={{ scale: outerScale, opacity: outerOpacity }}
        >
          <div className="flex flex-col items-center gap-[14px] text-center">
            <span className="eyebrow text-terracotta-deep">Receipts</span>
            <h2 className="text-display">
              Talk is <em className="text-terracotta italic">cheap.</em>
            </h2>
          </div>
          <span className="font-mono text-[0.72rem] tracking-[0.24em] text-muted uppercase">
            Eight years of receipts inside — keep scrolling
          </span>
        </motion.div>

        {/* the door itself: dive into the waist of the eight */}
        <motion.div
          className="pointer-events-none absolute inset-0 flex items-center justify-center will-change-transform"
          style={{ scale: glyphScale, rotate: glyphRotate }}
          aria-hidden="true"
        >
          <span className="font-display text-[min(46vh,36vw)] leading-none font-[460] text-ink">
            8
          </span>
        </motion.div>

        {/* the vault, revealed once the ink covers everything */}
        <motion.div
          className="absolute inset-0"
          style={{ opacity: sceneOpacity, pointerEvents: entered ? "auto" : "none" }}
        >
          <VaultScene entered={entered} />
        </motion.div>
      </div>
    </section>
  );
}

/** self-contained figure for the stacked fallback: plays when scrolled into view */
function FigureOnView({
  value,
  suffix,
  delayBase,
}: {
  value: number;
  suffix: string;
  delayBase: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  return (
    <div ref={ref}>
      <OdometerFigure value={value} suffix={suffix} delayBase={delayBase} play={inView} />
    </div>
  );
}

/** Calm fallback for touch, small screens and reduced motion: the vault as a
 *  plain section, wheels rolling as they scroll into view. */
function StatsStacked() {
  return (
    <section
      id="studio"
      className="relative overflow-hidden bg-green-deep py-[clamp(80px,12vh,130px)] text-paper"
    >
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: "radial-gradient(rgb(251 246 236 / 0.13) 1px, transparent 1.5px)",
          backgroundSize: "30px 30px",
        }}
        aria-hidden="true"
      />
      <div className="wrap relative">
        <span className="eyebrow text-gold">The receipts</span>
        <h2 className="mt-[0.35em] max-w-[16ch] text-headline">
          Counted the <em className="text-gold italic">slow</em> way.
        </h2>

        <div className="mt-[clamp(36px,6vh,64px)] grid grid-cols-2 gap-[clamp(24px,4vw,48px)] max-[560px]:grid-cols-1">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-12% 0px" }}
              transition={{ duration: 0.65, ease: EASE, delay: (i % 2) * 0.1 }}
            >
              <span className="block h-px bg-gold/40" />
              <div className="pt-[18px]">
                <FigureOnView value={stat.value} suffix={stat.suffix} delayBase={0.2} />
              </div>
              <div className="mt-[14px] font-mono text-[0.74rem] tracking-[0.16em] text-paper/60 uppercase">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>

        <p className="mt-[clamp(36px,6vh,60px)] font-mono text-[0.72rem] tracking-[0.2em] text-paper/40 uppercase">
          No vanity metrics — every figure counted the slow way.
        </p>
      </div>
    </section>
  );
}

export function Stats() {
  const reduce = useReducedMotion();
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const narrow = useMediaQuery("(max-width: 899px)");
  return reduce || coarsePointer || narrow ? <StatsStacked /> : <StatsZoom />;
}
