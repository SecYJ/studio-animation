import { useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from "motion/react";

type Accent = "strike" | "underline";

interface Token {
  text: string;
  accent?: Accent;
}

const statement: Token[] = [
  { text: "We" },
  { text: "believe" },
  { text: "the" },
  { text: "best" },
  { text: "work" },
  { text: "feels" },
  { text: "less" },
  { text: "like" },
  { text: "a" },
  { text: "website", accent: "strike" },
  { text: "and" },
  { text: "more" },
  { text: "like" },
  { text: "a" },
  { text: "place", accent: "underline" },
  { text: "you" },
  { text: "didn’t" },
  { text: "want" },
  { text: "to" },
  { text: "leave." },
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

/* scrub timeline (fractions of the pinned scroll) */
const REVEAL_START = 0.04;
const REVEAL_END = 0.72;

/** wraps v into [min, max) so the marquee loops seamlessly */
function wrap(min: number, max: number, v: number) {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
}

/** One word of the statement — lights up over its slice of the scrub,
 *  then draws its strike/underline decoration just after. */
function Word({
  token,
  progress,
  range,
}: {
  token: Token;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const reduce = useReducedMotion();
  const opacity = useTransform(progress, range, [0.12, 1]);
  const y = useTransform(progress, range, ["0.16em", "0em"]);
  const decoScale = useTransform(progress, [range[1], range[1] + 0.05], [0, 1]);

  const accentClass =
    token.accent === "strike"
      ? "text-terracotta italic"
      : token.accent === "underline"
        ? "text-green italic"
        : "";

  return (
    <motion.span
      className={`relative mr-[0.26em] inline-block will-change-transform ${accentClass}`}
      style={reduce ? undefined : { opacity, y }}
    >
      {token.text}
      {token.accent === "strike" && (
        <motion.span
          aria-hidden="true"
          className="absolute top-[56%] left-[-0.05em] h-[0.045em] w-[calc(100%+0.1em)] origin-left rounded-full bg-terracotta-deep"
          style={{ scaleX: reduce ? 1 : decoScale }}
        />
      )}
      {token.accent === "underline" && (
        <motion.span
          aria-hidden="true"
          className="absolute bottom-[-0.04em] left-0 h-[0.05em] w-full origin-left rounded-full bg-green"
          style={{ scaleX: reduce ? 1 : decoScale }}
        />
      )}
    </motion.span>
  );
}

/** Marquee that drifts on its own, then speeds up, skews, and even reverses
 *  with the user's scroll velocity. */
function VelocityMarquee() {
  const reduce = useReducedMotion();
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(velocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [-1500, 0, 1500], [-4, 0, 4], {
    clamp: false,
  });
  const skewX = useTransform(smoothVelocity, [-1500, 1500], [5, -5]);
  const direction = useRef(1);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    const vf = velocityFactor.get();
    if (vf < 0) direction.current = -1;
    else if (vf > 0) direction.current = 1;
    const moveBy = direction.current * 3 * (delta / 1000) * (1 + Math.abs(vf));
    baseX.set(wrap(-50, 0, baseX.get() - moveBy));
  });

  const x = useTransform(baseX, (v) => `${v}%`);

  return (
    <div
      className="overflow-hidden border-y border-line py-[18px] whitespace-nowrap [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] [-webkit-mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]"
      aria-hidden="true"
    >
      <motion.div className="inline-flex will-change-transform" style={{ x, skewX }}>
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
  );
}

export function Manifesto() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const step = (REVEAL_END - REVEAL_START) / statement.length;

  const revealProgress = useTransform(scrollYProgress, [REVEAL_START, REVEAL_END], [0, 1]);
  const barScale = useSpring(revealProgress, { stiffness: 140, damping: 26 });
  const pctText = useTransform(revealProgress, (v) => String(Math.round(v * 100)).padStart(3, "0"));

  const paraOpacity = useTransform(scrollYProgress, [0.74, 0.88], [0, 1]);
  const paraY = useTransform(scrollYProgress, [0.74, 0.88], [28, 0]);
  const watermarkY = useTransform(scrollYProgress, [0, 1], ["6%", "-14%"]);

  return (
    <section
      className={`relative border-y border-line bg-cream-deep ${reduce ? "" : "h-[300vh]"}`}
      ref={ref}
    >
      <div
        className={
          reduce
            ? "relative flex flex-col justify-center overflow-hidden py-[clamp(96px,14vh,180px)]"
            : "sticky top-0 flex h-svh flex-col justify-center overflow-hidden"
        }
      >
        <motion.span
          className="pointer-events-none absolute top-[4%] right-[-0.06em] font-display text-mega text-ink/5 select-none"
          style={reduce ? undefined : { y: watermarkY }}
          aria-hidden="true"
        >
          02
        </motion.span>

        <div className="wrap relative z-1">
          <div className="mb-[clamp(28px,5vh,56px)] flex items-center gap-[clamp(16px,3vw,32px)]">
            <span className="eyebrow shrink-0 text-terracotta-deep">Manifesto</span>
            <motion.span
              className="h-px flex-1 origin-left bg-ink/20"
              style={{ scaleX: reduce ? 1 : barScale }}
            />
            <span className="shrink-0 font-mono text-[0.72rem] tracking-[0.16em] text-muted">
              {reduce ? "100" : <motion.span>{pctText}</motion.span>}%
            </span>
          </div>

          <h2 className="max-w-[22ch] font-display text-statement">
            {statement.map((token, i) => {
              const start = REVEAL_START + i * step;
              return (
                <Word
                  key={i}
                  token={token}
                  progress={scrollYProgress}
                  range={[start, start + step * 2]}
                />
              );
            })}
          </h2>

          <motion.p
            className="mt-[clamp(32px,6vh,64px)] max-w-[40ch] text-ink-soft"
            style={reduce ? undefined : { opacity: paraOpacity, y: paraY }}
          >
            A small, senior team obsessed with the feel of things — the weight of a transition, the
            rhythm of a scroll, the half-second that makes someone smile.
          </motion.p>
        </div>

        <div className={reduce ? "mt-[clamp(56px,9vh,110px)]" : "absolute inset-x-0 bottom-0"}>
          <VelocityMarquee />
        </div>
      </div>
    </section>
  );
}
