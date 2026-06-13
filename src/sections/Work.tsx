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
    <article className="card">
      <div className="card__bg" style={{ background: project.bg }} />
      <span className="card__index">{String(index + 1).padStart(2, "0")} / 06</span>
      <div className="card__foot">
        <h3>{project.title}</h3>
        <div className="card__meta">
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
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);

  return (
    <section
      id="work"
      className="work"
      ref={ref}
      style={{ height: `calc(100svh + ${distance}px)` }}
    >
      <div className="work__pin">
        <div className="work__head">
          <h2>
            Selected <em style={{ fontStyle: "italic", color: "var(--terracotta)" }}>work</em>
          </h2>
          <span className="work__count">06 projects</span>
        </div>
        <motion.div className="work__track" ref={trackRef} style={{ x }}>
          {projects.map((project, i) => (
            <Card key={project.title} project={project} index={i} />
          ))}
        </motion.div>
        <p className="work__hint">↓ keep scrolling — the gallery moves sideways</p>
      </div>
    </section>
  );
}

function WorkStacked() {
  return (
    <section id="work" className="work-grid">
      <div className="wrap">
        <span className="eyebrow" style={{ color: "var(--terracotta)" }}>
          Selected work — 06 projects
        </span>
        <div className="work-grid__list">
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
