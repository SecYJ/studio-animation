import { type CSSProperties, type PointerEvent, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { useMediaQuery } from "../lib/useMediaQuery";
import { jitter } from "../lib/jitter";
import { usePinnedScroll } from "../lib/usePinnedScroll";

const EASE = [0.22, 1, 0.36, 1] as const;

/** strip of masking tape pinning a print to the studio wall */
function Tape({ angle }: { angle: number }) {
  return (
    <span
      aria-hidden="true"
      className="absolute -top-3 left-1/2 z-2 h-7 w-24 border-x border-dashed border-paper/25 bg-paper/20 shadow-[0_2px_6px_rgb(0_0_0/0.25)] backdrop-blur-[1px]"
      style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}
    />
  );
}

type Project = {
  title: string;
  category: string;
  year: string;
  bg: string;
  /** light the print throws on the corridor walls */
  glow: string;
};

const projects: Project[] = [
  {
    title: "Solstice",
    category: "Brand Identity",
    year: "2024",
    bg: "linear-gradient(150deg,#e0613a,#c44a26)",
    glow: "rgb(224 97 58 / 0.55)",
  },
  {
    title: "Marlow & Co.",
    category: "Packaging",
    year: "2023",
    bg: "linear-gradient(150deg,#2f5d50,#234539)",
    glow: "rgb(70 150 120 / 0.5)",
  },
  {
    title: "Fathom",
    category: "Web Platform",
    year: "2024",
    bg: "linear-gradient(150deg,#3a3f7a,#1f2148)",
    glow: "rgb(96 104 210 / 0.55)",
  },
  {
    title: "Ode Coffee",
    category: "Art Direction",
    year: "2023",
    bg: "linear-gradient(150deg,#c9893f,#8a5a1e)",
    glow: "rgb(230 160 80 / 0.5)",
  },
  {
    title: "Halcyon",
    category: "Motion Identity",
    year: "2025",
    bg: "linear-gradient(150deg,#b8455f,#7a2540)",
    glow: "rgb(220 80 120 / 0.5)",
  },
  {
    title: "Verdant",
    category: "Editorial",
    year: "2024",
    bg: "linear-gradient(150deg,#5a7d3a,#33491f)",
    glow: "rgb(140 190 90 / 0.45)",
  },
];

/* four generative motifs, one per print, layered over its gradient */
const MOTIFS = [
  "repeating-radial-gradient(circle at 72% 28%, rgb(255 255 255 / 0.16) 0 1.5px, transparent 1.5px 18px)",
  "repeating-linear-gradient(115deg, rgb(255 255 255 / 0.1) 0 2px, transparent 2px 22px)",
  "radial-gradient(rgb(255 255 255 / 0.22) 1.4px, transparent 1.8px) 0 0 / 16px 16px",
  "repeating-conic-gradient(from 0deg at 30% 70%, rgb(255 255 255 / 0.09) 0deg 6deg, transparent 6deg 18deg)",
];

/** the print itself: gradient, generative motif, giant monogram, sheen */
function Artwork({ project, index }: { project: Project; index: number }) {
  return (
    <>
      <div className="absolute inset-0 z-[-1]" style={{ background: project.bg }} />
      <div
        className="absolute inset-0 z-[-1] mix-blend-soft-light"
        style={{ background: MOTIFS[index % MOTIFS.length] }}
      />
      <div
        className="absolute inset-0 z-[-1]"
        style={{
          background:
            "radial-gradient(circle at 78% 18%, rgb(255 255 255 / 0.3), transparent 45%), radial-gradient(circle at 12% 92%, rgb(0 0 0 / 0.38), transparent 55%)",
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-[-0.08em] bottom-[-0.22em] z-[-1] font-display text-[clamp(10rem,22vw,20rem)] leading-none text-paper/14 italic select-none"
      >
        {project.title[0]}
      </span>
    </>
  );
}

function Card({ project, index }: { project: Project; index: number }) {
  const tilt = (jitter(index * 3 + 1) - 0.5) * 4;
  return (
    <div className="relative" style={{ transform: `rotate(${tilt}deg)` }}>
      <Tape angle={tilt * 1.6 - 3} />
      <article className="relative isolate flex aspect-4/5 flex-col justify-between overflow-hidden rounded-[14px] p-5.5 text-paper shadow-[0_18px_44px_rgb(0_0_0/0.4)]">
        <Artwork project={project} index={index} />
        <span className="font-mono text-[0.78rem] tracking-[0.2em] opacity-85">
          {String(index + 1).padStart(2, "0")} / 06
        </span>
        <div>
          <h3 className="text-card text-paper">{project.title}</h3>
          <div className="mt-1.5 flex justify-between font-mono text-[0.74rem] tracking-[0.12em] uppercase opacity-[0.82]">
            <span>{project.category}</span>
            <span>{project.year}</span>
          </div>
        </div>
      </article>
    </div>
  );
}

/* ---- the gallery corridor ---- */

const ITEMS = projects.length + 1; // the prints, then the door at the end
const PERSPECTIVE = 1000; // px — the camera's lens at rest
const GRID = 160; // px between floor/ceiling grid lines
const RAIL_STEPS = 6; // solid segments each corridor rail fades out over

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** A print hung on the corridor wall. Its 3D placement is written per frame
 *  by the corridor; here it only owns its art and the light-glare that
 *  follows the cursor across the glass. */
function WallPrint({
  project,
  index,
  setRef,
}: {
  project: Project;
  index: number;
  setRef: (el: HTMLDivElement | null) => void;
}) {
  const handleMove = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--gx", `${((e.clientX - r.left) / r.width) * 100}%`);
    e.currentTarget.style.setProperty("--gy", `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  return (
    <div
      ref={setRef}
      className="absolute top-1/2 left-1/2 aspect-4/5 w-(--cw)"
      // the stage isn't preserve-3d, so siblings paint in DOM order — nearer
      // prints (lower index) must sit on top of the ones further down
      style={{ visibility: "hidden", zIndex: ITEMS - index }}
    >
      {/* the print's own colour spilling onto the wall around it */}
      <div
        className="absolute -inset-[22%] -z-10 rounded-[45%] blur-3xl"
        style={{ background: `radial-gradient(closest-side, ${project.glow}, transparent)` }}
        aria-hidden="true"
      />
      <Tape angle={(jitter(index * 3 + 1) - 0.5) * 8 - 3} />
      <article
        className="group relative isolate flex size-full flex-col justify-between overflow-hidden rounded-[14px] p-6 text-paper shadow-[0_40px_80px_rgb(0_0_0/0.55)]"
        onPointerMove={handleMove}
      >
        <Artwork project={project} index={index} />
        {/* glare that tracks the cursor */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(circle at var(--gx, 50%) var(--gy, 30%), rgb(255 255 255 / 0.32), transparent 42%)",
          }}
          aria-hidden="true"
        />
        <span className="font-mono text-[0.78rem] tracking-[0.2em] opacity-85">
          {String(index + 1).padStart(2, "0")} / 06
        </span>
        <div>
          <h3 className="text-card text-paper">{project.title}</h3>
          <div className="mt-1.5 flex justify-between font-mono text-[0.74rem] tracking-[0.12em] uppercase opacity-[0.82]">
            <span>{project.category}</span>
            <span>{project.year}</span>
          </div>
        </div>
      </article>
    </div>
  );
}

/** The rolling caption for the print you're walking up to: letters drop in
 *  out of a blur, one after another. */
function ActiveTitle({ index }: { index: number }) {
  const project = projects[index];
  const label = project ? project.title : "Your project";
  const meta = project ? `${project.category} — ${project.year}` : "Could be next";
  return (
    <div className="relative">
      <div className="mb-2 font-mono text-[0.72rem] tracking-[0.2em] text-terracotta">
        {project ? `${String(index + 1).padStart(2, "0")} / 06` : "07 / ∞"}
      </div>
      <div className="relative h-[1.1em] overflow-hidden text-[clamp(2rem,4.4vw,4rem)] leading-none">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={index} className="flex font-display whitespace-pre text-paper">
            {Array.from(label).map((ch, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ y: "70%", opacity: 0, filter: "blur(8px)" }}
                animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
                exit={{ y: "-60%", opacity: 0, filter: "blur(6px)" }}
                transition={{ duration: 0.5, ease: EASE, delay: i * 0.025 }}
              >
                {ch}
              </motion.span>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-3 font-mono text-[0.72rem] tracking-[0.16em] text-paper/60 uppercase">
        {meta}
      </div>
    </div>
  );
}

/** Walk-through gallery: the prints hang on alternating walls of a 3D
 *  corridor and scrolling dollies the camera down it — out of the fog, past
 *  each print, through the floating heading, to a lit door at the end.
 *  Transforms only; the floor/ceiling grid is projected onto one canvas. */
function WorkCorridor() {
  const ref = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const progress = usePinnedScroll(ref);

  /* fast scrolling pulls the lens wider and streaks the dark — warp */
  const velocity = useVelocity(progress);
  /* heavily damped: trackpad velocity is noisy, and a lens that tracks it
     closely makes the whole corridor breathe in and out — judder */
  const warp = useSpring(
    useTransform(velocity, (v) => Math.min(1, Math.abs(v) * 1.6)),
    { stiffness: 60, damping: 24 },
  );
  const lens = useTransform(warp, (w) => PERSPECTIVE - w * 160);

  /* the cursor lets you look around: it shifts the vanishing point */
  const lookX = useSpring(50, { stiffness: 70, damping: 18 });
  const lookY = useSpring(50, { stiffness: 70, damping: 18 });
  const origin = useMotionTemplate`${lookX}% ${lookY}%`;
  const endGlow = useMotionTemplate`radial-gradient(ellipse 40% 34% at ${lookX}% ${lookY}%, rgb(224 97 58 / 0.16), transparent 70%)`;
  const railScale = useSpring(progress, { stiffness: 140, damping: 26 });

  const handleMove = (e: PointerEvent<HTMLElement>) => {
    lookX.set(50 - (e.clientX / window.innerWidth - 0.5) * 16);
    lookY.set(50 - (e.clientY / window.innerHeight - 0.5) * 12);
  };

  /* the camera rig: one imperative pass per frame places every print, the
     heading, and redraws the floor/ceiling grid for the current depth */
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let activeNow = -1;
    let dpr = 1;

    const resize = () => {
      // faint hairlines: 1.5x is visually identical and a third fewer pixels
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };

    const render = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const P = lens.get();
      const ox = (lookX.get() / 100) * W;
      const oy = (lookY.get() / 100) * H;
      const gap = Math.max(720, W * 0.55);
      const side = W * 0.27;
      const camZ = progress.get() * (ITEMS * gap - gap * 0.55);

      for (let i = 0; i < ITEMS; i++) {
        const el = itemRefs.current[i];
        if (!el) continue;
        const door = i === projects.length;
        const s = door ? 0 : i % 2 === 0 ? -1 : 1;
        const z = -(i + 1) * gap + camZ;
        const y = door ? 0 : (jitter(i + 7) - 0.5) * H * 0.07;
        // out of the fog far away; gone before it brushes past the lens
        const o = clamp01((gap * 3.4 + z) / (gap * 1.2)) * (1 - clamp01((z - P * 0.5) / (P * 0.3)));
        el.style.opacity = String(o);
        el.style.visibility = o <= 0.001 ? "hidden" : "visible";
        el.style.transform = `translate3d(calc(-50% + ${s * side}px), calc(-50% + ${y}px), ${z}px) rotateY(${-s * 32}deg)`;
      }

      const heading = headingRef.current;
      if (heading) {
        const z = -gap * 0.35 + camZ;
        const o = 1 - clamp01((z + 120) / (P * 0.55));
        heading.style.opacity = String(o);
        heading.style.visibility = o <= 0.001 ? "hidden" : "visible";
        heading.style.transform = `translate3d(-50%, -50%, ${z}px)`;
      }

      const next = Math.min(ITEMS - 1, Math.max(0, Math.floor(camZ / gap + 0.25)));
      if (next !== activeNow) {
        activeNow = next;
        setActive(next);
      }

      /* floor + ceiling: grid lines projected by hand onto one 2D canvas —
         crisp at any depth, far cheaper than rastering a giant 3D plane */
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      const nearZ = P * 0.7;
      const farZ = -gap * 4.2;
      const shift = camZ % GRID;
      const project = (wx: number, wy: number, wz: number) => {
        const k = P / (P - wz);
        return [ox + (wx - ox) * k, oy + (wy - oy) * k] as const;
      };
      const floorY = H / 2 + H * 0.36;
      const ceilY = H / 2 - H * 0.36;
      const wallX = W * 0.46;
      for (const wy of [floorY, ceilY]) {
        const strength = wy < H / 2 ? 0.5 : 1; // the ceiling is dimmer than the floor
        // lines across the corridor, marching toward the camera
        for (let z = nearZ - GRID + shift; z > farZ; z -= GRID) {
          const depth = clamp01((nearZ - z) / (nearZ - farZ));
          const a = (1 - depth) ** 2 * 0.22 * strength * Math.min(1, (nearZ - z) / 200);
          if (a < 0.004) continue;
          const [x0, y0] = project(W / 2 - wallX, wy, z);
          const [x1] = project(W / 2 + wallX, wy, z);
          ctx.strokeStyle = `rgb(255 219 166 / ${a.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y0);
          ctx.stroke();
        }
        // rails running down the corridor to the vanishing point. Faded by
        // stepping solid segments, one batched path per step: gradient
        // strokes cost Firefox ~100ms a frame on a canvas this size
        for (let k = 0; k < RAIL_STEPS; k++) {
          const za = nearZ + (farZ - nearZ) * (k / RAIL_STEPS);
          const zb = nearZ + (farZ - nearZ) * ((k + 1) / RAIL_STEPS);
          const fade = (1 - k / RAIL_STEPS) ** 1.5;
          for (const edge of [false, true]) {
            ctx.strokeStyle = `rgb(255 219 166 / ${((edge ? 0.5 : 0.24) * strength * fade).toFixed(3)})`;
            ctx.lineWidth = edge ? 1.5 : 1;
            ctx.beginPath();
            for (let j = -4; j <= 4; j++) {
              if ((Math.abs(j) === 4) !== edge) continue; // the corners where wall meets floor
              const wx = W / 2 + (j / 4) * wallX;
              const [x0, y0] = project(wx, wy, za);
              const [x1, y1] = project(wx, wy, zb);
              ctx.moveTo(x0, y0);
              ctx.lineTo(x1, y1);
            }
            ctx.stroke();
          }
        }
        ctx.lineWidth = 1;
      }
      // wall ribs: uprights joining floor and ceiling every other grid step
      for (let z = nearZ - GRID * 2 + (camZ % (GRID * 2)); z > farZ; z -= GRID * 2) {
        const depth = clamp01((nearZ - z) / (nearZ - farZ));
        const a = (1 - depth) ** 2 * 0.2 * Math.min(1, (nearZ - z) / 260);
        if (a < 0.004) continue;
        ctx.strokeStyle = `rgb(255 219 166 / ${a.toFixed(3)})`;
        for (const wx of [W / 2 - wallX, W / 2 + wallX]) {
          const [x0, y0] = project(wx, floorY, z);
          const [, y1] = project(wx, ceilY, z);
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x0, y1);
          ctx.stroke();
        }
      }
    };

    resize();
    render();
    const subs = [progress, lens, lookX, lookY].map((v) => v.on("change", render));
    const onResize = () => {
      resize();
      render();
    };
    window.addEventListener("resize", onResize);
    return () => {
      subs.forEach((off) => off());
      window.removeEventListener("resize", onResize);
    };
  }, [progress, lens, lookX, lookY]);

  return (
    <section
      id="work"
      ref={ref}
      className="relative bg-ink text-paper"
      style={{ height: `${100 + ITEMS * 62}svh` }}
      onPointerMove={handleMove}
    >
      <motion.div
        className="sticky top-0 h-svh overflow-hidden"
        style={
          {
            perspective: lens,
            perspectiveOrigin: origin,
            "--cw": "min(30vw, 46svh)",
          } as unknown as CSSProperties
        }
      >
        {/* the far end of the corridor glows */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ background: endGlow }}
          aria-hidden="true"
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 size-full"
          aria-hidden="true"
        />
        {/* warp streaks, only when you scroll hard */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: warp,
            background:
              "repeating-conic-gradient(from 0deg at 50% 50%, rgb(255 236 210 / 0.12) 0deg 0.35deg, transparent 0.35deg 5deg)",
            maskImage: "radial-gradient(circle at 50% 50%, transparent 18%, #000 70%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 50%, transparent 18%, #000 70%)",
          }}
          aria-hidden="true"
        />

        {/* the heading hangs in the air at the corridor mouth — walk through it */}
        <div
          ref={headingRef}
          className="pointer-events-none absolute top-1/2 left-1/2 flex flex-col items-center whitespace-nowrap"
          style={{ zIndex: ITEMS + 1 }}
        >
          <span className="eyebrow mb-4 text-terracotta">06 projects — step inside</span>
          <h2 className="text-[clamp(3.4rem,10vw,10rem)] leading-[0.9] font-[440] tracking-[-0.03em] text-paper">
            Selected <em className="text-terracotta italic">work</em>
          </h2>
        </div>

        {projects.map((project, i) => (
          <WallPrint
            key={project.title}
            project={project}
            index={i}
            setRef={(el) => {
              itemRefs.current[i] = el;
            }}
          />
        ))}

        {/* the door at the end of the corridor */}
        <a
          ref={(el) => {
            itemRefs.current[projects.length] = el;
          }}
          href="#contact"
          className="group absolute top-1/2 left-1/2 flex aspect-4/5 w-[calc(var(--cw)*1.1)] flex-col justify-between rounded-[18px] border border-terracotta/60 bg-[radial-gradient(circle_at_50%_0%,rgb(255_219_166/0.22),transparent_60%),linear-gradient(180deg,#2a2420,#171310)] p-7 text-paper shadow-[0_0_80px_rgb(224_97_58/0.35),inset_0_0_60px_rgb(224_97_58/0.15)] transition-shadow duration-500 hover:shadow-[0_0_140px_rgb(224_97_58/0.6),inset_0_0_80px_rgb(224_97_58/0.25)]"
          style={{ visibility: "hidden", zIndex: 0 }}
        >
          <span className="font-mono text-[0.78rem] tracking-[0.2em] opacity-60">07 / ∞</span>
          <div>
            <h3 className="text-[clamp(2rem,3.4vw,3.2rem)] leading-[0.95]">
              Your project
              <br />
              <em className="text-terracotta italic">could be next</em>
            </h3>
            <span className="mt-4 inline-block font-mono text-[0.74rem] tracking-[0.14em] text-gold uppercase transition-transform duration-300 group-hover:translate-x-1">
              Start a conversation ↗
            </span>
          </div>
        </a>

        {/* HUD: what you're walking up to, and how far down the corridor you are */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-8 px-[clamp(20px,5vw,64px)] pb-[clamp(20px,4vh,40px)]">
          <ActiveTitle index={active} />
          <div className="mb-2 flex w-[min(38vw,420px)] flex-col gap-3">
            <div className="flex justify-between font-mono text-[0.68rem] tracking-[0.18em]">
              {projects.map((project, i) => (
                <span
                  key={project.title}
                  className={`transition-colors duration-300 ${
                    i === active ? "text-terracotta" : "text-paper/30"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              ))}
            </div>
            <div className="relative h-0.5 overflow-hidden rounded-full bg-paper/15">
              <motion.div
                className="absolute inset-0 origin-left bg-terracotta"
                style={{ scaleX: railScale }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function WorkStacked() {
  return (
    <section id="work" className="bg-ink py-[clamp(80px,12vh,130px)] text-paper">
      <div className="wrap">
        <span className="eyebrow text-terracotta">Selected work — 06 projects</span>
        <div className="mt-[clamp(32px,6vh,56px)] grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[clamp(18px,3vw,32px)]">
          {projects.map((project, i) => (
            <Card key={project.title} project={project} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function Work() {
  const reduce = useReducedMotion();
  // Only drop the corridor where it genuinely hurts: touch devices (vertical
  // swipe should scroll the page) and very small screens.
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const tinyScreen = useMediaQuery("(max-width: 600px)");
  return reduce || coarsePointer || tinyScreen ? <WorkStacked /> : <WorkCorridor />;
}
