import { type PointerEvent, useEffect, useRef, useState } from "react";
import {
  motion,
  type MotionValue,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { Blob } from "../components/Blob";
import { Motes } from "../components/Motes";
import { jitter } from "../lib/jitter";

const EASE = [0.22, 1, 0.36, 1] as const;
const CHAR_DELAY = 0.25; // s before the first letter lands
const CHAR_STAGGER = 0.05; // s between letters

type SharedMotion = {
  scrollProgress: MotionValue<number>;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
};

type HeroCharProps = SharedMotion & {
  char: string;
  /** global index across both lines, for stagger + scatter */
  index: number;
  baseWeight: number;
  wonk?: boolean;
};

/** One headline letter. Blur-rises on load, swells in weight near the cursor
 *  (Fraunces variable axes), and scatters away with its own drift on scroll. */
function HeroChar({
  char,
  index,
  baseWeight,
  wonk,
  scrollProgress,
  mouseX,
  mouseY,
}: HeroCharProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);

  /* cursor proximity 0..1 — only recomputes while the pointer moves.
     Read the motion values before any early return so dependency tracking sees them. */
  const prox = useTransform(() => {
    const mx = mouseX.get();
    const my = mouseY.get();
    const el = ref.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const dx = mx - (r.left + r.width / 2);
    const dy = my - (r.top + r.height / 2);
    const radius = Math.max(220, window.innerWidth * 0.13);
    return Math.max(0, 1 - Math.hypot(dx, dy) / radius);
  });
  const glow = useSpring(prox, { stiffness: 170, damping: 20 });

  const fontVariationSettings = useTransform(
    glow,
    (p) =>
      `"opsz" 144, "wght" ${Math.round(baseWeight + p * 240)}, "SOFT" ${Math.round(p * 55)}` +
      (wonk ? `, "WONK" 1` : ""),
  );
  const lift = useTransform(glow, (p) => p * -9);

  /* on scroll-out each letter drifts on its own arc, like paper scraps in a draught */
  const j = jitter(index);
  const scatterY = useTransform(scrollProgress, [0, 1], [0, 70 + j * 190]);
  const scatterX = useTransform(scrollProgress, [0, 1], [0, (j - 0.5) * 240]);
  const scatterRotate = useTransform(scrollProgress, [0, 1], [0, (j - 0.5) * 46]);

  return (
    <motion.span
      className="inline-block will-change-transform"
      style={reduce ? undefined : { y: scatterY, x: scatterX, rotate: scatterRotate }}
    >
      <motion.span
        className="inline-block"
        initial={reduce ? false : { y: "70%", opacity: 0, rotate: 9, filter: "blur(14px)" }}
        animate={{ y: 0, opacity: 1, rotate: 0, filter: "blur(0px)" }}
        transition={{ duration: 1.1, ease: EASE, delay: CHAR_DELAY + index * CHAR_STAGGER }}
      >
        <motion.span
          ref={ref}
          className="inline-block"
          style={reduce ? undefined : { fontVariationSettings, y: lift }}
        >
          {char}
        </motion.span>
      </motion.span>
    </motion.span>
  );
}

/** Tall shafts of afternoon light panning slowly across the studio wall. */
function WindowLight() {
  return (
    <div className="pointer-events-none absolute inset-0 z-1 overflow-hidden" aria-hidden="true">
      <div
        className="animate-beam absolute inset-y-[-10%] left-[-20%] w-[150%] will-change-transform"
        style={{
          background:
            "linear-gradient(112deg, transparent 30%, rgb(255 232 190 / 0.34) 38%, rgb(255 232 190 / 0.1) 45%, transparent 52%, transparent 61%, rgb(255 232 190 / 0.22) 67%, transparent 74%)",
        }}
      />
    </div>
  );
}

const BADGE_TEXT = "MOTION · DESIGN · WEB · EST. 2018 · ";

/** Retro sticker: circular mono text slowly orbiting a terracotta asterisk. */
function OrbitBadge({ fade }: { fade: MotionValue<number> }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="absolute top-[15vh] right-[clamp(20px,6vw,84px)] z-3 size-[clamp(110px,13vw,170px)] max-[820px]:hidden"
      style={reduce ? undefined : { opacity: fade }}
      aria-hidden="true"
    >
      <motion.div
        className="relative size-full"
        initial={reduce ? false : { opacity: 0, scale: 0.6, rotate: -40 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ delay: 1.5, duration: 1, ease: EASE }}
      >
        <motion.svg
          viewBox="0 0 100 100"
          className="size-full"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 26, ease: "linear", repeat: Infinity }}
        >
          <defs>
            <path id="hero-badge-arc" d="M 50 50 m -40 0 a 40 40 0 1 1 80 0 a 40 40 0 1 1 -80 0" />
          </defs>
          <text
            className="font-mono uppercase"
            fill="var(--color-ink-soft)"
            fontSize="7.4"
            letterSpacing="2.5"
          >
            <textPath href="#hero-badge-arc">{BADGE_TEXT}</textPath>
          </text>
        </motion.svg>
        <motion.span
          className="absolute inset-0 grid place-items-center text-[clamp(1.5rem,2.2vw,2.2rem)] text-terracotta"
          animate={reduce ? undefined : { rotate: -360 }}
          transition={{ duration: 40, ease: "linear", repeat: Infinity }}
        >
          ✳
        </motion.span>
      </motion.div>
    </motion.div>
  );
}

const lisbonTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Lisbon",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Live studio clock — a small proof the place is real. */
function LisbonClock() {
  const [time, setTime] = useState(() => lisbonTime.format(new Date()));
  useEffect(() => {
    const id = setInterval(() => setTime(lisbonTime.format(new Date())), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">Lisbon&nbsp;·&nbsp;{time}</span>;
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  /* cursor position shared with every headline letter */
  const mouseX = useMotionValue(-9999);
  const mouseY = useMotionValue(-9999);

  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 130]);
  const opacity = useTransform(scrollYProgress, [0, 0.72], [1, 0]);
  const blobA = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const blobB = useTransform(scrollYProgress, [0, 1], [0, 90]);
  /* annotation ink dissolves before the type does */
  const inkFade = useTransform(scrollYProgress, [0, 0.35], [1, 0]);

  const handleMove = (e: PointerEvent<HTMLElement>) => {
    if (reduce) return;
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
  };
  const handleLeave = () => {
    mouseX.set(-9999);
    mouseY.set(-9999);
  };

  const shared: SharedMotion = { scrollProgress: scrollYProgress, mouseX, mouseY };

  return (
    <section
      id="top"
      className="relative flex min-h-svh items-center overflow-hidden"
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      <div className="absolute inset-0 z-0">
        <Blob
          position="top-[-8vw] right-[-6vw] size-[46vw]"
          gradient="bg-[radial-gradient(circle_at_30%_30%,var(--color-terracotta),transparent_70%)]"
          restOpacity={0.55}
          hoverOpacity={0.85}
          parallaxY={blobA}
        />
        <Blob
          position="bottom-[-10vw] left-[-8vw] size-[38vw]"
          gradient="bg-[radial-gradient(circle_at_60%_40%,var(--color-green),transparent_70%)]"
          restOpacity={0.4}
          hoverOpacity={0.68}
          parallaxY={blobB}
        />
      </div>

      {!reduce && (
        <>
          <WindowLight />
          <Motes variant="dust" count={14} />
        </>
      )}

      <OrbitBadge fade={inkFade} />

      <motion.div
        className="wrap relative z-2 w-full"
        style={reduce ? undefined : { scale, y: contentY, opacity }}
      >
        <motion.span
          className="eyebrow mb-[clamp(20px,4vh,40px)] text-terracotta-deep"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.9, ease: EASE }}
        >
          Independent design &amp; motion studio — est. 2018
        </motion.span>

        <h1 className="font-display text-hero">
          <span className="block">
            {Array.from("NEBULA").map((char, i) => (
              <HeroChar key={i} char={char} index={i} baseWeight={420} {...shared} />
            ))}
          </span>
          <span className="block">
            <span className="relative inline-block">
              <span className="relative z-1 block font-[360] [font-variation-settings:'WONK'_1] text-terracotta italic">
                {Array.from("studio").map((char, i) => (
                  <HeroChar key={i} char={char} index={6 + i} baseWeight={360} wonk {...shared} />
                ))}
              </span>
              {/* hand-drawn ink ellipse, drawn on after the letters land */}
              <motion.svg
                className="pointer-events-none absolute top-[-16%] left-[-9%] h-[134%] w-[118%] -rotate-2"
                viewBox="0 0 100 44"
                preserveAspectRatio="none"
                aria-hidden="true"
                style={reduce ? undefined : { opacity: inkFade }}
              >
                <motion.ellipse
                  cx="50"
                  cy="22"
                  rx="48"
                  ry="19"
                  fill="none"
                  stroke="var(--color-green)"
                  strokeWidth={1.1}
                  strokeLinecap="round"
                  initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.9 }}
                  transition={{ delay: 1.25, duration: 1.1, ease: EASE }}
                />
              </motion.svg>
            </span>
          </span>
        </h1>

        <motion.div
          className="mt-[clamp(40px,8vh,88px)] flex flex-wrap items-end justify-between gap-[clamp(18px,5vw,64px)]"
          initial={reduce ? false : { opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05, duration: 1, ease: EASE }}
        >
          <p className="max-w-[34ch] text-[clamp(1rem,1.4vw,1.18rem)] text-ink-soft">
            We craft motion-led brands and digital places people don&apos;t want to leave — from a
            sunlit studio in Lisbon.
          </p>
          <div className="flex gap-[clamp(16px,3vw,40px)] font-mono text-[0.74rem] tracking-[0.16em] text-muted uppercase">
            <LisbonClock />
            <span>Open for 2026</span>
            <span className="inline-flex items-center gap-[0.6em]">
              <motion.span
                className="inline-block h-9 w-px origin-top bg-terracotta"
                animate={{ scaleY: [1, 0.3, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
              Scroll
            </span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
