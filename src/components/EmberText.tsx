import { type RefObject, useEffect, useRef } from "react";

type EmberTextProps = {
  /** positioned box the canvas fills; all coordinates are local to it (unscaled) */
  stageRef: RefObject<HTMLElement | null>;
  /** holds the real (transparent) headline; each `[data-ember-word]` is rebuilt in embers,
   *  `data-accent` words burn terracotta */
  textRef: RefObject<HTMLElement | null>;
  /** element the spark fuse runs to and lights (and re-lights on hover) */
  targetRef: RefObject<HTMLElement | null>;
  active: boolean;
  /** true once the fuse reaches the target, false again when the embers blow away */
  onLitChange: (lit: boolean) => void;
};

/** A headline made of a few thousand live embers. On `active` they burst from
 *  the rim of the viewport, spiral in and land word by word; at rest they
 *  flicker, pop and shed rising sparks; the cursor is a gust of wind that
 *  scatters and heats them before they drift home. One canvas, typed arrays,
 *  and only ~10 fill calls per frame (particles are batched by colour). */
export function EmberText({ stageRef, textRef, targetRef, active, onLitChange }: EmberTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EmberEngine | null>(null);
  const litRef = useRef(onLitChange);

  useEffect(() => {
    litRef.current = onLitChange;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const text = textRef.current;
    const target = targetRef.current;
    if (!canvas || !stage || !text || !target) return;
    const engine = createEmberEngine(canvas, stage, text, target, (lit) => litRef.current(lit));
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [stageRef, textRef, targetRef]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (active) engine.enter();
    else engine.leave();
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-1 size-full"
      aria-hidden="true"
    />
  );
}

type EmberEngine = { enter: () => void; leave: () => void; destroy: () => void };

/* ---- tuning ---- */
const TARGET_COUNT = 6500; // embers in the whole headline, whatever the screen size
const FLIGHT_MS = [1100, 1700] as const;
const SPRING = 0.03;
const DAMPING = 0.9;
const LEAVE_MS = 700;
const WAVE_SPEED = 1.9; // px/ms the ignition shimmer sweeps across the headline
const MAX_SPARKS = 420;

/* brightness ramps (dim → white-hot) for plain and accent words */
const PALETTE = [
  [
    "rgb(240 200 160 / 0.45)",
    "rgb(252 228 196 / 0.78)",
    "rgb(255 240 218 / 0.96)",
    "rgb(255 214 150 / 1)",
    "rgb(255 250 238 / 1)",
  ],
  [
    "rgb(196 74 38 / 0.5)",
    "rgb(224 97 58 / 0.8)",
    "rgb(240 128 72 / 0.96)",
    "rgb(255 186 112 / 1)",
    "rgb(255 238 206 / 1)",
  ],
];
const LEVELS = PALETTE[0].length;

const FLIGHT = 0; // particle mode: spiralling in from the rim
const REST = 1; // particle mode: sprung to its home in the glyph
const RISE = 0; // spark type: heat wisp drifting up
const SEEK = 1; // spark type: fuse spark arcing to the target

/** offset of `el` inside `stage`, ignoring CSS transforms (the stage dollies) */
function offsetWithin(el: HTMLElement, stage: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== stage) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

function createEmberEngine(
  canvas: HTMLCanvasElement,
  stage: HTMLElement,
  text: HTMLElement,
  target: HTMLElement,
  setLit: (lit: boolean) => void,
): EmberEngine {
  const ctx = canvas.getContext("2d")!;
  let W = 0;
  let H = 0;

  /* particle state (struct-of-arrays) */
  let n = 0;
  let x = new Float32Array(0);
  let y = new Float32Array(0);
  let vx = new Float32Array(0);
  let vy = new Float32Array(0);
  let hx = new Float32Array(0);
  let hy = new Float32Array(0);
  let sx = new Float32Array(0);
  let sy = new Float32Array(0);
  let cx = new Float32Array(0);
  let cy = new Float32Array(0);
  let delay = new Float32Array(0);
  let dur = new Float32Array(0);
  let phase = new Float32Array(0);
  let heat = new Float32Array(0);
  let cls = new Uint8Array(0);
  let mode = new Uint8Array(0);
  let buckets: Int32Array[] = [];
  const bucketLen = new Int32Array(PALETTE.length * LEVELS);
  let size = 2;
  let tailIdx: Int32Array = new Int32Array(0); // embers of the last word — the fuse starts there

  /* sparks: rising heat wisps and fuse sparks seeking the target */
  const spX = new Float32Array(MAX_SPARKS);
  const spY = new Float32Array(MAX_SPARKS);
  const spVX = new Float32Array(MAX_SPARKS);
  const spVY = new Float32Array(MAX_SPARKS);
  const spLife = new Float32Array(MAX_SPARKS);
  const spMax = new Float32Array(MAX_SPARKS);
  const spType = new Uint8Array(MAX_SPARKS);
  const spSX = new Float32Array(MAX_SPARKS);
  const spSY = new Float32Array(MAX_SPARKS);
  const spCX = new Float32Array(MAX_SPARKS);
  const spCY = new Float32Array(MAX_SPARKS);
  const spTX = new Float32Array(MAX_SPARKS);
  const spTY = new Float32Array(MAX_SPARKS);
  const spT0 = new Float32Array(MAX_SPARKS);
  let spN = 0;

  /* pointer gust, in stage-local px */
  let px = -1e5;
  let py = -1e5;
  let pvx = 0;
  let pvy = 0;

  let state: "idle" | "in" | "out" = "idle";
  let t0 = 0;
  let leaveAt = 0;
  let landed = 0;
  let minHX = 0;
  let maxHX = 0;
  let waveAt = 0; // when the ignition shimmer started sweeping (0 = not yet)
  let lit = false;
  let raf = 0;
  let last = 0;
  let lastHoverBurst = 0;
  let alive = true;

  const resizeCanvas = () => {
    W = stage.offsetWidth;
    H = stage.offsetHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  /** rasterize the real headline offscreen and turn its ink into ember homes */
  const sample = () => {
    const words = text.querySelectorAll<HTMLElement>("[data-ember-word]");
    const off = document.createElement("canvas");
    off.width = Math.max(1, W);
    off.height = Math.max(1, H);
    const oc = off.getContext("2d", { willReadFrequently: true })!;
    oc.textBaseline = "alphabetic";
    let minX = W;
    let minY = H;
    let maxX = 0;
    let maxY = 0;
    for (const word of words) {
      const { x: wx, y: wy } = offsetWithin(word, stage);
      const cs = getComputedStyle(word);
      oc.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      // red channel = plain ink, green channel = accent ink
      oc.fillStyle = word.dataset.accent !== undefined ? "#00ff00" : "#ff0000";
      const m = oc.measureText(word.textContent ?? "");
      const asc = m.fontBoundingBoxAscent;
      const desc = m.fontBoundingBoxDescent;
      const baseline = wy + (word.offsetHeight - (asc + desc)) / 2 + asc;
      oc.fillText(word.textContent ?? "", wx, baseline);
      minX = Math.min(minX, wx);
      minY = Math.min(minY, wy);
      maxX = Math.max(maxX, wx + m.width + 8);
      maxY = Math.max(maxY, wy + word.offsetHeight + 8);
    }
    minX = Math.max(0, Math.floor(minX));
    minY = Math.max(0, Math.floor(minY));
    const bw = Math.min(W, Math.ceil(maxX)) - minX;
    const bh = Math.min(H, Math.ceil(maxY)) - minY;
    if (bw <= 0 || bh <= 0) return { homes: [] as number[], step: 3 };
    const data = oc.getImageData(minX, minY, bw, bh).data;

    let filled = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 120) filled++;
    const step = Math.max(2.6, Math.sqrt(filled / TARGET_COUNT));

    const homes: number[] = []; // x, y, class triples
    for (let gy = step / 2; gy < bh; gy += step) {
      for (let gx = step / 2; gx < bw; gx += step) {
        const k = (Math.floor(gy) * bw + Math.floor(gx)) * 4;
        if (data[k + 3] <= 120) continue;
        homes.push(
          minX + gx + (Math.random() - 0.5) * step * 0.45,
          minY + gy + (Math.random() - 0.5) * step * 0.45,
          data[k + 1] > data[k] ? 1 : 0,
        );
      }
    }
    return { homes, step };
  };

  const build = (fly: boolean) => {
    resizeCanvas();
    const { homes, step } = sample();
    n = homes.length / 3;
    size = Math.min(2.6, Math.max(1.5, step * 0.62));
    x = new Float32Array(n);
    y = new Float32Array(n);
    vx = new Float32Array(n);
    vy = new Float32Array(n);
    hx = new Float32Array(n);
    hy = new Float32Array(n);
    sx = new Float32Array(n);
    sy = new Float32Array(n);
    cx = new Float32Array(n);
    cy = new Float32Array(n);
    delay = new Float32Array(n);
    dur = new Float32Array(n);
    phase = new Float32Array(n);
    heat = new Float32Array(n);
    cls = new Uint8Array(n);
    mode = new Uint8Array(n);
    buckets = Array.from({ length: PALETTE.length * LEVELS }, () => new Int32Array(n));

    /* the portal rim the embers burst from, and the vortex they spiral down */
    const ox = W / 2;
    const oy = H * 0.45;
    const rim = Math.hypot(W, H) * 0.5;
    minHX = Infinity;
    maxHX = -Infinity;
    for (let i = 0; i < n; i++) {
      minHX = Math.min(minHX, homes[i * 3]);
      maxHX = Math.max(maxHX, homes[i * 3]);
    }
    const spanX = Math.max(1, maxHX - minHX);
    const swirl = 1.15; // rad the path is bent around the centre

    for (let i = 0; i < n; i++) {
      hx[i] = homes[i * 3];
      hy[i] = homes[i * 3 + 1];
      cls[i] = homes[i * 3 + 2];
      phase[i] = Math.random() * Math.PI * 2;
      const a = Math.random() * Math.PI * 2;
      const r = rim * (0.82 + Math.random() * 0.3);
      sx[i] = ox + Math.cos(a) * r;
      sy[i] = oy + Math.sin(a) * r;
      const ca = a + swirl;
      const cr = r * (0.38 + Math.random() * 0.22);
      cx[i] = ox + Math.cos(ca) * cr;
      cy[i] = oy + Math.sin(ca) * cr;
      // the headline writes itself left → right
      delay[i] = 80 + ((hx[i] - minHX) / spanX) * 560 + Math.random() * 160;
      dur[i] = FLIGHT_MS[0] + Math.random() * (FLIGHT_MS[1] - FLIGHT_MS[0]);
      if (fly) {
        mode[i] = FLIGHT;
        x[i] = sx[i];
        y[i] = sy[i];
      } else {
        mode[i] = REST;
        x[i] = hx[i];
        y[i] = hy[i];
      }
    }

    /* the fuse leaves from the bottom-right-most embers ("for.") */
    const order = Array.from({ length: n }, (_, i) => i).sort(
      (a, b) => hx[b] + hy[b] * 3 - (hx[a] + hy[a] * 3),
    );
    tailIdx = Int32Array.from(order.slice(0, Math.max(1, Math.floor(n * 0.06))));
    landed = fly ? 0 : n;
  };

  const targetLine = () => {
    const { x: tx, y: ty } = offsetWithin(target, stage);
    return { tx, ty: ty + target.offsetHeight * 0.92, tw: target.offsetWidth };
  };

  const addSpark = (type: number) => {
    if (spN >= MAX_SPARKS) return -1;
    const s = spN++;
    spType[s] = type;
    return s;
  };

  /** fuse sparks arcing from embers to the target's underline */
  const launchFuse = (from: Int32Array | null, count: number, spread: number, now: number) => {
    const { tx, ty, tw } = targetLine();
    for (let k = 0; k < count; k++) {
      const s = addSpark(SEEK);
      if (s < 0) break;
      const i = from ? from[(Math.random() * from.length) | 0] : (Math.random() * n) | 0;
      spSX[s] = x[i];
      spSY[s] = y[i];
      spTX[s] = tx + Math.random() * tw;
      spTY[s] = ty + (Math.random() - 0.5) * 4;
      spCX[s] = (spSX[s] + spTX[s]) / 2 + (Math.random() - 0.5) * 220;
      spCY[s] = Math.min(spSY[s], spTY[s]) - 60 - Math.random() * 140;
      spT0[s] = now + Math.random() * spread;
      spMax[s] = 520 + Math.random() * 380;
      spLife[s] = 0;
    }
  };

  const level = (b: number) => (b < 0.5 ? 0 : b < 0.66 ? 1 : b < 0.84 ? 2 : b < 1.1 ? 3 : 4);

  const frame = (now: number) => {
    raf = 0;
    if (!alive) return;
    const dt = Math.min(3, (now - (last || now)) / 16.667 || 1);
    last = now;
    ctx.clearRect(0, 0, W, H);
    bucketLen.fill(0);

    const speed = Math.hypot(pvx, pvy);
    const R = Math.min(150, Math.max(80, W * 0.07));
    const R2 = R * R;
    const push = 1.3 + speed * 0.12;
    const damp = Math.pow(DAMPING, dt);
    const cool = Math.pow(0.93, dt);
    const flick = now * 0.004;
    const elapsed = now - t0;
    const waveX = waveAt ? minHX + (now - waveAt) * WAVE_SPEED : -1e5;

    for (let i = 0; i < n; i++) {
      if (mode[i] === FLIGHT) {
        const t = (elapsed - delay[i]) / dur[i];
        if (t >= 1) {
          mode[i] = REST;
          x[i] = hx[i];
          y[i] = hy[i];
          vx[i] = 0;
          vy[i] = 0;
          heat[i] = 1; // landing flash
          landed++;
        } else if (t > 0) {
          const e = 1 - (1 - t) * (1 - t) * (1 - t);
          const u = 1 - e;
          x[i] = u * u * sx[i] + 2 * u * e * cx[i] + e * e * hx[i];
          y[i] = u * u * sy[i] + 2 * u * e * cy[i] + e * e * hy[i];
          heat[i] = 0.55;
        } else {
          heat[i] = 0.3;
        }
      } else {
        /* gust: blown along the cursor's travel and pushed out of its path */
        const dx = x[i] - px;
        const dy = y[i] - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < R2 && state === "in") {
          const d = Math.sqrt(d2) || 1;
          let f = 1 - d / R;
          f *= f;
          vx[i] += ((dx / d) * push + pvx * 0.22) * f * dt;
          vy[i] += ((dy / d) * push + pvy * 0.22) * f * dt;
        }
        if (state === "out") {
          vy[i] -= 0.12 * dt; // embers lift as they're blown away
        } else {
          vx[i] += (hx[i] - x[i]) * SPRING * dt;
          vy[i] += (hy[i] - y[i]) * SPRING * dt;
        }
        const k = state === "out" ? Math.pow(0.965, dt) : damp;
        vx[i] *= k;
        vy[i] *= k;
        x[i] += vx[i] * dt;
        y[i] += vy[i] * dt;
        const v = vx[i] * vx[i] + vy[i] * vy[i];
        heat[i] = Math.max(heat[i] * cool, Math.min(1, v * 0.02));
        if (Math.random() < 0.0006 * dt) heat[i] = 0.85; // random pop
        const w = x[i] - waveX;
        if (w > -46 && w < 46) heat[i] = Math.max(heat[i], 1 - Math.abs(w) / 46);
      }

      const b = 0.68 + 0.16 * Math.sin(flick * (0.6 + (phase[i] % 1)) + phase[i]) + heat[i] * 0.85;
      const bk = cls[i] * LEVELS + level(b);
      buckets[bk][bucketLen[bk]++] = i;
    }

    if (state === "out") {
      ctx.globalAlpha = Math.max(0, 1 - (now - leaveAt) / LEAVE_MS);
    }
    const half = size / 2;
    for (let c = 0; c < PALETTE.length; c++) {
      for (let l = 0; l < LEVELS; l++) {
        const bk = c * LEVELS + l;
        const len = bucketLen[bk];
        if (!len) continue;
        const list = buckets[bk];
        const s = l >= 3 ? size * 1.25 : size;
        const h = l >= 3 ? s / 2 : half;
        ctx.fillStyle = PALETTE[c][l];
        ctx.beginPath();
        for (let k = 0; k < len; k++) {
          const i = list[k];
          ctx.rect(x[i] - h, y[i] - h, s, s);
        }
        ctx.fill();
      }
    }

    /* heat wisps rising off the resting letters */
    if (state === "in" && landed > n * 0.5 && Math.random() < 0.45 * dt) {
      const s = addSpark(RISE);
      if (s >= 0) {
        const i = (Math.random() * n) | 0;
        spX[s] = x[i];
        spY[s] = y[i];
        spVX[s] = (Math.random() - 0.5) * 0.35;
        spVY[s] = -0.35 - Math.random() * 0.8;
        spLife[s] = 0;
        spMax[s] = 60 + Math.random() * 70;
      }
    }

    /* ignition: once the words have formed a white-hot shimmer sweeps the
       headline, and as it leaves the last letter the fuse runs to the target */
    if (state === "in" && !waveAt && landed >= n * 0.93) waveAt = now;
    if (state === "in" && !lit && waveAt && waveX > maxHX + 40) {
      lit = true;
      launchFuse(tailIdx, 46, 420, now);
    }

    drawSparks(now, dt);
    ctx.globalAlpha = 1;

    pvx *= 0.82;
    pvy *= 0.82;

    if (state === "out" && now - leaveAt >= LEAVE_MS) {
      ctx.clearRect(0, 0, W, H);
      state = "idle";
      n = 0;
      spN = 0;
      return;
    }
    raf = requestAnimationFrame(frame);
  };

  const drawSparks = (now: number, dt: number) => {
    let firstArrival = false;
    for (let s = 0; s < spN; s++) {
      if (spType[s] === RISE) {
        spLife[s] += dt;
        spVX[s] += Math.sin((spLife[s] + s) * 0.15) * 0.02;
        spX[s] += spVX[s] * dt;
        spY[s] += spVY[s] * dt;
        const a = 1 - spLife[s] / spMax[s];
        if (a <= 0) {
          removeSpark(s--);
          continue;
        }
        ctx.fillStyle = `rgb(255 196 128 / ${(a * 0.75).toFixed(2)})`;
        ctx.fillRect(spX[s] - 0.9, spY[s] - 0.9, 1.8, 1.8);
      } else {
        const t = (now - spT0[s]) / spMax[s];
        if (t < 0) continue;
        if (t >= 1) {
          if (spLife[s] === 0) firstArrival = true;
          removeSpark(s--);
          continue;
        }
        // comet: head plus a short tail sampled back along the arc
        for (let k = 0; k < 4; k++) {
          const tt = Math.max(0, t - k * 0.035);
          const e = tt * tt * (3 - 2 * tt);
          const u = 1 - e;
          const qx = u * u * spSX[s] + 2 * u * e * spCX[s] + e * e * spTX[s];
          const qy = u * u * spSY[s] + 2 * u * e * spCY[s] + e * e * spTY[s];
          const r = k === 0 ? 1.6 : 1.2 - k * 0.2;
          ctx.fillStyle = k === 0 ? "#fff6e4" : `rgb(255 170 96 / ${(0.7 - k * 0.18).toFixed(2)})`;
          ctx.fillRect(qx - r, qy - r, r * 2, r * 2);
        }
      }
    }
    if (firstArrival && lit) setLit(true);
  };

  const removeSpark = (s: number) => {
    const e = --spN;
    if (s === e) return;
    spX[s] = spX[e];
    spY[s] = spY[e];
    spVX[s] = spVX[e];
    spVY[s] = spVY[e];
    spLife[s] = spLife[e];
    spMax[s] = spMax[e];
    spType[s] = spType[e];
    spSX[s] = spSX[e];
    spSY[s] = spSY[e];
    spCX[s] = spCX[e];
    spCY[s] = spCY[e];
    spTX[s] = spTX[e];
    spTY[s] = spTY[e];
    spT0[s] = spT0[e];
  };

  const run = () => {
    if (!raf && alive) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  };

  const onMove = (e: PointerEvent) => {
    if (state !== "in") return;
    const rect = stage.getBoundingClientRect();
    const k = W / (rect.width || W);
    const nx = (e.clientX - rect.left) * k;
    const ny = (e.clientY - rect.top) * k;
    if (px > -1e4) {
      pvx = Math.max(-40, Math.min(40, nx - px));
      pvy = Math.max(-40, Math.min(40, ny - py));
    }
    px = nx;
    py = ny;
  };
  const onOut = (e: PointerEvent) => {
    if (!e.relatedTarget) px = py = -1e5;
  };
  const onTargetEnter = () => {
    const now = performance.now();
    if (state !== "in" || !lit || now - lastHoverBurst < 600) return;
    lastHoverBurst = now;
    launchFuse(null, 40, 300, now);
  };

  let resizeTimer = 0;
  const observer = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (state === "in") build(false);
      else resizeCanvas();
    }, 150);
  });
  observer.observe(stage);
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerout", onOut);
  target.addEventListener("pointerenter", onTargetEnter);
  resizeCanvas();

  return {
    enter() {
      if (state === "in") return;
      state = "in";
      lit = false;
      waveAt = 0;
      spN = 0;
      ctx.globalAlpha = 1;
      void document.fonts.ready.then(() => {
        if (!alive || state !== "in") return;
        build(true);
        t0 = performance.now();
        run();
      });
    },
    leave() {
      if (state !== "in") return;
      state = "out";
      leaveAt = performance.now();
      lit = false;
      setLit(false);
      // blow every ember outward from the centre
      const ox = W / 2;
      const oy = H * 0.45;
      for (let i = 0; i < n; i++) {
        if (mode[i] === FLIGHT) {
          mode[i] = REST;
        }
        const dx = x[i] - ox;
        const dy = y[i] - oy;
        const d = Math.hypot(dx, dy) || 1;
        const f = 7 + Math.random() * 13;
        vx[i] = (dx / d) * f + (Math.random() - 0.5) * 4;
        vy[i] = (dy / d) * f + (Math.random() - 0.5) * 4 - 2;
        heat[i] = 1;
      }
      run();
    },
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onOut);
      target.removeEventListener("pointerenter", onTargetEnter);
    },
  };
}
