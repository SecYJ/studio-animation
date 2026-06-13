import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";

const linkClass =
  "relative text-ink-soft transition-colors hover:text-ink " +
  "after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left " +
  "after:scale-x-0 after:bg-terracotta after:transition-transform after:duration-300 hover:after:scale-x-100";

/** Sticky nav that retracts on scroll-down and returns on scroll-up. */
export function Nav() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const previous = scrollY.getPrevious() ?? 0;
    setHidden(y > previous && y > 140);
  });

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-[100] will-change-transform"
      variants={{ visible: { y: 0 }, hidden: { y: "-130%" } }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="wrap">
        <nav className="mt-3.5 flex items-center justify-between rounded-full border border-line bg-paper/75 px-[clamp(18px,4vw,28px)] py-3 backdrop-blur-md backdrop-saturate-150">
          <a
            className="inline-flex items-center gap-[0.5em] font-display text-[1.08rem] font-semibold tracking-[-0.01em]"
            href="#top"
          >
            <span className="size-[9px] rounded-full bg-terracotta" />
            Nebula
          </a>
          <div className="flex gap-[clamp(14px,3vw,34px)] text-[0.86rem] tracking-[0.01em] max-[720px]:hidden">
            <a className={linkClass} href="#work">
              Work
            </a>
            <a className={linkClass} href="#process">
              Process
            </a>
            <a className={linkClass} href="#studio">
              Studio
            </a>
          </div>
          <a
            className="rounded-full bg-ink px-[18px] py-2 text-[0.82rem] text-paper"
            href="#contact"
          >
            Say hello
          </a>
        </nav>
      </div>
    </motion.header>
  );
}
