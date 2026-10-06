import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

type Splat = { x: number; y: number; dx: number; dy: number; r: number; t: number };

const SPLAT_LIFE = 700;

/** Clicking anywhere flicks a few ink droplets off the cursor, like a dipped
 *  pen nib. Canvas is only painted while ink is still wet. */
export function InkTrail() {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reduce || window.matchMedia("(pointer: coarse)").matches) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let splats: Splat[] = [];
    let raf = 0;
    let painting = false;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const wake = () => {
      if (!painting) {
        painting = true;
        raf = requestAnimationFrame(paint);
      }
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

    window.addEventListener("pointerdown", onDown);

    const paint = () => {
      const now = performance.now();
      splats = splats.filter((s) => now - s.t < SPLAT_LIFE);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (const s of splats) {
        const age = (now - s.t) / SPLAT_LIFE;
        const ease = 1 - (1 - age) ** 3;
        ctx.fillStyle = `rgb(196 74 38 / ${(1 - age) * 0.6})`;
        ctx.beginPath();
        ctx.arc(s.x + s.dx * ease, s.y + s.dy * ease, s.r * (1 - age * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }

      if (splats.length > 0) {
        raf = requestAnimationFrame(paint);
      } else {
        painting = false;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
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
