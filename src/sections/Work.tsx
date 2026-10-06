import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from "motion/react";
import { useMediaQuery } from "../lib/useMediaQuery";
import { jitter } from "../lib/jitter";

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
};

const projects: Project[] = [
  {
    title: "Solstice",
    category: "Brand Identity",
    year: "2024",
    bg: "linear-gradient(150deg,#e0613a,#c44a26)",
  },
  {
    title: "Marlow & Co.",
    category: "Packaging",
    year: "2023",
    bg: "linear-gradient(150deg,#2f5d50,#234539)",
  },
  {
    title: "Fathom",
    category: "Web Platform",
    year: "2024",
    bg: "linear-gradient(150deg,#3a3f7a,#1f2148)",
  },
  {
    title: "Ode Coffee",
    category: "Art Direction",
    year: "2023",
    bg: "linear-gradient(150deg,#c9893f,#8a5a1e)",
  },
  {
    title: "Halcyon",
    category: "Motion Identity",
    year: "2025",
    bg: "linear-gradient(150deg,#b8455f,#7a2540)",
  },
  {
    title: "Verdant",
    category: "Editorial",
    year: "2024",
    bg: "linear-gradient(150deg,#5a7d3a,#33491f)",
  },
];

function Card({ project, index }: { project: Project; index: number }) {
  const tilt = (jitter(index * 3 + 1) - 0.5) * 4;
  return (
    <div className="relative" style={{ transform: `rotate(${tilt}deg)` }}>
      <Tape angle={tilt * 1.6 - 3} />
      <article className="group relative isolate flex aspect-4/5 flex-col justify-between overflow-hidden rounded-[14px] p-5.5 text-paper shadow-[0_18px_44px_rgb(0_0_0/0.4)]">
        <div
          className="absolute inset-0 z-[-1] transition-transform duration-600 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
          style={{ background: project.bg }}
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

/** Card in the pinned gallery. Tracks its own distance from the viewport
 *  centre and turns it into a cylindrical carousel: cards swing in with
 *  perspective, settle flat and full-size at centre, and swing out again,
 *  while their gradient slides in counter-parallax behind the content. */
function GalleryCard({
  project,
  index,
  x,
}: {
  project: Project;
  index: number;
  x: MotionValue<number>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  /* every print hangs a little crooked, each in its own way */
  const tilt = (jitter(index * 3 + 1) - 0.5) * 5;
  // untranslated centre of the card in page coords, measured once per layout
  const [center, setCenter] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setCenter(rect.left + rect.width / 2 - x.get());
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [x]);

  // -0.5 = one half-viewport left of centre, 0 = dead centre, +0.5 = right
  const pos = useTransform(x, (v) =>
    center === null ? 0 : (center + v - window.innerWidth / 2) / window.innerWidth,
  );

  const rotateY = useTransform(pos, [-1, 0, 1], [16, 0, -16]);
  const rotateZ = useTransform(pos, [-1, 0, 1], [tilt - 2.5, tilt, tilt + 2.5]);
  const arcY = useTransform(pos, (p) => Math.min(Math.abs(p) * 160, 72));
  const scale = useTransform(pos, (p) => 1 - Math.min(Math.abs(p) * 0.24, 0.13));
  const innerX = useTransform(pos, [-1, 1], ["-11%", "11%"]);

  return (
    <motion.div
      className="flex-none"
      initial={{ opacity: 0, y: 90 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="relative w-[clamp(300px,28vw,700px)] will-change-transform"
        ref={ref}
        style={{ rotateY, rotateZ, y: arcY, scale, transformPerspective: 1100 }}
      >
        <Tape angle={tilt * 1.6 - 3} />
        <article className="group relative isolate flex aspect-4/5 w-full flex-col justify-between overflow-hidden rounded-[14px] p-5.5 text-paper shadow-[0_26px_60px_rgb(0_0_0/0.45)]">
          {/* oversized gradient sliding against the travel direction for depth */}
          <motion.div
            className="absolute inset-y-0 left-[-15%] z-[-1] w-[130%]"
            style={{ x: innerX }}
          >
            <div
              className="size-full transition-transform duration-600 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
              style={{ background: project.bg }}
            />
          </motion.div>
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
      </motion.div>
    </motion.div>
  );
}

function WorkHorizontal() {
  const ref = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => setDistance(Math.max(0, track.scrollWidth - window.innerWidth));
    measure();
    // Re-measure once layout/fonts settle and whenever the track or window resizes.
    const raf = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("load", measure);
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  // Function-form transform stays on Motion's JS path (no native ScrollTimeline
  // acceleration), and always reads the latest measured `distance`.
  const x = useTransform(scrollYProgress, (p) => -distance * p);

  // whole track shears with scroll velocity, springing back flat at rest
  const xVelocity = useVelocity(x);
  const skewX = useSpring(useTransform(xVelocity, [-2200, 2200], [7, -7]), {
    stiffness: 280,
    damping: 40,
  });

  const headerX = useTransform(x, (v) => v * 0.05);
  const railScale = useSpring(scrollYProgress, { stiffness: 140, damping: 26 });

  const activeFloat = useTransform(scrollYProgress, [0, 1], [0, projects.length - 1]);
  useMotionValueEvent(activeFloat, "change", (v) => {
    const idx = Math.min(projects.length - 1, Math.max(0, Math.round(v)));
    setActive((prev) => (prev === idx ? prev : idx));
  });

  return (
    <section
      id="work"
      className="relative bg-ink text-paper"
      ref={ref}
      style={{ height: `calc(100svh + ${distance}px)` }}
    >
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden">
        {/* giant rolling index behind the cards */}
        <div
          className="pointer-events-none absolute top-1/2 right-[2vw] -translate-y-1/2 select-none"
          aria-hidden="true"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              className="block font-display text-mega leading-[0.8] text-paper/6"
              key={active}
              initial={{ y: "40%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "-40%", opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              {String(active + 1).padStart(2, "0")}
            </motion.span>
          </AnimatePresence>
        </div>

        <motion.div
          className="flex items-baseline justify-between gap-5 px-[clamp(20px,5vw,64px)] pb-[clamp(24px,5vh,48px)]"
          style={{ x: headerX }}
        >
          {/* the in-view trigger sits on the h2: the hidden span is fully clipped
              by the overflow mask, so observing it directly never fires */}
          <motion.h2
            className="overflow-hidden text-headline text-paper"
            initial="hidden"
            whileInView="shown"
            viewport={{ once: true }}
          >
            <motion.span
              className="block will-change-transform"
              variants={{ hidden: { y: "110%" }, shown: { y: "0%" } }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            >
              Selected <em className="text-terracotta italic">work</em>
            </motion.span>
          </motion.h2>
          <span className="font-mono text-[0.8rem] tracking-[0.2em] text-terracotta">
            06 projects
          </span>
        </motion.div>

        {/* pb reserves the 72px the outer cards arc down, so they clear the rail */}
        <motion.div
          className="relative z-1 flex items-start gap-[clamp(20px,3vw,40px)] px-[clamp(20px,5vw,64px)] pb-[72px] will-change-transform"
          ref={trackRef}
          style={{ x, skewX }}
        >
          {projects.map((project, i) => (
            <GalleryCard key={project.title} project={project} index={i} x={x} />
          ))}
          <a
            className="relative flex aspect-4/5 w-[clamp(260px,22vw,520px)] flex-none flex-col justify-between rounded-[14px] border border-dashed border-paper/30 p-5.5 text-paper transition-colors duration-400 hover:border-terracotta"
            href="#contact"
          >
            <span className="font-mono text-[0.78rem] tracking-[0.2em] opacity-60">07 / ∞</span>
            <div>
              <h3 className="text-card">
                Your project
                <br />
                could be next
              </h3>
              <span className="mt-3 inline-block font-mono text-[0.74rem] tracking-[0.12em] text-terracotta uppercase">
                Start a conversation ↗
              </span>
            </div>
          </a>
        </motion.div>

        {/* progress rail: index ticks, springy bar, rolling active title */}
        <div className="flex items-center gap-[clamp(16px,3vw,40px)] px-[clamp(20px,5vw,64px)] pt-[clamp(20px,4vh,36px)]">
          <div className="flex shrink-0 gap-[0.9em] font-mono text-[0.7rem] tracking-[0.18em]">
            {projects.map((project, i) => (
              <span
                className={`transition-colors duration-300 ${
                  i === active ? "text-terracotta" : "text-paper/30"
                }`}
                key={project.title}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            ))}
          </div>
          <div className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-paper/15">
            <motion.div
              className="absolute inset-0 origin-left bg-terracotta"
              style={{ scaleX: railScale }}
            />
          </div>
          <div className="min-w-[20ch] shrink-0 overflow-hidden text-right">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                className="block font-mono text-[0.7rem] tracking-[0.18em] text-paper/70 uppercase"
                key={active}
                initial={{ y: "120%" }}
                animate={{ y: "0%" }}
                exit={{ y: "-120%" }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                {projects[active].title} — {projects[active].category}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>
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
  // Only drop the horizontal experience where it genuinely hurts: touch devices
  // (vertical swipe should scroll the page) and very small screens. A narrow
  // *desktop* window keeps the horizontal scroll.
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const tinyScreen = useMediaQuery("(max-width: 600px)");
  return reduce || coarsePointer || tinyScreen ? <WorkStacked /> : <WorkHorizontal />;
}
