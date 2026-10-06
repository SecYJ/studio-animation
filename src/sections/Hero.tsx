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
import { Motes } from "../components/Motes";
import { jitter } from "../lib/jitter";

const EASE = [0.22, 1, 0.36, 1] as const;
const CHAR_DELAY = 0.1; // s before the first letter leaves its wing
const CHAR_STAGGER = 0.11; // s between letters — rolls overlap into one cascading wave
const ROLL_DURATION = 1.15; // s per rolling letter
/* "studio" boards as the last NEBULA letter is settling */
const STUDIO_DELAY = CHAR_DELAY + 5 * CHAR_STAGGER + ROLL_DURATION * 0.7;

type SharedMotion = {
  scrollProgress: MotionValue<number>;
  /** cursor, viewport coords — drives the letters' weight bloom */
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
};

type HeroCharProps = SharedMotion & {
  char: string;
  /** global index across both lines, for stagger + scatter */
  index: number;
  baseWeight: number;
  wonk?: boolean;
  /** roll in horizontally from this side, strictly after the previous letter lands */
  roll?: "left" | "right";
  /** skip the per-letter entrance — a parent group carries the whole word in */
  still?: boolean;
  /** hold the entrance until the display font is loaded, to avoid a mid-flight swap */
  play: boolean;
};

const FRAUNCES = '1em "Fraunces Variable"';

/** True once Fraunces is ready AND the main thread has gone quiet after the
 *  first mount (every section measures + re-renders right after boot — a
 *  100–250ms burst that would otherwise stutter the first letters). Capped
 *  at 1.5s so a failed font or a busy page never blocks the intro. */
function useIntroReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    let idle = 0;
    const done = () => {
      if (alive) setReady(true);
    };
    const cap = setTimeout(done, 1500);
    const fonts = Promise.all([
      document.fonts.load(FRAUNCES),
      document.fonts.load(`italic ${FRAUNCES}`),
    ]).catch(() => undefined);
    void fonts.then(() => {
      if (!alive) return;
      if ("requestIdleCallback" in window) idle = requestIdleCallback(done, { timeout: 400 });
      else setTimeout(done, 120);
    });
    return () => {
      alive = false;
      clearTimeout(cap);
      if (idle) cancelIdleCallback(idle);
    };
  }, []);
  return ready;
}

/** One headline letter. Blur-rises (or rolls in from a side) on load, swells in
 *  weight near the cursor (Fraunces variable axes), and scatters away with its
 *  own drift on scroll. */
function HeroChar({
  char,
  index,
  baseWeight,
  wonk,
  roll,
  still,
  play,
  scrollProgress,
  mouseX,
  mouseY,
}: HeroCharProps) {
  const reduce = useReducedMotion();
  /* the scatter wrapper: its layout box ignores the intro roll, the hover
     lift and the scroll scatter, so its centre is a stable anchor */
  const ref = useRef<HTMLSpanElement>(null);
  const centre = useRef<{ x: number; y: number } | null>(null);

  /* page-coordinate centre from the offset chain: transforms and scrolling
     never move it, so it's measured once and only re-taken when the glyph's
     box changes (font swap, resize) — no layout reads per frame */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const invalidate = () => {
      centre.current = null;
    };
    const observer = new ResizeObserver(invalidate);
    observer.observe(el);
    window.addEventListener("resize", invalidate);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", invalidate);
    };
  }, []);
  const anchor = () => {
    const el = ref.current;
    if (!centre.current && el) {
      let x = el.offsetWidth / 2;
      let y = el.offsetHeight / 2;
      for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) {
        x += n.offsetLeft;
        y += n.offsetTop;
      }
      centre.current = { x, y };
    }
    return centre.current;
  };

  /* cursor proximity 0..1 — only recomputes while the pointer moves.
     Read the motion values before any early return so dependency tracking sees them. */
  const prox = useTransform(() => {
    const mx = mouseX.get();
    const my = mouseY.get();
    const c = anchor();
    if (!c || mx < -9000) return 0;
    const radius = Math.max(220, window.innerWidth * 0.13);
    return Math.max(0, 1 - Math.hypot(mx - c.x, my - (c.y - window.scrollY)) / radius);
  });

  const glow = useSpring(prox, { stiffness: 170, damping: 20, restDelta: 0.004 });

  /* axes snap to small steps: a new value re-shapes + re-rasters a 13rem
     glyph, so the spring's long sub-pixel tail shouldn't cost a frame each */
  const fontVariationSettings = useTransform(
    glow,
    (p) =>
      `"opsz" 144, "wght" ${baseWeight + Math.round((p * 240) / 6) * 6}, "SOFT" ${Math.round((p * 55) / 5) * 5}` +
      (wonk ? `, "WONK" 1` : ""),
  );
  const lift = useTransform(glow, (p) => p * -9);

  /* on scroll-out each letter tumbles away on its own arc, like paper scraps
     caught in a draught — spinning through depth, not just across the page */
  const j = jitter(index);
  const k = jitter(index + 31);
  const scatterY = useTransform(scrollProgress, [0, 1], [0, 70 + j * 190]);
  const scatterX = useTransform(scrollProgress, [0, 1], [0, (j - 0.5) * 240]);
  const scatterRotate = useTransform(scrollProgress, [0, 1], [0, (j - 0.5) * 46]);
  const scatterRotateX = useTransform(scrollProgress, [0, 1], [0, (k - 0.5) * 140]);
  const scatterRotateY = useTransform(
    scrollProgress,
    [0, 1],
    [0, (jitter(index + 57) - 0.5) * 110],
  );

  /* entrance runs as a single `transform` string so Motion hands it to WAAPI:
     it plays on the compositor and can't be stuttered by main-thread work */
  const from = roll
    ? `translateX(${roll === "left" ? -55 : 55}vw) rotate(${roll === "left" ? -360 : 360}deg)`
    : "translateY(70%) rotate(9deg)";
  const to = roll ? "translateX(0vw) rotate(0deg)" : "translateY(0%) rotate(0deg)";

  return (
    <motion.span
      ref={ref}
      className="inline-block will-change-transform"
      style={
        reduce
          ? undefined
          : {
              y: scatterY,
              x: scatterX,
              rotate: scatterRotate,
              rotateX: scatterRotateX,
              rotateY: scatterRotateY,
              transformPerspective: 900,
            }
      }
    >
      <motion.span
        className="relative inline-block"
        initial={
          reduce || still
            ? false
            : { transform: from, opacity: 0, filter: `blur(${roll ? 10 : 14}px)` }
        }
        animate={play && !still ? { transform: to, opacity: 1, filter: "blur(0px)" } : undefined}
        transition={{
          duration: roll ? ROLL_DURATION : 1.1,
          ease: EASE,
          delay: CHAR_DELAY + index * CHAR_STAGGER,
        }}
      >
        {!reduce && (
          <>
            {/* the window light is far away, so every letter's shadow falls
                the same way — down-left — and drifts as the afternoon moves */}
            <motion.span
              aria-hidden="true"
              className="hero-shadow hero-shadow-far pointer-events-none absolute inset-0 text-transparent select-none [text-shadow:0_0_22px_rgb(60_40_24/0.3)]"
              style={{ fontVariationSettings }}
            >
              {char}
            </motion.span>
            {/* tight contact shadow where the letter meets the wall */}
            <motion.span
              aria-hidden="true"
              className="hero-shadow hero-shadow-near pointer-events-none absolute inset-0 text-transparent select-none [text-shadow:0_0_4px_rgb(60_40_24/0.32)]"
              style={{ fontVariationSettings }}
            >
              {char}
            </motion.span>
          </>
        )}
        <motion.span
          className="relative inline-block"
          style={reduce ? undefined : { fontVariationSettings, y: lift }}
        >
          {char}
        </motion.span>
      </motion.span>
    </motion.span>
  );
}

/* three branches reaching into the window from its top-right corner;
   leaves alternate sides along each one (viewBox units, 100 × 150) */
type Leaf = { x: number; y: number; angle: number; size: number };
function branchLeaves(seed: number, from: [number, number], to: [number, number], bend: number) {
  const leaves: Leaf[] = [];
  const count = 11;
  for (let i = 1; i <= count; i++) {
    const t = i / count;
    const x = from[0] + (to[0] - from[0]) * t + Math.sin(t * Math.PI) * bend;
    const y = from[1] + (to[1] - from[1]) * t;
    const heading = (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;
    leaves.push({
      x,
      y,
      angle: heading + (i % 2 ? 55 : -55) + (jitter(seed + i) - 0.5) * 30,
      size: 0.8 + jitter(seed + i * 3) * 0.7,
    });
  }
  return leaves;
}
const BRANCHES = [
  { d: "M 104 -4 C 80 18, 64 30, 40 62", leaves: branchLeaves(3, [104, -4], [40, 62], -6) },
  { d: "M 104 20 C 86 44, 70 60, 58 96", leaves: branchLeaves(41, [104, 20], [58, 96], 5) },
  { d: "M 104 58 C 90 84, 80 104, 66 130", leaves: branchLeaves(113, [104, 58], [66, 130], -6) },
  { d: "M 90 -6 C 76 6, 62 10, 48 12", leaves: branchLeaves(77, [90, -6], [48, 12], -3) },
  { d: "M 70 -6 C 56 10, 38 22, 20 40", leaves: branchLeaves(151, [70, -6], [20, 40], 6) },
  { d: "M 104 92 C 96 112, 90 130, 78 152", leaves: branchLeaves(197, [104, 92], [78, 152], 4) },
];

const BOUGH_A = BRANCHES.slice(0, 3);
const BOUGH_B = BRANCHES.slice(3);

/* canvas px per viewBox unit for the painted leaf shadows */
const BOUGH_RES = 4;

/** one swaying bough of leaf-shadow, painted (blur and all) into a canvas
 *  once. A canvas is just a texture to the compositor, so the endless sway
 *  costs nothing — a blurred SVG got re-rasterized by Firefox every frame. */
function Bough({ branches, className }: { branches: typeof BRANCHES; className: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.scale(BOUGH_RES, BOUGH_RES);
    ctx.filter = `blur(${0.75 * BOUGH_RES}px)`;
    ctx.fillStyle = "rgb(96 64 34 / 0.36)";
    ctx.strokeStyle = "rgb(96 64 34 / 0.34)";
    ctx.lineWidth = 0.7;
    for (const b of branches) {
      ctx.stroke(new Path2D(b.d));
      for (const leaf of b.leaves) {
        ctx.beginPath();
        ctx.ellipse(
          leaf.x,
          leaf.y,
          3.4 * leaf.size,
          1.4 * leaf.size,
          (leaf.angle * Math.PI) / 180,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }, [branches]);
  return (
    <div className={`absolute inset-0 origin-top-right ${className}`}>
      <canvas
        ref={ref}
        width={100 * BOUGH_RES}
        height={150 * BOUGH_RES}
        className="size-full object-cover"
      />
    </div>
  );
}

/** Komorebi — afternoon sun through the studio window: six soft panes of
 *  light thrown across the wall, a plant's shadow swaying inside them. It
 *  drifts on its own; the cursor only nudges it (parallax) and stirs the
 *  leaves like a breeze. Static rasters + compositor animations only. */
function WindowLight({
  lit,
  shiftX,
  shiftY,
  gust,
  sink,
}: {
  lit: boolean;
  shiftX: MotionValue<number>;
  shiftY: MotionValue<number>;
  gust: MotionValue<number>;
  sink: MotionValue<string>;
}) {
  const reduce = useReducedMotion();
  const sway = useTransform(gust, (g) => g * 3.2);
  const swayX = useTransform(gust, (g) => g * -10);
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-1 overflow-hidden"
      style={{ x: shiftX, y: shiftY }}
      aria-hidden="true"
    >
      {/* the sun comes out from behind a cloud */}
      <motion.div
        className="absolute inset-0"
        initial={reduce ? false : { opacity: 0, transform: "translateX(-5%)" }}
        animate={lit ? { opacity: 1, transform: "translateX(0%)" } : undefined}
        transition={{ duration: 2.6, ease: EASE }}
      >
        <motion.div className="absolute inset-0" style={{ y: sink }}>
          <div
            className={`absolute top-[-16%] right-[-20%] h-[132%] w-[76vw] ${reduce ? "" : "animate-light-drift"}`}
          >
            <div className="size-full [transform:skewX(-14deg)_rotate(7deg)]">
              {/* the panes of light, the window bars left in shade between them */}
              <div className="grid size-full grid-cols-2 grid-rows-3 gap-[2.2vw] p-[2vw]">
                {Array.from({ length: 6 }, (_, i) => (
                  <div
                    key={i}
                    className="rounded-[10px] bg-[linear-gradient(205deg,rgb(255_247_228/0.95),rgb(255_232_190/0.7)_55%,rgb(255_220_170/0.25))] blur-[12px]"
                  />
                ))}
              </div>
              <motion.div
                className="absolute inset-0 origin-top-right"
                style={reduce ? undefined : { rotate: sway, x: swayX }}
              >
                <Bough branches={BOUGH_A} className={reduce ? "" : "animate-bough-a"} />
                <Bough branches={BOUGH_B} className={reduce ? "" : "animate-bough-b"} />
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

const BADGE_TEXT = "MOTION · DESIGN · WEB · EST. 2018 · ";

/** Retro sticker: circular mono text slowly orbiting a terracotta asterisk. */
function OrbitBadge({ fade, play }: { fade: MotionValue<number>; play: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="absolute top-[15vh] right-[clamp(20px,6vw,84px)] z-3 size-[clamp(110px,13vw,170px)] max-[820px]:hidden"
      style={reduce ? undefined : { opacity: fade }}
      aria-hidden="true"
    >
      <motion.div
        className="relative size-full"
        initial={reduce ? false : { opacity: 0, transform: "scale(0.6) rotate(-40deg)" }}
        animate={play ? { opacity: 1, transform: "scale(1) rotate(0deg)" } : undefined}
        transition={{ delay: STUDIO_DELAY + 0.3, duration: 1, ease: EASE }}
      >
        {/* endless spins live on HTML wrappers as `transform` keyframes, so
            they run on the compositor instead of ticking JS every frame */}
        <motion.div
          className="size-full"
          animate={reduce ? undefined : { transform: ["rotate(0deg)", "rotate(360deg)"] }}
          transition={{ duration: 26, ease: "linear", repeat: Infinity }}
        >
          <svg viewBox="0 0 100 100" className="size-full">
            <defs>
              <path
                id="hero-badge-arc"
                d="M 50 50 m -40 0 a 40 40 0 1 1 80 0 a 40 40 0 1 1 -80 0"
              />
            </defs>
            <text
              className="font-mono uppercase"
              fill="var(--color-ink-soft)"
              fontSize="7.4"
              letterSpacing="2.5"
            >
              <textPath href="#hero-badge-arc">{BADGE_TEXT}</textPath>
            </text>
          </svg>
        </motion.div>
        <motion.span
          className="absolute inset-0 grid place-items-center text-[clamp(1.5rem,2.2vw,2.2rem)] text-terracotta"
          animate={reduce ? undefined : { transform: ["rotate(0deg)", "rotate(-360deg)"] }}
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
  const play = useIntroReady();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  /* cursor position shared with every headline letter */
  const mouseX = useMotionValue(-9999);
  const mouseY = useMotionValue(-9999);

  /* the window light barely leans with the cursor — depth, not chase */
  const shiftX = useSpring(0, { stiffness: 30, damping: 18 });
  const shiftY = useSpring(0, { stiffness: 30, damping: 18 });
  /* a quick hand is a breeze through the plant outside: an under-damped
     spring, so the leaves overshoot and rustle back to rest */
  const gustTarget = useMotionValue(0);
  const gust = useSpring(gustTarget, { stiffness: 45, damping: 6 });
  const lastMove = useRef({ x: 0, y: 0, t: 0 });
  const calm = useRef(0);
  useEffect(() => () => clearTimeout(calm.current), []);
  /* as the hero leaves, the light slides down the wall — the sun is setting */
  const sink = useTransform(scrollYProgress, [0, 1], ["0vh", "28vh"]);

  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 130]);
  const opacity = useTransform(scrollYProgress, [0, 0.72], [1, 0]);
  const glowA = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const glowB = useTransform(scrollYProgress, [0, 1], [0, 90]);
  /* annotation ink dissolves before the type does */
  const inkFade = useTransform(scrollYProgress, [0, 0.35], [1, 0]);

  const handleMove = (e: PointerEvent<HTMLElement>) => {
    if (reduce) return;
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
    shiftX.set((e.clientX / window.innerWidth - 0.5) * -18);
    shiftY.set((e.clientY / window.innerHeight - 0.5) * -12);
    const last = lastMove.current;
    const now = performance.now();
    const speed = Math.hypot(e.clientX - last.x, e.clientY - last.y) / Math.max(8, now - last.t);
    lastMove.current = { x: e.clientX, y: e.clientY, t: now };
    gustTarget.set(Math.min(1, speed / 2.2));
    clearTimeout(calm.current);
    calm.current = window.setTimeout(() => gustTarget.set(0), 90);
  };
  const handleLeave = () => {
    mouseX.set(-9999);
    mouseY.set(-9999);
    shiftX.set(0);
    shiftY.set(0);
    gustTarget.set(0);
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
      {/* the room: warm colour pooled in the corners, and a touch of shade on
          the wall so the window light has something to be brighter than */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <motion.div
          className="absolute top-[-14vw] right-[-12vw] size-[52vw] rounded-full bg-[radial-gradient(closest-side,rgb(224_97_58/0.38),transparent)]"
          style={{ y: glowA }}
        />
        <motion.div
          className="absolute bottom-[-14vw] left-[-12vw] size-[44vw] rounded-full bg-[radial-gradient(closest-side,rgb(47_93_80/0.3),transparent)]"
          style={{ y: glowB }}
        />
        <div className="absolute inset-0 bg-[rgb(110_80_50/0.07)]" />
      </div>

      <WindowLight lit={play} shiftX={shiftX} shiftY={shiftY} gust={gust} sink={sink} />
      {!reduce && <Motes variant="dust" count={14} />}

      <OrbitBadge fade={inkFade} play={play} />

      {/* own layer: scaling + fading it on scroll must not re-raster the copy */}
      <motion.div
        className="wrap relative z-2 w-full will-change-transform"
        style={reduce ? undefined : { scale, y: contentY, opacity }}
      >
        <motion.span
          className="eyebrow mb-[clamp(20px,4vh,40px)] text-terracotta-deep"
          initial={reduce ? false : { opacity: 0, transform: "translateY(12px)" }}
          animate={play ? { opacity: 1, transform: "translateY(0px)" } : undefined}
          transition={{ duration: 0.9, ease: EASE }}
        >
          Independent design &amp; motion studio — est. 2018
        </motion.span>

        <h1 className="font-display text-hero" data-lit={play || undefined}>
          <span className="block">
            {Array.from("NEBULA").map((char, i) => (
              <HeroChar
                key={i}
                char={char}
                index={i}
                baseWeight={420}
                roll={i % 2 === 0 ? "left" : "right"}
                play={play}
                {...shared}
              />
            ))}
          </span>
          <span className="block">
            {/* the whole word rides an ink-swash "carpet" up from below,
                boarding only after the last NEBULA letter has landed */}
            <motion.span
              className="inline-block"
              initial={reduce ? false : { transform: "translateY(120%) rotate(4deg)", opacity: 0 }}
              animate={play ? { transform: "translateY(0%) rotate(0deg)", opacity: 1 } : undefined}
              transition={{
                delay: STUDIO_DELAY,
                transform: { type: "spring", bounce: 0.32, duration: 1.3, delay: STUDIO_DELAY },
                opacity: { duration: 0.4, delay: STUDIO_DELAY },
              }}
            >
              <motion.span
                className="relative block"
                animate={
                  play && !reduce
                    ? { transform: ["translateY(0px)", "translateY(-5px)", "translateY(0px)"] }
                    : undefined
                }
                transition={{
                  delay: STUDIO_DELAY + 1.3,
                  duration: 3.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <span className="relative z-1 block font-[360] [font-variation-settings:'WONK'_1] text-terracotta italic">
                  {Array.from("studio").map((char, i) => (
                    <HeroChar
                      key={i}
                      char={char}
                      index={6 + i}
                      baseWeight={360}
                      wonk
                      still
                      play={play}
                      {...shared}
                    />
                  ))}
                </span>
                {/* the carpet itself: two loose ink swashes under the word */}
                <motion.svg
                  className="pointer-events-none absolute bottom-[-0.16em] left-[-4%] h-[0.3em] w-[108%]"
                  viewBox="0 0 120 16"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  style={reduce ? undefined : { opacity: inkFade }}
                >
                  <path
                    d="M 2 7 Q 12 2 24 7 T 48 7 T 72 7 T 96 7 T 118 6"
                    fill="none"
                    stroke="var(--color-green)"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d="M 8 13 Q 20 9 34 12.5 T 64 12.5 T 92 12 T 112 11"
                    fill="none"
                    stroke="var(--color-green)"
                    strokeWidth={1.3}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    opacity={0.5}
                  />
                </motion.svg>
              </motion.span>
            </motion.span>
          </span>
        </h1>

        <motion.div
          className="mt-[clamp(40px,8vh,88px)] flex flex-wrap items-end justify-between gap-[clamp(18px,5vw,64px)]"
          initial={reduce ? false : { opacity: 0, transform: "translateY(26px)" }}
          animate={play ? { opacity: 1, transform: "translateY(0px)" } : undefined}
          transition={{ delay: STUDIO_DELAY - 0.2, duration: 1, ease: EASE }}
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
                animate={
                  reduce ? undefined : { transform: ["scaleY(1)", "scaleY(0.3)", "scaleY(1)"] }
                }
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
