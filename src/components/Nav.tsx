import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";

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
      className="nav"
      variants={{ visible: { y: 0 }, hidden: { y: "-130%" } }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="wrap">
        <nav className="nav__inner">
          <a className="nav__logo" href="#top">
            <span className="nav__dot" />
            Nebula
          </a>
          <div className="nav__links">
            <a href="#work">Work</a>
            <a href="#process">Process</a>
            <a href="#studio">Studio</a>
          </div>
          <a className="nav__cta" href="#contact">
            Say hello
          </a>
        </nav>
      </div>
    </motion.header>
  );
}
