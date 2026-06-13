import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useMediaQuery } from "../lib/useMediaQuery";

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
  return (
    <article className="group relative isolate flex aspect-4/5 w-[clamp(300px,28vw,700px)] flex-none flex-col justify-between overflow-hidden rounded-[14px] p-5.5 text-paper">
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
  );
}

function WorkHorizontal() {
  const ref = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);

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

  return (
    <section
      id="work"
      className="relative bg-ink text-paper"
      ref={ref}
      style={{ height: `calc(100svh + ${distance}px)` }}
    >
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden">
        <div className="flex items-baseline justify-between gap-5 px-[clamp(20px,5vw,64px)] pb-[clamp(24px,5vh,48px)]">
          <h2 className="text-headline text-paper">
            Selected <em className="text-terracotta italic">work</em>
          </h2>
          <span className="font-mono text-[0.8rem] tracking-[0.2em] text-terracotta">
            06 projects
          </span>
        </div>
        <motion.div
          className="flex gap-[clamp(20px,3vw,40px)] px-[clamp(20px,5vw,64px)] will-change-transform"
          ref={trackRef}
          style={{ x }}
        >
          {projects.map((project, i) => (
            <Card key={project.title} project={project} index={i} />
          ))}
        </motion.div>
        <p className="px-[clamp(20px,5vw,64px)] pt-[clamp(20px,4vh,36px)] font-mono text-[0.72rem] tracking-[0.2em] text-muted uppercase">
          ↓ keep scrolling — the gallery moves sideways
        </p>
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
