import { MotionConfig } from "motion/react";
import { SmoothScroll } from "./components/SmoothScroll";
import { Grain } from "./components/Grain";
import { Daylight } from "./components/Daylight";
import { InkTrail } from "./components/InkTrail";
import { Nav } from "./components/Nav";
import { Hero } from "./sections/Hero";
import { Manifesto } from "./sections/Manifesto";
import { Work } from "./sections/Work";
import { Process } from "./sections/Process";
import { Stats } from "./sections/Stats";
import { CTA } from "./sections/CTA";

function App() {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
      <SmoothScroll />
      <Grain />
      <Daylight />
      <InkTrail />
      <Nav />
      <main className="relative">
        <Hero />
        <Manifesto />
        <Work />
        <Process />
        <Stats />
        <CTA />
      </main>
    </MotionConfig>
  );
}

export default App;
