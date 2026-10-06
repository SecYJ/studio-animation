import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from "motion/react";
import { jitter } from "../lib/jitter";
import { usePinnedScroll } from "../lib/usePinnedScroll";

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

/* what every other studio's homepage says — the raw material */
const CLICHE = "We make websites that look nice and work fine.";

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
const STRIKE: [number, number] = [0.04, 0.13]; // the editor's red pen crosses the cliché out
const MORPH: [number, number] = [0.15, 0.68]; // letters fly from the cliché into the manifesto
const FLIGHT = 0.17; // slice of the scrub each letter spends in the air
const ACCENT: [number, number] = [0.7, 0.77]; // strike + underline on the finished statement
const PUSH_RADIUS = 150; // px — the cursor's reach over the assembled letters

/** wraps v into [min, max) so the marquee loops seamlessly */
function wrap(min: number, max: number, v: number) {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

type Box = { ch: string; x: number; y: number; w: number; h: number; word: number };

type Particle =
  /** a cliché letter reused by the manifesto: tumbles across, sans → serif */
  | { kind: "move"; a: Box; b: Box; s: number; lift: number; spin: number }
  /** a letter the cliché didn't have: condenses out of the air */
  | { kind: "new"; b: Box; s: number; ox: number; oy: number; spin: number }
  /** a cliché letter the manifesto doesn't need: falls off the page */
  | { kind: "drop"; a: Box; s: number; ox: number; fall: number; spin: number };

type Layout = {
  parts: Particle[];
  fsA: number;
  fsB: number;
  /** one crossing-out stroke per line of the cliché */
  strikes: { x0: number; x1: number; y: number }[];
  /** bounding boxes of the accent words in the finished statement */
  accents: { accent: Accent; x: number; y: number; w: number; h: number }[];
};

/** each letter's box inside `stage` — walks the offset chain, since the
 *  cliché paragraph is itself positioned */
function measureBoxes(root: HTMLElement, stage: HTMLElement): Box[] {
  return [...root.querySelectorAll<HTMLElement>("[data-ch]")].map((el) => {
    let x = 0;
    let y = 0;
    let node: HTMLElement | null = el;
    while (node && node !== stage) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent as HTMLElement | null;
    }
    return {
      ch: el.dataset.ch ?? "",
      x,
      y,
      w: el.offsetWidth,
      h: el.offsetHeight,
      word: Number(el.dataset.word),
    };
  });
}

/** pair every manifesto letter with the cliché letter nearest in reading
 *  order; leftovers on either side become new or dropped letters */
function plan(a: Box[], b: Box[]): Particle[] {
  const used = Array.from({ length: a.length }, () => false);
  const span = MORPH[1] - MORPH[0] - 0.05 - FLIGHT;
  const out: Particle[] = [];
  b.forEach((bb, i) => {
    const u = i / Math.max(1, b.length - 1);
    let best = -1;
    let bestD = Infinity;
    a.forEach((aa, j) => {
      if (used[j] || aa.ch.toLowerCase() !== bb.ch.toLowerCase()) return;
      const d = Math.abs(j / Math.max(1, a.length - 1) - u);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    });
    const s = MORPH[0] + 0.05 + (u * 0.85 + jitter(i + 11) * 0.15) * span;
    if (best >= 0) {
      used[best] = true;
      out.push({
        kind: "move",
        a: a[best],
        b: bb,
        s,
        lift: 30 + jitter(i + 5) * 90,
        spin: (jitter(i + 23) - 0.5) * 320,
      });
    } else {
      out.push({
        kind: "new",
        b: bb,
        s,
        ox: (jitter(i + 41) - 0.5) * 260,
        oy: 80 + jitter(i + 59) * 140,
        spin: (jitter(i + 71) - 0.5) * 180,
      });
    }
  });
  a.forEach((aa, j) => {
    if (used[j]) return;
    out.push({
      kind: "drop",
      a: aa,
      s: MORPH[0] + (j / a.length) * 0.12,
      ox: (jitter(j + 83) - 0.5) * 140,
      fall: 260 + jitter(j + 97) * 280,
      spin: (jitter(j + 101) - 0.5) * 240,
    });
  });
  return out;
}

/** Letter-level typesetting: the cliché, crossed out, then torn apart and
 *  re-set — every letter flies on its own arc and morphs from grotesque
 *  sans into Fraunces as it lands in the manifesto. Fully scroll-scrubbed;
 *  the assembled letters shy away from the cursor. One imperative pass per
 *  frame writes ~90 transforms — no React renders while scrubbing. */
function TypeMorph({ progress }: { progress: MotionValue<number> }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const aRef = useRef<HTMLParagraphElement>(null);
  const bRef = useRef<HTMLHeadingElement>(null);
  const els = useRef<(HTMLSpanElement | null)[]>([]);
  const [layout, setLayout] = useState<Layout | null>(null);

  const strikeDraw = useTransform(progress, STRIKE, [0, 1]);
  const strikeFade = useTransform(progress, [MORPH[0], MORPH[0] + 0.06], [1, 0]);
  const accentDraw = useTransform(progress, ACCENT, [0, 1]);

  /* measure both typesettings (after fonts, and again on any resize) */
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const aRoot = aRef.current;
    const bRoot = bRef.current;
    if (!stage || !aRoot || !bRoot) return;
    const measure = () => {
      const a = measureBoxes(aRoot, stage);
      const b = measureBoxes(bRoot, stage);
      const lines = new Map<number, { x0: number; x1: number; y: number }>();
      for (const box of a) {
        const line = lines.get(box.y) ?? { x0: Infinity, x1: -Infinity, y: box.y + box.h * 0.56 };
        line.x0 = Math.min(line.x0, box.x);
        line.x1 = Math.max(line.x1, box.x + box.w);
        lines.set(box.y, line);
      }
      const accents: Layout["accents"] = [];
      statement.forEach((token, wi) => {
        if (!token.accent) return;
        const boxes = b.filter((box) => box.word === wi);
        const x = Math.min(...boxes.map((box) => box.x));
        const y = Math.min(...boxes.map((box) => box.y));
        accents.push({
          accent: token.accent,
          x,
          y,
          w: Math.max(...boxes.map((box) => box.x + box.w)) - x,
          h: Math.max(...boxes.map((box) => box.y + box.h)) - y,
        });
      });
      setLayout({
        parts: plan(a, b),
        fsA: parseFloat(getComputedStyle(aRoot).fontSize),
        fsB: parseFloat(getComputedStyle(bRoot).fontSize),
        strikes: [...lines.values()],
        accents,
      });
    };
    measure();
    void document.fonts.ready.then(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  /* the per-frame writer: scroll scrub + cursor push, straight to the DOM */
  useEffect(() => {
    const stage = stageRef.current;
    if (!layout || !stage) return;
    const { parts } = layout;
    const n = parts.length;
    const offX = new Float32Array(n);
    const offY = new Float32Array(n);
    const tgtX = new Float32Array(n);
    const tgtY = new Float32Array(n);
    let raf = 0;

    const render = () => {
      const p = progress.get();
      const settled = clamp01((p - MORPH[1]) / 0.04);
      for (let k = 0; k < n; k++) {
        const el = els.current[k];
        if (!el) continue;
        const pt = parts[k];
        let cx: number;
        let cy: number;
        let rot: number;
        let sc: number;
        if (pt.kind === "drop") {
          const t = easeInOut(clamp01((p - pt.s) / 0.14));
          cx = pt.a.x + pt.a.w / 2 + pt.ox * t;
          cy = pt.a.y + pt.a.h / 2 + pt.fall * t * t;
          rot = pt.spin * t;
          el.style.opacity = String(1 - t);
          el.style.transform = `translate3d(${cx - pt.a.w / 2}px, ${cy - pt.a.h / 2}px, 0) rotate(${rot}deg)`;
          continue;
        }
        const t = easeInOut(clamp01((p - pt.s) / FLIGHT));
        const bx = pt.b.x + pt.b.w / 2 + offX[k] * settled;
        const by = pt.b.y + pt.b.h / 2 + offY[k] * settled;
        if (pt.kind === "move") {
          const ax = pt.a.x + pt.a.w / 2;
          const ay = pt.a.y + pt.a.h / 2;
          const arc = Math.sin(Math.PI * t);
          cx = ax + (bx - ax) * t;
          cy = ay + (by - ay) * t - arc * pt.lift;
          rot = arc * pt.spin;
          sc = pt.a.h / pt.b.h + (1 - pt.a.h / pt.b.h) * t;
          // grotesque fades out as the serif fades in, mid-air
          const swap = clamp01((t - 0.3) / 0.4);
          (el.children[0] as HTMLElement).style.opacity = String(1 - swap);
          (el.children[1] as HTMLElement).style.opacity = String(swap);
        } else {
          cx = bx + pt.ox * (1 - t);
          cy = by + pt.oy * (1 - t);
          rot = pt.spin * (1 - t);
          sc = 0.35 + 0.65 * t;
          el.style.opacity = String(t);
        }
        // pushed letters tip away from the cursor a little
        rot += offX[k] * 0.35 * settled;
        el.style.transform = `translate3d(${cx - pt.b.w / 2}px, ${cy - pt.b.h / 2}px, 0) rotate(${rot}deg) scale(${sc})`;
      }
    };

    const ease = () => {
      raf = 0;
      let moving = false;
      for (let k = 0; k < n; k++) {
        offX[k] += (tgtX[k] - offX[k]) * 0.16;
        offY[k] += (tgtY[k] - offY[k]) * 0.16;
        if (Math.abs(tgtX[k] - offX[k]) > 0.05 || Math.abs(tgtY[k] - offY[k]) > 0.05) moving = true;
      }
      render();
      if (moving) raf = requestAnimationFrame(ease);
    };

    const aim = (mx: number, my: number) => {
      for (let k = 0; k < n; k++) {
        const pt = parts[k];
        tgtX[k] = 0;
        tgtY[k] = 0;
        if (pt.kind === "drop") continue;
        const dx = pt.b.x + pt.b.w / 2 - mx;
        const dy = pt.b.y + pt.b.h / 2 - my;
        const d = Math.hypot(dx, dy);
        if (d >= PUSH_RADIUS || d === 0) continue;
        const f = (1 - d / PUSH_RADIUS) ** 2 * 34;
        tgtX[k] = (dx / d) * f;
        tgtY[k] = (dy / d) * f;
      }
      if (!raf) raf = requestAnimationFrame(ease);
    };

    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      aim(e.clientX - r.left, e.clientY - r.top);
    };
    const onLeave = () => aim(-1e5, -1e5);

    render();
    const unsubscribe = progress.on("change", render);
    const section = stage.closest("section") ?? stage;
    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);
    return () => {
      unsubscribe();
      cancelAnimationFrame(raf);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
    };
  }, [layout, progress]);

  let wordIndex = 0;
  return (
    <div ref={stageRef} className="relative">
      {/* the finished statement: real text for layout + screen readers, painted by the letters */}
      <h2 ref={bRef} className="max-w-[22ch] font-display text-statement opacity-0">
        {statement.map((token, wi) => (
          <span key={wi}>
            <span className={`inline-block whitespace-nowrap ${token.accent ? "italic" : ""}`}>
              {Array.from(token.text).map((ch, ci) => (
                <span key={ci} data-ch={ch} data-word={wi}>
                  {ch}
                </span>
              ))}
            </span>{" "}
          </span>
        ))}
      </h2>

      {/* the cliché, measured in the same box */}
      <p
        ref={aRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-[0.3em] left-0 max-w-[21ch] font-sans text-[clamp(1.7rem,4.4vw,3.6rem)] leading-[1.12] font-[520] tracking-[-0.025em] text-transparent"
      >
        {CLICHE.split(" ").map((word, wi) => {
          const w = wordIndex++;
          return (
            <span key={wi}>
              <span className="inline-block whitespace-nowrap">
                {Array.from(word).map((ch, ci) => (
                  <span key={ci} data-ch={ch} data-word={w}>
                    {ch}
                  </span>
                ))}
              </span>{" "}
            </span>
          );
        })}
      </p>

      {layout && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {/* the editor's pen through every line of the cliché */}
          <motion.svg
            className="absolute inset-0 size-full overflow-visible"
            style={{ opacity: strikeFade }}
          >
            {layout.strikes.map((line, i) => {
              const w = line.x1 - line.x0;
              return (
                <motion.path
                  key={i}
                  d={`M ${line.x0 - 8} ${line.y + 4} C ${line.x0 + w * 0.3} ${line.y - 6}, ${line.x0 + w * 0.6} ${line.y + 7}, ${line.x1 + 10} ${line.y - 3}`}
                  fill="none"
                  stroke="var(--color-terracotta-deep)"
                  strokeWidth={4}
                  strokeLinecap="round"
                  style={{ pathLength: strikeDraw }}
                />
              );
            })}
          </motion.svg>

          {layout.parts.map((pt, k) => {
            const box = pt.kind === "drop" ? pt.a : pt.b;
            const accent = pt.kind === "drop" ? undefined : statement[pt.b.word]?.accent;
            const serif = `absolute inset-0 text-statement ${
              accent === "strike"
                ? "text-terracotta italic"
                : accent === "underline"
                  ? "text-green italic"
                  : "text-ink"
            }`;
            return (
              <span
                key={k}
                ref={(el) => {
                  els.current[k] = el;
                }}
                className="absolute top-0 left-0 whitespace-pre will-change-transform"
                style={{ width: box.w, height: box.h }}
              >
                {pt.kind !== "new" && (
                  <span
                    className="absolute inset-0 font-sans font-[520] text-ink-soft"
                    style={{
                      fontSize: pt.kind === "move" ? layout.fsA * (pt.b.h / pt.a.h) : layout.fsA,
                      lineHeight: `${box.h}px`,
                    }}
                  >
                    {pt.a.ch}
                  </span>
                )}
                {pt.kind !== "drop" && (
                  <span
                    className={`font-display ${serif}`}
                    style={{
                      fontSize: layout.fsB,
                      lineHeight: `${box.h}px`,
                      opacity: pt.kind === "move" ? 0 : 1,
                    }}
                  >
                    {pt.b.ch}
                  </span>
                )}
              </span>
            );
          })}

          {/* editor's marks on the finished statement */}
          {layout.accents.map((a) =>
            a.accent === "strike" ? (
              <svg
                key="strike"
                className="absolute overflow-visible"
                style={{
                  left: a.x - a.w * 0.05,
                  top: a.y + a.h * 0.1,
                  width: a.w * 1.1,
                  height: a.h * 0.8,
                }}
                viewBox="0 0 100 40"
                preserveAspectRatio="none"
              >
                {/* rough editor's strike — one impatient pass of the pen */}
                <motion.path
                  d="M2 24 C 16 19, 33 26, 50 21 S 80 25, 98 17"
                  fill="none"
                  stroke="var(--color-terracotta-deep)"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ pathLength: accentDraw }}
                />
              </svg>
            ) : (
              <svg
                key="underline"
                className="absolute overflow-visible"
                style={{
                  left: a.x - a.w * 0.03,
                  top: a.y + a.h * 0.86,
                  width: a.w * 1.06,
                  height: a.h * 0.4,
                }}
                viewBox="0 0 100 20"
                preserveAspectRatio="none"
              >
                {/* wavy double-check underline, like circling the word that matters */}
                <motion.path
                  d="M2 8 C 18 14, 40 4, 58 10 S 88 13, 98 6 M6 14 C 30 18, 60 11, 94 13"
                  fill="none"
                  stroke="var(--color-green)"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ pathLength: accentDraw }}
                />
              </svg>
            ),
          )}
        </div>
      )}
    </div>
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
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);

  useAnimationFrame((_, delta) => {
    // parked while off-screen: no per-frame transform writes nobody can see
    if (reduce || !inView) return;
    const vf = velocityFactor.get();
    if (vf < 0) direction.current = -1;
    else if (vf > 0) direction.current = 1;
    const moveBy = direction.current * 3 * (delta / 1000) * (1 + Math.abs(vf));
    baseX.set(wrap(-50, 0, baseX.get() - moveBy));
  });

  const x = useTransform(baseX, (v) => `${v}%`);

  return (
    <div
      ref={ref}
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
  const scrollYProgress = usePinnedScroll(ref);
  const [rewritten, setRewritten] = useState(false);

  const morphProgress = useTransform(scrollYProgress, [STRIKE[0], MORPH[1]], [0, 1]);
  const barScale = useSpring(morphProgress, { stiffness: 140, damping: 26 });
  const pctText = useTransform(morphProgress, (v) => String(Math.round(v * 100)).padStart(3, "0"));

  const paraOpacity = useTransform(scrollYProgress, [0.78, 0.9], [0, 1]);
  const paraY = useTransform(scrollYProgress, [0.78, 0.9], [28, 0]);
  const watermarkY = useTransform(scrollYProgress, [0, 1], ["6%", "-14%"]);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const next = p >= MORPH[0];
    setRewritten((prev) => (prev === next ? prev : next));
  });

  return (
    <section
      className={`relative border-y border-line bg-cream-deep ${reduce ? "" : "h-[340vh]"}`}
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
            {/* label flips from the cliché's source to ours as the rewrite begins */}
            <span className="eyebrow relative shrink-0 overflow-hidden text-terracotta-deep">
              {reduce ? (
                "Manifesto"
              ) : (
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={rewritten ? "ours" : "theirs"}
                    className="inline-block"
                    initial={{ y: "110%" }}
                    animate={{ y: "0%" }}
                    exit={{ y: "-110%" }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {rewritten ? "Manifesto — what we mean" : "What every studio says"}
                  </motion.span>
                </AnimatePresence>
              )}
            </span>
            <motion.span
              className="h-px flex-1 origin-left bg-ink/20"
              style={{ scaleX: reduce ? 1 : barScale }}
            />
            <span className="shrink-0 font-mono text-[0.72rem] tracking-[0.16em] text-muted">
              {reduce ? "100" : <motion.span>{pctText}</motion.span>}%
            </span>
          </div>

          {reduce ? (
            <h2 className="max-w-[22ch] font-display text-statement">
              {statement.map((token, i) => (
                <span
                  key={i}
                  className={
                    token.accent === "strike"
                      ? "text-terracotta italic line-through decoration-terracotta-deep"
                      : token.accent === "underline"
                        ? "text-green italic underline decoration-green"
                        : undefined
                  }
                >
                  {token.text}{" "}
                </span>
              ))}
            </h2>
          ) : (
            <TypeMorph progress={scrollYProgress} />
          )}

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
