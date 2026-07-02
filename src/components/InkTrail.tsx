import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

type StrokePoint = { x: number; y: number; t: number };
type Splat = { x: number; y: number; dx: number; dy: number; r: number; t: number };

const STROKE_LIFE = 850; // ms before a stroke segment dries away
const SPLAT_LIFE = 700;

/** The cursor becomes a dipped pen nib: moving leaves a calligraphic ink
 *  stroke (slow = broad, fast = fine) that dries and fades; clicking spatters
 *  a few droplets. Canvas is only painted while ink is still wet. */
export function InkTrail() {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reduce || window.matchMedia("(pointer: coarse)").matches) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let points: StrokePoint[] = [];
    let splats: Splat[] = [];
    let raf = 0;
    let painting = false;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    };
    resize();
    window.addEventListener("resize", resize);

    const wake = () => {
      if (!painting) {
        painting = true;
        raf = requestAnimationFrame(paint);
      }
    };

    const onMove = (e: PointerEvent) => {
      const last = points[points.length - 1];
      // skip micro-jitter so slow hovering doesn't pile up points
      if (last && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 2.5) return;
      points.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      wake();
    };

    const onDown = (e: PointerEvent) => {
      const now = performance.now();
      for (let i = 0; i < 7; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 6 + Math.random() * 30;
        splats.push({
          x: e.clientX,
          y: e.clientY,
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          r: 1 + Math.random() * 2.6,
          t: now,
        });
      }
      wake();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);

    const paint = () => {
      const now = performance.now();
      points = points.filter((p) => now - p.t < STROKE_LIFE);
      splats = splats.filter((s) => now - s.t < SPLAT_LIFE);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        if (b.t - a.t > 90) continue; // pen was lifted between these points
        const age = (now - b.t) / STROKE_LIFE;
        const speed = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, b.t - a.t);
        // nib physics: pressure (width) drops as the hand speeds up, ink dries thin
        const width = (0.8 + 4.2 / (1 + speed * 2.2)) * (1 - age * 0.75);
        ctx.strokeStyle = `rgb(196 74 38 / ${(1 - age) * 0.5})`;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      for (const s of splats) {
        const age = (now - s.t) / SPLAT_LIFE;
        const ease = 1 - (1 - age) ** 3;
        ctx.fillStyle = `rgb(196 74 38 / ${(1 - age) * 0.6})`;
        ctx.beginPath();
        ctx.arc(s.x + s.dx * ease, s.y + s.dy * ease, s.r * (1 - age * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }

      if (points.length > 1 || splats.length > 0) {
        raf = requestAnimationFrame(paint);
      } else {
        painting = false;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [reduce]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[110]"
      aria-hidden="true"
    />
  );
}
