import {
  createContext,
  type PointerEvent,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  motion,
  type MotionValue,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { Motes } from "../components/Motes";
import { jitter } from "../lib/jitter";
import { useMediaQuery } from "../lib/useMediaQuery";
import { usePinnedScroll } from "../lib/usePinnedScroll";

const EASE = [0.22, 1, 0.36, 1] as const;

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

/* ---- pinned scene: "talk is cheap" → lights out → the receipt prints ---- */

/* scrub timeline (fractions of the pinned scroll) */
const DARK_AT = 0.08; // lights snap off, the banker's lamp flickers on
const RISE: [number, number] = [0.08, 0.2]; // printer rises into the lamp light
const PRINT: [number, number] = [0.2, 0.76]; // paper feeds out of the slot
const STAMP_AT = 0.8; // VERIFIED
const TEAR_AT = 0.84; // torn off the roll
const FLY: [number, number] = [0.86, 0.95]; // flutters up and away
const DAWN_AT = 0.955; // click — lights back on for the CTA

/* handwritten margin notes, one per stat row */
const NOTES = [
  "and counting",
  "they keep coming back",
  "mostly for the weird ones",
  "we checked. twice.",
];

/* ink-speckle texture for the rubber stamp (alpha of fractal noise) */
const STAMP_MASK =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.55' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 3.2 -0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* how much of the receipt (0..1, top first) has come out of the slot */
const PrintContext = createContext<MotionValue<number> | null>(null);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** One printed line. Measures where it sits on the paper, so it knows when it
 *  passes the slot: it comes out pale and darkens like fresh thermal paper.
 *  `emerge` runs 0→1 while it's crossing the slot, `after` 0→1 just after. */
function PrintLine({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode | ((emerge: MotionValue<number>, after: MotionValue<number>) => ReactNode);
}) {
  const printed = useContext(PrintContext)!;
  const ref = useRef<HTMLDivElement>(null);
  const [span, setSpan] = useState<[number, number]>([0, 1]);

  useLayoutEffect(() => {
    const el = ref.current;
    const paper = el?.offsetParent as HTMLElement | null;
    if (!el || !paper) return;
    const measure = () => {
      const h = paper.offsetHeight || 1;
      setSpan([el.offsetTop / h, (el.offsetTop + el.offsetHeight) / h]);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(paper);
    return () => observer.disconnect();
  }, []);

  const emerge = useTransform(printed, (p) =>
    clamp01((p - span[0]) / Math.max(0.001, span[1] - span[0])),
  );
  const after = useTransform(printed, (p) => clamp01((p - span[1]) / 0.07));
  const ink = useTransform(printed, (p) =>
    span[0] <= 0 ? 1 : 0.15 + 0.85 * clamp01((p - span[0]) / (span[1] - span[0] + 0.06)),
  );

  return (
    <motion.div ref={ref} className={`relative ${className}`} style={{ opacity: ink }}>
      {typeof children === "function" ? children(emerge, after) : children}
    </motion.div>
  );
}

/** a figure that counts up while its line crosses the print head —
 *  the zero spins through random digits and lands right back on 0 */
function PrintedCount({
  value,
  suffix,
  emerge,
}: {
  value: number;
  suffix: string;
  emerge: MotionValue<number>;
}) {
  const text = useTransform(emerge, (e) => {
    if (e >= 1) return String(value);
    if (value === 0) return e > 0 ? String(Math.floor(Math.random() * 10)) : "0";
    return String(Math.round(value * (1 - (1 - e) ** 2)));
  });
  return (
    <span className="font-display text-[clamp(1.7rem,5.2svh,3.3rem)] leading-none font-[460] text-ink lining-nums tabular-nums">
      <motion.span>{text}</motion.span>
      {suffix && <span className="text-terracotta">{suffix}</span>}
    </span>
  );
}

/** pencilled aside next to a row: a loose arrow draws itself, then the words */
function MarginNote({ text, after }: { text: string; after: MotionValue<number> }) {
  const textOpacity = useTransform(after, [0.45, 1], [0, 1]);
  const textX = useTransform(after, [0.45, 1], [-8, 0]);
  return (
    <div
      className="pointer-events-none absolute top-1/2 left-[calc(100%+clamp(14px,2.2vw,36px))] flex w-[clamp(150px,17vw,250px)] -translate-y-1/2 items-center gap-2 tracking-normal normal-case"
      aria-hidden="true"
    >
      <svg className="h-6 w-11 shrink-0 overflow-visible" viewBox="0 0 44 24" fill="none">
        <motion.path
          d="M42 6 C 30 2, 18 16, 4 13 M4 13 L 11 8 M4 13 L 10 19"
          stroke="var(--color-gold)"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pathLength: after }}
        />
      </svg>
      <motion.span
        className="font-display text-[clamp(0.95rem,1.3vw,1.2rem)] leading-tight text-gold italic"
        style={{ opacity: textOpacity, x: textX }}
      >
        {text}
      </motion.span>
    </div>
  );
}

/** zig-zag tear along the top or bottom of the roll */
function TornEdge({ side }: { side: "top" | "bottom" }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-x-0 h-[7px] ${side === "top" ? "-top-[6px]" : "-bottom-[6px] rotate-180"}`}
      style={{
        background:
          "linear-gradient(135deg, transparent 50%, var(--color-paper) 50%) 0 0 / 10px 7px repeat-x, linear-gradient(225deg, transparent 50%, var(--color-paper) 50%) 0 0 / 10px 7px repeat-x",
      }}
    />
  );
}

const SPECKS = Array.from({ length: 11 }, (_, i) => {
  const a = (i / 11) * Math.PI * 2 + jitter(i + 3) * 0.5;
  const d = 70 + jitter(i + 17) * 70;
  return { x: Math.cos(a) * d, y: Math.sin(a) * d * 0.6, s: 3 + jitter(i + 29) * 5 };
});

/** the rubber stamp: drops from above the desk, slams, spits ink */
function Stamp({ stamped }: { stamped: boolean }) {
  return (
    <div className="pointer-events-none absolute top-[50%] left-[42%] z-2" aria-hidden="true">
      {SPECKS.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-terracotta-deep"
          style={{ width: s.s, height: s.s, left: -s.s / 2, top: -s.s / 2 }}
          initial={false}
          animate={
            stamped
              ? { x: s.x, y: s.y, opacity: 0.75, scale: 1 }
              : { x: 0, y: 0, opacity: 0, scale: 0 }
          }
          transition={{ duration: stamped ? 0.35 : 0.15, ease: EASE, delay: stamped ? 0.08 : 0 }}
        />
      ))}
      <motion.div
        className="-translate-x-1/2 -translate-y-1/2 mix-blend-multiply"
        initial={false}
        animate={
          stamped
            ? { opacity: 0.9, scale: 1, rotate: -11 }
            : { opacity: 0, scale: 2.6, rotate: -26 }
        }
        transition={
          stamped ? { type: "spring", stiffness: 560, damping: 24, mass: 0.9 } : { duration: 0.2 }
        }
      >
        <div
          className="rounded-[10px] border-[3px] border-terracotta-deep p-[5px] text-terracotta-deep"
          style={{ maskImage: STAMP_MASK, WebkitMaskImage: STAMP_MASK, maskSize: "160px" }}
        >
          <div className="rounded-[6px] border border-terracotta-deep px-[clamp(14px,1.6vw,22px)] py-[6px] text-center">
            <div className="font-display text-[clamp(1.5rem,4.4svh,2.7rem)] leading-none font-[720] tracking-[0.08em] uppercase">
              Verified
            </div>
            <div className="mt-1 font-mono text-[0.56rem] tracking-[0.32em]">
              NEBULA · LISBOA · 2026
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/** the receipt itself — content only; the scene feeds it out of the printer */
function Receipt({ stamped }: { stamped: boolean }) {
  return (
    <div className="relative flex h-full flex-col bg-paper px-[clamp(16px,1.8vw,26px)] pt-[2.6svh] pb-[2.2svh] font-mono text-[0.66rem] tracking-[0.14em] text-ink-soft uppercase shadow-[0_30px_60px_rgb(0_0_0/0.45)]">
      <TornEdge side="top" />
      <TornEdge side="bottom" />
      {/* faint thermal-paper sheen */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "linear-gradient(100deg, transparent 20%, rgb(255 255 255 / 0.5) 35%, transparent 50%), linear-gradient(180deg, rgb(36 31 26 / 0.04), transparent 30%, rgb(36 31 26 / 0.06))",
        }}
        aria-hidden="true"
      />

      <PrintLine className="text-center">
        <div className="font-display text-[clamp(1.1rem,2.8svh,1.6rem)] tracking-[0.02em] text-ink normal-case">
          ✳ Nebula Studio ✳
        </div>
      </PrintLine>
      <PrintLine className="mt-[0.8svh] text-center">Rua das Flores 28 · Lisboa</PrintLine>
      <PrintLine className="flex justify-between">
        <span>Receipt Nº 2018—2026</span>
        <span>06/10/26</span>
      </PrintLine>
      <PrintLine className="my-[1.2svh] border-b border-dashed border-ink/30">{null}</PrintLine>
      <PrintLine className="flex justify-between text-[0.6rem] text-muted">
        <span>Item</span>
        <span>Qty</span>
      </PrintLine>

      <div className="flex flex-1 flex-col">
        {stats.map((stat, i) => (
          <PrintLine
            key={stat.label}
            className="flex flex-1 items-end gap-[10px] border-b border-dotted border-ink/20 pb-[1svh]"
          >
            {(emerge, after) => (
              <>
                <span className="mb-[0.5em] max-w-[13ch] leading-snug">{stat.label}</span>
                <span className="mb-[0.75em] flex-1 border-b border-dotted border-ink/35" />
                <PrintedCount value={stat.value} suffix={stat.suffix} emerge={emerge} />
                <MarginNote text={NOTES[i]} after={after} />
              </>
            )}
          </PrintLine>
        ))}
      </div>

      <PrintLine className="mt-[1.6svh] flex justify-between">
        <span>Talk</span>
        <span>0.00</span>
      </PrintLine>
      <PrintLine className="flex justify-between font-[600] text-ink">
        <span>Proof</span>
        <span>Priceless</span>
      </PrintLine>
      <PrintLine className="my-[1.2svh] border-b-[3px] border-double border-ink/40">
        {null}
      </PrintLine>
      <PrintLine className="h-[4.2svh]">
        <div
          className="mx-auto h-full w-[78%]"
          style={{
            background:
              "repeating-linear-gradient(90deg, var(--color-ink) 0 2px, transparent 2px 4px, var(--color-ink) 4px 5px, transparent 5px 8px, var(--color-ink) 8px 11px, transparent 11px 12px)",
          }}
        />
      </PrintLine>
      <PrintLine className="mt-[1svh] text-center text-[0.58rem]">
        Thank you · counted the slow way
      </PrintLine>

      <Stamp stamped={stamped} />
    </div>
  );
}

/** Retro thermal printer: paper slot on top, status LED that glows while
 *  it prints, and a body that hums with the speed of the scroll. */
function Printer({ hum }: { hum: MotionValue<number> }) {
  const ledOpacity = useTransform(hum, [0, 1], [0.25, 1]);
  const zip = useTransform(hum, [0, 1], [0, 0.9]);
  return (
    <div className="relative h-[15svh] w-[calc(var(--rw)+56px)]">
      {/* print head glow, right at the slot */}
      <motion.div
        className="absolute inset-x-[22px] -top-[3px] h-[6px] rounded-full bg-gold blur-[5px]"
        style={{ opacity: zip }}
      />
      <div className="absolute inset-0 overflow-hidden rounded-t-[14px] rounded-b-[22px] bg-[linear-gradient(180deg,#efe4cf,#d6c6a8_55%,#b9a682)] shadow-[0_24px_50px_rgb(0_0_0/0.55),inset_0_2px_0_rgb(255_255_255/0.6)]">
        {/* the slot */}
        <div className="absolute inset-x-[18px] top-[7px] h-[7px] rounded-full bg-[#1d1915] shadow-[inset_0_2px_3px_rgb(0_0_0/0.8)]" />
        {/* terracotta band */}
        <div className="absolute inset-x-0 top-[34%] h-[18%] bg-terracotta/90" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-[18px] pb-[1.6svh]">
          <span className="font-mono text-[0.58rem] tracking-[0.3em] text-ink-soft">
            NEBULA TALLY·2000
          </span>
          <span className="flex items-center gap-[10px]">
            <motion.span
              className="size-[7px] rounded-full bg-[#7dffb0] shadow-[0_0_8px_#7dffb0]"
              style={{ opacity: ledOpacity }}
            />
            <span className="size-[14px] rounded-full bg-ink/80 shadow-[inset_0_-2px_0_rgb(255_255_255/0.15)]" />
          </span>
        </div>
        {/* speaker grille */}
        <div
          className="absolute top-[60%] left-[18px] h-[16%] w-[22%] opacity-40"
          style={{
            background:
              "repeating-linear-gradient(90deg, var(--color-ink) 0 2px, transparent 2px 6px)",
          }}
        />
      </div>
    </div>
  );
}

/** Green-glass banker's lamp hanging over the desk. Its cone of light (with
 *  dust drifting through it) swings when the stamp shakes the table. */
function BankersLamp({ dark, stamped }: { dark: boolean; stamped: boolean }) {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0"
      initial={false}
      animate={dark ? { opacity: [0, 1, 0.15, 0.95, 0.35, 1] } : { opacity: 0 }}
      transition={
        dark
          ? { duration: 0.9, delay: 0.3, times: [0, 0.08, 0.2, 0.34, 0.48, 1] }
          : { duration: 0.2 }
      }
      aria-hidden="true"
    >
      {/* warm pool on the desk */}
      <div
        className="absolute bottom-[-12svh] left-1/2 h-[60svh] w-[90vw] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(closest-side, rgb(255 206 140 / 0.24), rgb(255 206 140 / 0.08) 55%, transparent)",
        }}
      />
      <motion.div
        className="absolute top-0 left-1/2 h-full w-0"
        style={{ transformOrigin: "50% 0%" }}
        initial={false}
        animate={stamped ? { rotate: [0, 5.5, -4, 2.4, -1.2, 0.4, 0] } : { rotate: 0 }}
        transition={{ duration: stamped ? 2.6 : 0.3, ease: "easeOut" }}
      >
        {/* cord */}
        <div className="absolute top-0 left-0 h-[3svh] w-px -translate-x-1/2 bg-paper/25" />
        {/* light cone — soft edges come from the conic stops and the fade from
            a mask, so the swinging cone needs no blur filter (a full-screen
            blur cost 50–95ms GPU stalls the first time the scene appeared) */}
        <div className="absolute top-[7svh] left-0 h-[95svh] w-[78vw] -translate-x-1/2">
          <div
            className="absolute inset-0"
            style={{
              background:
                "conic-gradient(from 180deg at 50% -16%, rgb(255 222 168 / 0.42) 0deg, rgb(255 222 168 / 0.36) 24deg, transparent 30deg 330deg, rgb(255 222 168 / 0.36) 336deg, rgb(255 222 168 / 0.42) 360deg)",
              maskImage: "linear-gradient(180deg, #000, rgb(0 0 0 / 0.55) 60%, transparent 96%)",
              WebkitMaskImage:
                "linear-gradient(180deg, #000, rgb(0 0 0 / 0.55) 60%, transparent 96%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{ clipPath: "polygon(43% 0, 57% 0, 100% 100%, 0 100%)" }}
          >
            <Motes variant="dust" count={16} seed={91} />
          </div>
        </div>
        {/* bulb glow under the shade */}
        <div className="absolute top-[5svh] left-0 size-[110px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_236_200/0.9),rgb(255_206_140/0.25)_50%,transparent)]" />
        {/* the green glass shade */}
        <svg
          className="absolute top-[2.6svh] left-0 h-[6svh] w-[min(260px,22vw)] -translate-x-1/2 overflow-visible"
          viewBox="0 0 260 60"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="lamp-glass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3f7a5f" />
              <stop offset="0.6" stopColor="#2f5d50" />
              <stop offset="1" stopColor="#1c3a30" />
            </linearGradient>
          </defs>
          <path d="M14 56 C 30 10, 80 2, 130 2 C 180 2, 230 10, 246 56 Z" fill="url(#lamp-glass)" />
          <path
            d="M40 30 C 70 12, 110 8, 150 9"
            stroke="rgb(255 255 255 / 0.28)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <rect x="8" y="54" width="244" height="5" rx="2.5" fill="#c9a24b" />
        </svg>
      </motion.div>
    </motion.div>
  );
}

function StatsReceipt() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [dark, setDark] = useState(false); // past the switch: caption sits under the lamp
  const [dawn, setDawn] = useState(false); // lights back on at the very end
  const [stamped, setStamped] = useState(false);
  const [torn, setTorn] = useState(false);
  const scrollYProgress = usePinnedScroll(ref);

  const printed = useTransform(scrollYProgress, PRINT, [0, 1]);
  const paperY = useTransform(printed, (p) => `${(1 - p) * 100}%`);
  const printerY = useTransform(
    scrollYProgress,
    [RISE[0], RISE[1], 0.9, 0.95],
    ["130%", "0%", "0%", "160%"],
  );
  const deskOpacity = useTransform(scrollYProgress, [RISE[0], RISE[0] + 0.04], [0, 1]);

  /* the torn receipt flutters up like a leaf caught in the lamp's heat */
  const flyY = useTransform(scrollYProgress, FLY, ["0svh", "-125svh"]);
  const flyX = useTransform(scrollYProgress, FLY, ["0vw", "14vw"]);
  const flyRotate = useTransform(scrollYProgress, (p) => {
    const t = clamp01((p - FLY[0]) / (FLY[1] - FLY[0]));
    return -16 * t + Math.sin(t * Math.PI * 3) * 9 * t;
  });
  const flyRotateX = useTransform(scrollYProgress, FLY, [0, 38]);

  /* the printer hums with the scroll speed while it's feeding paper */
  const velocity = useVelocity(scrollYProgress);
  const hum = useMotionValue(0);
  const shiver = useMotionValue(0);
  useAnimationFrame((t) => {
    const p = scrollYProgress.get();
    const printing = p > PRINT[0] && p < PRINT[1];
    const target = printing ? Math.min(1, Math.abs(velocity.get()) * 4) : 0;
    const h = hum.get() + (target - hum.get()) * 0.18;
    hum.set(h < 0.002 ? 0 : h);
    shiver.set(reduce ? 0 : Math.sin(t * 0.11) * h * 1.3);
  });

  /* a little 3D parallax: the desk leans toward the cursor */
  const tiltX = useSpring(0, { stiffness: 120, damping: 20 });
  const tiltY = useSpring(0, { stiffness: 120, damping: 20 });
  const handleMove = (e: PointerEvent<HTMLElement>) => {
    tiltY.set((e.clientX / window.innerWidth - 0.5) * 9);
    tiltX.set(-(e.clientY / window.innerHeight - 0.5) * 6);
  };

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    setDark((prev) => (prev === p >= DARK_AT ? prev : p >= DARK_AT));
    setDawn((prev) => (prev === p >= DAWN_AT ? prev : p >= DAWN_AT));
    setStamped((prev) => (prev === p >= STAMP_AT ? prev : p >= STAMP_AT));
    setTorn((prev) => (prev === p >= TEAR_AT ? prev : p >= TEAR_AT));
  });

  return (
    <PrintContext.Provider value={printed}>
      <section
        id="studio"
        ref={ref}
        className="relative h-[460vh] bg-[#16130f]"
        onPointerMove={handleMove}
      >
        <div
          className="sticky top-0 h-svh overflow-hidden"
          style={{ ["--rw" as string]: "clamp(300px, 27vw, 420px)" }}
        >
          {/* daylight, until someone flips the switch */}
          <motion.div
            className="absolute inset-0 bg-cream"
            initial={false}
            animate={{ opacity: dark && !dawn ? 0 : 1 }}
            transition={{ duration: dark && !dawn ? 0.18 : 0.35 }}
          />

          <BankersLamp dark={dark && !dawn} stamped={stamped} />

          {/* "Talk is cheap." — centre stage by day, the caption under the lamp */}
          <motion.div
            initial={false}
            animate={{ opacity: dawn ? 0 : 1 }}
            transition={{ duration: 0.3 }}
            className={`absolute inset-0 z-3 flex flex-col ${
              dark
                ? "items-start justify-start pt-[20svh] pl-[clamp(24px,6vw,96px)]"
                : "items-center justify-center text-center"
            }`}
          >
            <motion.span
              layout="position"
              className="eyebrow mb-[2svh]"
              initial={false}
              animate={{ color: dark ? "#ffdba6" : "#c44a26" }}
              transition={{ layout: { duration: 0.9, ease: EASE } }}
            >
              The receipts
            </motion.span>
            <motion.h2
              layout
              className={`whitespace-nowrap ${dark ? "text-[clamp(2.2rem,4.2vw,4.4rem)]" : "text-[clamp(3.2rem,9vw,9rem)]"} leading-[0.95] font-[460] tracking-[-0.02em]`}
              initial={false}
              animate={{ color: dark ? "#fbf6ec" : "#241f1a" }}
              transition={{ layout: { duration: 0.9, ease: EASE }, color: { duration: 0.4 } }}
            >
              Talk is <em className="text-terracotta italic">cheap.</em>
            </motion.h2>
            <motion.p
              layout="position"
              className="mt-[2.4svh] max-w-[26ch] font-display text-[clamp(1.05rem,1.6vw,1.45rem)] leading-snug italic"
              initial={false}
              animate={{ color: dark ? "rgb(251 246 236 / 0.7)" : "#514738" }}
              transition={{ layout: { duration: 0.9, ease: EASE } }}
            >
              {dark
                ? "So here are the receipts — eight years, printed live."
                : "Keep scrolling. We brought receipts."}
            </motion.p>
          </motion.div>

          {/* the desk: printer + paper, shaken by the stamp, leaning to the cursor */}
          <motion.div
            className="absolute inset-x-0 bottom-[4svh] z-2 flex justify-center"
            style={{
              opacity: deskOpacity,
              rotateX: tiltX,
              rotateY: tiltY,
              transformPerspective: 1400,
            }}
          >
            <motion.div
              className="flex flex-col items-center"
              initial={false}
              animate={
                stamped ? { x: [0, -7, 6, -4, 2, 0], y: [0, 6, -3, 2, 0, 0] } : { x: 0, y: 0 }
              }
              transition={{ duration: stamped ? 0.5 : 0.2, delay: stamped ? 0.06 : 0 }}
            >
              {/* everything above the slot; nothing shows below it */}
              <div
                className="relative h-[64svh] w-(--rw)"
                style={{ clipPath: "inset(-200svh -80vw 0 -80vw)" }}
              >
                <motion.div
                  className="absolute inset-0"
                  style={{
                    y: flyY,
                    x: flyX,
                    rotate: flyRotate,
                    rotateX: flyRotateX,
                    transformPerspective: 900,
                  }}
                >
                  <motion.div
                    className="absolute inset-0"
                    initial={false}
                    animate={torn ? { y: -16, rotate: -1.8 } : { y: 0, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 14 }}
                  >
                    <motion.div
                      className="absolute inset-0 will-change-transform"
                      style={{ y: paperY, x: shiver }}
                    >
                      <Receipt stamped={stamped} />
                    </motion.div>
                  </motion.div>
                </motion.div>
              </div>
              <motion.div style={{ y: printerY, x: shiver }}>
                <Printer hum={hum} />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </PrintContext.Provider>
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
  return reduce || coarsePointer || narrow ? <StatsStacked /> : <StatsReceipt />;
}
