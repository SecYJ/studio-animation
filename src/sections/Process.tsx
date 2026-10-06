import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import confetti from "canvas-confetti";
import { useMediaQuery } from "../lib/useMediaQuery";
import { usePinnedScroll } from "../lib/usePinnedScroll";

const EASE = [0.22, 1, 0.36, 1] as const;

const steps = [
  {
    title: "Discover",
    tag: "Research & strategy",
    body: "We dig into your story, your market and your ambition — then map the emotional arc the experience should follow.",
  },
  {
    title: "Define",
    tag: "Creative direction",
    body: "Strategy turns into a creative direction: the look, the motion language, the few ideas worth betting on.",
  },
  {
    title: "Design",
    tag: "Motion & prototyping",
    body: "We design in motion from day one, prototyping the feel of every transition until it disappears into instinct.",
  },
  {
    title: "Deliver",
    tag: "Build & handoff",
    body: "We build it for real — fast, accessible and pixel-honest — then hand you the keys and a system to grow with.",
  },
];

/* the fuse: a full-width run with a loop-the-loop at Define */
const PATH_D =
  "M 40 320 C 180 140 340 120 470 220 C 560 290 560 400 470 430 C 380 460 360 330 470 300 C 600 260 760 140 900 180 C 1020 210 1110 300 1165 255";

/* where along the fuse each phase's station sits; the step flips as the spark crosses it */
const NODE_FRACTIONS = [0.08, 0.38, 0.66, 0.94];

/* scrub padding so the burn starts/finishes just inside the pin */
const DRAW_START = 0.03;
const DRAW_END = 0.97;

const CONFETTI_COLORS = ["#ffdba6", "#e0613a", "#c44a26", "#fbf6ec", "#2f5d50"];

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

/** Full-viewport confetti cannon (fixed canvas + resize:true covers any screen,
 *  worker rendering keeps the burst off the main thread). */
function useConfettiCannon() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cannonRef = useRef<confetti.CreateTypes | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cannon = confetti.create(canvas, { resize: true, useWorker: true });
    cannonRef.current = cannon;
    return () => {
      cannon.reset();
      cannonRef.current = null;
    };
  }, []);

  /* main detonation at `origin`, plus side cannons from both bottom corners
     and a wide centre burst so the volley blankets the whole viewport */
  const fire = (origin: { x: number; y: number }) => {
    const cannon = cannonRef.current;
    if (!cannon) return;
    void cannon({
      particleCount: 120,
      spread: 100,
      startVelocity: 46,
      origin,
      colors: CONFETTI_COLORS,
      scalar: 0.9,
    });
    void cannon({
      particleCount: 90,
      angle: 60,
      spread: 70,
      startVelocity: 65,
      origin: { x: 0, y: 0.95 },
      colors: CONFETTI_COLORS,
      scalar: 0.85,
    });
    void cannon({
      particleCount: 90,
      angle: 120,
      spread: 70,
      startVelocity: 65,
      origin: { x: 1, y: 0.95 },
      colors: CONFETTI_COLORS,
      scalar: 0.85,
    });
    void cannon({
      particleCount: 55,
      spread: 160,
      startVelocity: 32,
      decay: 0.92,
      origin: { x: 0.28, y: 0.45 },
      colors: CONFETTI_COLORS,
      scalar: 0.7,
    });
    void cannon({
      particleCount: 55,
      spread: 160,
      startVelocity: 32,
      decay: 0.92,
      origin: { x: 0.72, y: 0.45 },
      colors: CONFETTI_COLORS,
      scalar: 0.7,
    });
  };

  const canvas = (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[10000] size-full"
    />
  );

  return { canvas, fire };
}

/** Giant ghost title behind the fuse — letters roll like a split-flap board. */
function WatermarkTitle({ text }: { text: string }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
      aria-hidden="true"
    >
      <div className="relative overflow-hidden pb-[0.06em] [perspective:1200px]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={text}
            className="flex font-display text-[clamp(6rem,16vw,15rem)] leading-[0.9] font-[420] tracking-[-0.02em] text-transparent [-webkit-text-stroke:1.5px_rgb(251_246_236_/_0.13)]"
          >
            {text.split("").map((ch, i) => (
              <motion.span
                className="inline-block will-change-transform"
                key={`${ch}-${i}`}
                initial={{ y: "115%", rotateX: -75, opacity: 0 }}
                animate={{ y: "0%", rotateX: 0, opacity: 1 }}
                exit={{ y: "-115%", rotateX: 75, opacity: 0 }}
                transition={{ duration: 0.6, ease: EASE, delay: i * 0.035 }}
              >
                {ch}
              </motion.span>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** One cell of the bottom progress rail — fills over its slice of the burn. */
function RailSegment({
  drawn,
  from,
  to,
  index,
  title,
  active,
}: {
  drawn: MotionValue<number>;
  from: number;
  to: number;
  index: number;
  title: string;
  active: number;
}) {
  const scaleX = useTransform(drawn, [from, to], [0, 1]);
  return (
    <div className="flex-1">
      <div
        className={`mb-[10px] flex items-baseline justify-between font-mono text-[0.68rem] tracking-[0.16em] uppercase transition-colors duration-300 ${
          index === active ? "text-gold" : "text-paper/35"
        }`}
      >
        <span>{String(index + 1).padStart(2, "0")}</span>
        <span className="max-[1080px]:hidden">{title}</span>
      </div>
      <div className="h-[2px] overflow-hidden rounded-full bg-paper/12">
        <motion.div
          className="h-full origin-left bg-linear-to-r from-terracotta-deep via-terracotta to-gold"
          style={{ scaleX }}
        />
      </div>
    </div>
  );
}

/** four-point star used for station flares and the spark's spinning glint */
function starPath(r: number) {
  const w = r * 0.16;
  return `M 0 ${-r} L ${w} ${-w} L ${r} 0 L ${w} ${w} L 0 ${r} L ${-w} ${w} L ${-r} 0 L ${-w} ${-w} Z`;
}

/** The fuse board: a dashed guide across the night, burned over by an
 *  ember-to-gold ink, a spark riding the burning tip, and a star flaring at
 *  each station. Everything scrubs through transforms + pathLength only. */
function FuseBoard({
  drawn,
  active,
  onComplete,
}: {
  drawn: MotionValue<number>;
  active: number;
  onComplete: (origin: { x: number; y: number }) => void;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const lengthRef = useRef(0);
  const armedRef = useRef(true);
  const [nodes, setNodes] = useState<{ x: number; y: number }[]>([]);
  const nibX = useMotionValue(0);
  const nibY = useMotionValue(0);
  const nibTransform = useMotionTemplate`translate(${nibX}px, ${nibY}px)`;

  /* the white-hot last stretch of the burn, right behind the spark */
  const tailLength = useTransform(drawn, (v) => Math.min(v, 0.05));
  const tailOffset = useTransform(drawn, (v) => Math.max(0, v - 0.05));

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    lengthRef.current = length;
    setNodes(
      NODE_FRACTIONS.map((f) => {
        const pt = path.getPointAtLength(f * length);
        return { x: pt.x, y: pt.y };
      }),
    );
    const pt = path.getPointAtLength(clamp01(drawn.get()) * length);
    nibX.set(pt.x);
    nibY.set(pt.y);
  }, [drawn, nibX, nibY]);

  useMotionValueEvent(drawn, "change", (v) => {
    const path = pathRef.current;
    if (!path || !lengthRef.current) return;
    const pt = path.getPointAtLength(clamp01(v) * lengthRef.current);
    nibX.set(pt.x);
    nibY.set(pt.y);

    /* fuse fully burned → detonate once, from wherever the end sits on screen */
    if (v >= 0.985 && armedRef.current) {
      armedRef.current = false;
      const end = path.getPointAtLength(lengthRef.current);
      const ctm = path.getScreenCTM();
      let origin = { x: 0.85, y: 0.4 };
      if (ctm) {
        const screenPt = new DOMPoint(end.x, end.y).matrixTransform(ctm);
        origin = {
          x: clamp01(screenPt.x / window.innerWidth),
          y: clamp01(screenPt.y / window.innerHeight),
        };
      }
      onComplete(origin);
    }
  });

  return (
    <svg
      className="relative h-full w-full overflow-visible"
      viewBox="0 0 1200 560"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="fuse-ink" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c44a26" />
          <stop offset="0.65" stopColor="#e0613a" />
          <stop offset="1" stopColor="#ffdba6" />
        </linearGradient>
      </defs>

      {/* unburned fuse, waiting in the dark */}
      <path
        d={PATH_D}
        stroke="rgb(251 246 236 / 0.22)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeDasharray="1 9"
        ref={pathRef}
      />
      {/* ember glow under the burn */}
      <motion.path
        d={PATH_D}
        stroke="rgb(224 97 58 / 0.22)"
        strokeWidth={9}
        strokeLinecap="round"
        style={{ pathLength: drawn }}
      />
      {/* the burn itself */}
      <motion.path
        d={PATH_D}
        stroke="url(#fuse-ink)"
        strokeWidth={2.6}
        strokeLinecap="round"
        style={{ pathLength: drawn }}
      />
      {/* white-hot stretch trailing the spark */}
      <motion.path
        d={PATH_D}
        stroke="var(--color-gold)"
        strokeWidth={3.4}
        strokeLinecap="round"
        style={{ pathLength: tailLength, pathOffset: tailOffset }}
      />

      {nodes.map((node, i) => {
        const reached = i <= active;
        /* Define sits on the loop — its label goes to the open space on the
           right; the others hang above/below depending on which half they're in */
        const onLoop = i === 1;
        const labelX = onLoop ? node.x + 26 : node.x;
        const labelY = onLoop ? node.y + 2 : node.y + (node.y >= 300 ? -30 : 42);
        return (
          <g key={steps[i].title}>
            {/* one-shot shockwave ring when the spark arrives */}
            <motion.circle
              cx={node.x}
              cy={node.y}
              r={12}
              stroke="var(--color-gold)"
              strokeWidth={1.5}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
              animate={
                reached ? { scale: [0.4, 3], opacity: [0.8, 0] } : { scale: 0.4, opacity: 0 }
              }
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
            <circle
              cx={node.x}
              cy={node.y}
              r={6.5}
              fill="var(--color-ink)"
              stroke={reached ? "var(--color-terracotta)" : "rgb(251 246 236 / 0.35)"}
              strokeWidth={1.5}
              style={{ transition: "stroke 0.4s ease" }}
            />
            {/* star flare */}
            <motion.path
              d={starPath(13)}
              fill="var(--color-gold)"
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
                x: node.x,
                y: node.y,
              }}
              animate={{ scale: reached ? 1 : 0, rotate: reached ? 0 : -90 }}
              transition={{ type: "spring", stiffness: 380, damping: 16 }}
            />
            {/* ink-stroke halo (paint-order) keeps labels legible over the
                watermark and wherever the fuse crosses behind them */}
            <motion.text
              x={labelX}
              y={labelY}
              textAnchor={onLoop ? "start" : "middle"}
              fontFamily="var(--font-mono)"
              fontSize={11.5}
              letterSpacing="0.16em"
              fill={i === active ? "var(--color-gold)" : "var(--color-paper)"}
              stroke="var(--color-ink)"
              strokeWidth={4}
              paintOrder="stroke"
              animate={{ opacity: reached ? (i === active ? 1 : 0.55) : 0.25 }}
              transition={{ duration: 0.4 }}
            >
              {String(i + 1).padStart(2, "0")} {steps[i].title.toUpperCase()}
              <tspan
                x={labelX}
                dy={16}
                fontSize={9.5}
                letterSpacing="0.12em"
                fill={i === active ? "var(--color-paper)" : "rgb(251 246 236 / 0.6)"}
              >
                {steps[i].tag.toUpperCase()}
              </tspan>
            </motion.text>
          </g>
        );
      })}

      {/* the spark riding the burning tip */}
      <motion.g style={{ transform: nibTransform }}>
        <circle className="nib-halo" r={17} fill="rgb(255 219 166 / 0.22)" />
        <path className="spark-spin" d={starPath(14)} fill="rgb(255 219 166 / 0.55)" />
        <circle r={6} fill="rgb(255 219 166 / 0.6)" />
        <circle r={3.2} fill="#fff8ea" />
      </motion.g>
    </svg>
  );
}

/** night-sky ambience: nebula glows + two starfield layers (all static or
 *  compositor-only — painted once, no per-frame work) */
function NightSky() {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <div
        className="absolute top-[-25%] left-[-12%] aspect-square w-[52vw] rounded-full"
        style={{
          background: "radial-gradient(closest-side, rgb(58 63 122 / 0.4), transparent 72%)",
        }}
      />
      <div
        className="animate-beam absolute top-[8%] right-[-14%] aspect-square w-[46vw] rounded-full"
        style={{
          background: "radial-gradient(closest-side, rgb(224 97 58 / 0.17), transparent 72%)",
        }}
      />
      <div
        className="absolute bottom-[-30%] left-[22%] aspect-square w-[48vw] rounded-full"
        style={{
          background: "radial-gradient(closest-side, rgb(47 93 80 / 0.35), transparent 72%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgb(251 246 236 / 0.16) 1px, transparent 1.5px)",
          backgroundSize: "36px 36px",
        }}
      />
      <div
        className="twinkle absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgb(255 219 166 / 0.3) 1.2px, transparent 1.8px)",
          backgroundSize: "110px 110px",
          backgroundPosition: "22px 40px",
        }}
      />
    </div>
  );
}

function ProcessPinned() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const { canvas, fire } = useConfettiCannon();
  const scrollYProgress = usePinnedScroll(ref);

  const drawnRaw = useTransform(scrollYProgress, [DRAW_START, DRAW_END], [0, 1]);
  /* the spring gives the spark real momentum — it chases the scroll and settles */
  const drawn = useSpring(drawnRaw, { stiffness: 130, damping: 26, mass: 0.4 });
  const drawnClamped = useTransform(drawn, clamp01);

  const pctText = useTransform(drawnClamped, (v) => String(Math.round(v * 100)).padStart(3, "0"));

  useMotionValueEvent(drawnRaw, "change", (v) => {
    let idx = 0;
    for (let i = 0; i < NODE_FRACTIONS.length; i++) {
      if (v >= NODE_FRACTIONS[i] - 0.02) idx = i;
    }
    setActive((prev) => (prev === idx ? prev : idx));
  });

  return (
    <section id="process" className="relative h-[440vh] bg-ink text-paper" ref={ref}>
      {canvas}
      <div className="sticky top-0 h-svh overflow-hidden">
        <NightSky />

        <div className="relative z-1 flex h-full flex-col px-[clamp(20px,4vw,64px)] pt-[clamp(80px,12vh,128px)] pb-[clamp(22px,4vh,44px)]">
          <div className="flex items-baseline justify-between gap-5">
            <span className="eyebrow text-gold">How we work</span>
            <span className="font-mono text-[0.72rem] tracking-[0.2em] text-paper/45 uppercase">
              04 phases, one lit fuse
            </span>
          </div>

          <div className="relative min-h-0 flex-1 py-[clamp(8px,2vh,20px)]">
            <WatermarkTitle text={steps[active].title} />
            <FuseBoard drawn={drawnClamped} active={active} onComplete={fire} />
          </div>

          {/* active phase caption */}
          <div className="relative mx-auto min-h-[3.4em] max-w-[58ch] text-center">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p
                key={active}
                className="font-display text-[clamp(1.05rem,1.6vw,1.35rem)] text-paper/80 italic"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.45, ease: EASE, delay: 0.08 }}
              >
                {steps[active].body}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* progress rail: one filling segment per phase + burn meter */}
          <div className="mt-[clamp(16px,3vh,32px)] flex items-end gap-[clamp(14px,2.5vw,32px)]">
            {steps.map((step, i) => (
              <RailSegment
                key={step.title}
                drawn={drawnClamped}
                from={NODE_FRACTIONS[i]}
                to={NODE_FRACTIONS[i + 1] ?? 1}
                index={i}
                title={step.title}
                active={active}
              />
            ))}
            <div className="shrink-0 pb-[1px] font-mono text-[0.7rem] tracking-[0.18em] text-gold/70">
              <motion.span>{pctText}</motion.span>% BURNED
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Calm fallback for touch, small screens and reduced motion: a vertical fuse
 *  down the night sky, with the same confetti payoff at the last station. */
function ProcessStacked() {
  const reduce = useReducedMotion();
  const { canvas, fire } = useConfettiCannon();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const done = useInView(sentinelRef, { once: true, margin: "0px 0px -20% 0px" });
  const fired = useRef(false);

  useEffect(() => {
    if (!done || reduce || fired.current) return;
    fired.current = true;
    fire({ x: 0.5, y: 0.75 });
  }, [done, reduce, fire]);

  return (
    <section id="process" className="relative bg-ink py-[clamp(80px,12vh,130px)] text-paper">
      {canvas}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgb(251 246 236 / 0.14) 1px, transparent 1.5px)",
          backgroundSize: "36px 36px",
        }}
        aria-hidden="true"
      />
      <div className="wrap relative">
        <span className="eyebrow text-gold">How we work</span>
        <h2 className="mt-[0.4em] max-w-[16ch] text-headline">
          Four phases, <em className="text-gold italic">one lit fuse.</em>
        </h2>

        <div className="relative mt-[clamp(36px,6vh,64px)] flex flex-col gap-[clamp(36px,7vh,64px)] pl-[34px]">
          <div
            className="absolute inset-y-2 left-[7px] w-px border-l border-dashed border-paper/25"
            aria-hidden="true"
          />
          {steps.map((step, i) => (
            <motion.div
              className="relative"
              key={step.title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-18% 0px" }}
              transition={{ duration: 0.65, ease: EASE }}
            >
              <svg
                className="absolute top-[2px] left-[-41px] size-[16px]"
                viewBox="-14 -14 28 28"
                aria-hidden="true"
              >
                <path d={starPath(13)} fill="var(--color-gold)" />
              </svg>
              <span className="font-mono text-[0.72rem] tracking-[0.2em] text-gold uppercase">
                {String(i + 1).padStart(2, "0")} — {step.tag}
              </span>
              <h3 className="mt-[8px] mb-[12px] text-lead text-paper">{step.title}</h3>
              <p className="max-w-[42ch] text-[rgb(251_246_236_/_0.78)]">{step.body}</p>
            </motion.div>
          ))}
          <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
        </div>
      </div>
    </section>
  );
}

export function Process() {
  const reduce = useReducedMotion();
  /* pinned scrub needs a mouse-ish pointer and real horizontal room;
     everyone else gets the stacked timeline */
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const narrow = useMediaQuery("(max-width: 899px)");
  return reduce || coarsePointer || narrow ? <ProcessStacked /> : <ProcessPinned />;
}
