import { useRef, useState } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { Motes } from "../components/Motes";
import { useMediaQuery } from "../lib/useMediaQuery";

const EASE = [0.22, 1, 0.36, 1] as const;

/* the moment the portal covers the viewport and the night's own show begins */
const COVERED_AT = 0.56;

const headline: { text: string; accent?: boolean }[] = [
  { text: "Let’s" },
  { text: "make" },
  { text: "something" },
  { text: "worth", accent: true },
  { text: "scrolling", accent: true },
  { text: "for." },
];

/** crescent moon — the door we fly through, re-hung small in the corner */
function Crescent() {
  return (
    <>
      <div
        className="size-full rounded-full"
        style={{
          background: "radial-gradient(circle at 36% 32%, #fbf6ec, #b8ae9a 75%)",
          boxShadow: "0 0 44px rgb(244 237 225 / 0.3)",
        }}
      />
      <div className="absolute top-[-7%] left-[16%] size-[92%] rounded-full bg-ink/90" />
    </>
  );
}

/** The night side of the portal: starfield, headline that rolls in word by
 *  word once the circle covers the screen, match-strike email, footer. */
function NightScene({
  entered,
  dollyScale,
}: {
  entered: boolean;
  dollyScale?: MotionValue<number>;
}) {
  return (
    <motion.div
      className="relative flex h-full flex-col items-center justify-center will-change-transform"
      style={{ scale: dollyScale }}
    >
      {/* stars + a faint nebula, echoing the fuse section */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgb(251 246 236 / 0.15) 1px, transparent 1.5px)",
          backgroundSize: "38px 38px",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute top-[-20%] left-[-10%] aspect-square w-[46vw] rounded-full"
        style={{
          background: "radial-gradient(closest-side, rgb(58 63 122 / 0.35), transparent 72%)",
        }}
        aria-hidden="true"
      />

      {/* the moon lands in the corner once we're through it */}
      <motion.div
        className="pointer-events-none absolute top-[9%] right-[10%] size-[clamp(48px,5vw,76px)] will-change-transform"
        initial={false}
        animate={entered ? { scale: 1, opacity: 1 } : { scale: 0.3, opacity: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 18, delay: entered ? 0.55 : 0 }}
        aria-hidden="true"
      >
        <Crescent />
      </motion.div>

      <motion.div
        initial={false}
        animate={{ opacity: entered ? 1 : 0 }}
        transition={{ duration: 0.8, delay: entered ? 0.7 : 0 }}
      >
        <Motes variant="ember" count={10} seed={57} />
      </motion.div>

      <div className="wrap relative z-2 flex flex-col items-center gap-[clamp(28px,5vh,48px)] text-center">
        <motion.span
          className="eyebrow text-terracotta"
          initial={false}
          animate={entered ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.6, ease: EASE, delay: entered ? 0.12 : 0 }}
        >
          Let&apos;s talk
        </motion.span>

        <h2 className="max-w-[14ch] text-cta">
          {headline.map((word, i) => (
            <span className="inline-block overflow-hidden pb-[0.1em] align-bottom" key={word.text}>
              <motion.span
                className={`inline-block will-change-transform ${
                  word.accent ? "text-terracotta italic" : ""
                }`}
                initial={false}
                animate={entered ? { y: "0%" } : { y: "115%" }}
                transition={{ duration: 0.75, ease: EASE, delay: entered ? 0.2 + i * 0.06 : 0 }}
              >
                {word.text}
              </motion.span>
              {i < headline.length - 1 && <span>&nbsp;</span>}
            </span>
          ))}
        </h2>

        <motion.a
          className="match-link font-display text-[clamp(1.4rem,3vw,2.4rem)] italic"
          href="mailto:hello@nebula.studio"
          initial={false}
          animate={entered ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.65, ease: EASE, delay: entered ? 0.65 : 0 }}
        >
          hello@nebula.studio
        </motion.a>
      </div>

      <motion.div
        className="absolute inset-x-0 bottom-0 px-[clamp(20px,5vw,64px)] pb-[clamp(20px,4vh,36px)]"
        initial={false}
        animate={entered ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.7, ease: EASE, delay: entered ? 0.85 : 0 }}
      >
        <div className="flex w-full flex-wrap justify-between gap-x-[clamp(20px,5vw,60px)] gap-y-[14px] border-t border-[rgb(244_237_225_/_0.2)] pt-6 font-mono text-[0.74rem] tracking-[0.14em] text-[rgb(244_237_225_/_0.6)] uppercase">
          <span>Nebula Studio © 2026</span>
          <span>Lisbon · Remote worldwide</span>
          <span>Instagram — Are.na — LinkedIn</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Scroll portal: a dark moon with a burning corona sits on the daylight
 *  paper; scrolling swells it — clip-path circles, compositor-cheap — until
 *  the night fills the screen and the scene inside plays its entrance. */
function CTAPortal() {
  const ref = useRef<HTMLElement>(null);
  const [entered, setEntered] = useState(false);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  /* portal radius in % of the viewport diagonal; 78% clears the corners */
  const r = useTransform(scrollYProgress, [0.02, COVERED_AT + 0.02], [4.2, 78]);
  const rimR = useTransform(r, (v) => v * 1.07 + 0.55);
  const nightClip = useMotionTemplate`circle(${r}% at 50% 45%)`;
  const rimClip = useMotionTemplate`circle(${rimR}% at 50% 45%)`;

  /* camera dolly: the night starts oversized and settles as we pass through */
  const dollyScale = useTransform(scrollYProgress, [0.02, COVERED_AT + 0.06], [1.22, 1]);
  /* the daylight side gets pushed past the camera */
  const dayScale = useTransform(scrollYProgress, [0, 0.4], [1, 1.14]);
  const dayOpacity = useTransform(scrollYProgress, [0.16, 0.4], [1, 0]);
  /* a pale moon-surface sheen at the centre of the young portal */
  const sheenOpacity = useTransform(scrollYProgress, [0, 0.3], [0.3, 0]);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const inside = p >= COVERED_AT;
    setEntered((prev) => (prev === inside ? prev : inside));
  });

  return (
    <section id="contact" className="relative h-[300vh] bg-paper text-paper" ref={ref}>
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* daylight side: a quiet invitation around the dark moon */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-between py-[clamp(90px,14vh,150px)] text-ink will-change-transform"
          style={{ scale: dayScale, opacity: dayOpacity }}
        >
          <span className="eyebrow text-terracotta-deep">After hours</span>
          <span className="mt-auto mb-[4vh] font-mono text-[0.72rem] tracking-[0.24em] text-muted uppercase">
            Keep scrolling — through the moon
          </span>
        </motion.div>

        {/* burning corona around the portal; the gradient makes it fade as it grows */}
        <motion.div
          className="absolute inset-0"
          style={{
            clipPath: rimClip,
            background:
              "radial-gradient(circle at 50% 45%, #fff3da 0%, var(--color-gold) 10%, var(--color-terracotta) 32%, rgb(224 97 58 / 0) 62%)",
          }}
          aria-hidden="true"
        />

        {/* the night, revealed through the swelling circle */}
        <motion.div className="absolute inset-0 bg-ink" style={{ clipPath: nightClip }}>
          <NightScene entered={entered} dollyScale={dollyScale} />
          {/* moon-surface sheen while the portal is still a moon */}
          <motion.div
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: sheenOpacity,
              background:
                "radial-gradient(circle at 50% 45%, rgb(251 246 236 / 0.5), rgb(251 246 236 / 0.08) 6%, transparent 12%)",
            }}
            aria-hidden="true"
          />
        </motion.div>
      </div>
    </section>
  );
}

/** Calm fallback for touch, small screens and reduced motion — the studio at
 *  night, no portal, content revealed once on approach. */
function CTAStatic() {
  const reduce = useReducedMotion();
  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-ink py-[clamp(96px,14vh,180px)] text-center text-paper"
    >
      {!reduce && (
        <>
          <div
            className="pointer-events-none absolute top-[9%] right-[10%] size-[clamp(48px,5vw,76px)]"
            aria-hidden="true"
          >
            <Crescent />
          </div>
          <Motes variant="ember" count={10} seed={57} />
        </>
      )}

      <motion.div
        className="wrap relative z-2 flex flex-col items-center gap-[clamp(28px,5vh,48px)]"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        <span className="eyebrow text-terracotta">Let&apos;s talk</span>
        <h2 className="max-w-[14ch] text-cta">
          Let&apos;s make something <em className="text-terracotta italic">worth scrolling</em> for.
        </h2>
        <a
          className="match-link font-display text-[clamp(1.4rem,3vw,2.4rem)] italic"
          href="mailto:hello@nebula.studio"
        >
          hello@nebula.studio
        </a>

        <div className="mt-[clamp(60px,12vh,130px)] flex w-full flex-wrap justify-between gap-x-[clamp(20px,5vw,60px)] gap-y-[14px] border-t border-[rgb(244_237_225_/_0.2)] pt-6 font-mono text-[0.74rem] tracking-[0.14em] text-[rgb(244_237_225_/_0.6)] uppercase">
          <span>Nebula Studio © 2026</span>
          <span>Lisbon · Remote worldwide</span>
          <span>Instagram — Are.na — LinkedIn</span>
        </div>
      </motion.div>
    </section>
  );
}

export function CTA() {
  const reduce = useReducedMotion();
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const narrow = useMediaQuery("(max-width: 899px)");
  return reduce || coarsePointer || narrow ? <CTAStatic /> : <CTAPortal />;
}
