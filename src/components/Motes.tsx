import type { CSSProperties } from "react";
import { jitter } from "../lib/jitter";

type MotesProps = {
  /** dust = pale specks floating in the hero sunlight; ember = warm glowing
   *  sparks drifting through the night-time CTA */
  variant: "dust" | "ember";
  count?: number;
  /** offsets the deterministic layout so two instances never align */
  seed?: number;
};

/** A handful of slow, CSS-only floating particles. Pure compositor work:
 *  each mote animates transform + opacity on its own timeline. */
export function Motes({ variant, count = 12, seed = 0 }: MotesProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-1 overflow-hidden" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const j = (k: number) => jitter(seed + i * 7 + k);
        const size = 2 + j(1) * 3.5;
        const style: CSSProperties = {
          left: `${4 + j(2) * 92}%`,
          top: `${8 + j(3) * 80}%`,
          width: size,
          height: size,
          animationDuration: `${7 + j(4) * 9}s`,
          animationDelay: `${-j(5) * 16}s`,
          ["--mote-dx" as string]: `${(j(6) - 0.5) * 60}px`,
          ["--mote-dy" as string]: `${-14 - j(7) * 26}px`,
        };
        return <span key={i} className={`mote mote-${variant}`} style={style} />;
      })}
    </div>
  );
}
