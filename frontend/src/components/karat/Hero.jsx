import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { MaskLines, Eyebrow } from "./Reveal";
import { WaitlistForm } from "./WaitlistForm";
import { RingShowcase } from "./RingShowcase";

export const Hero = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const ringY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <section id="top" ref={ref} data-testid="hero-section" className="grain relative overflow-hidden bg-onyx pb-24 pt-36 text-ivory lg:pb-32 lg:pt-44">
      <div className="pointer-events-none absolute left-1/2 top-[-20%] h-[70vh] w-[70vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(212,175,55,0.16),transparent)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 sm:px-8 lg:grid-cols-12 lg:px-16">
        <motion.div style={{ y: textY }} className="lg:col-span-7">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 1 }}>
            <Eyebrow>Karat — for jewelers</Eyebrow>
          </motion.div>
          <h1 data-testid="hero-headline" className="mt-7 font-display text-[2.7rem] font-light leading-[0.98] tracking-[-0.02em] sm:text-6xl lg:text-[3.6rem] xl:text-[5.3rem]">
            <MaskLines delay={0.35} lines={[
              "Turn browsers' ideas",
              "into client",
              <em key="b" className="text-gold-gradient italic">design briefs.</em>,
            ]} />
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 max-w-lg text-base leading-relaxed text-zinc-300 sm:text-lg"
          >
            Prospects design and try on their piece on your website. You consult, manage and brief production in one studio.
          </motion.p>
          <motion.div
            id="waitlist"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 scroll-mt-32"
          >
            <WaitlistForm id="hero" source="hero" />
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-zinc-400">Early access · Limited jeweler cohort</p>
          </motion.div>
        </motion.div>
        <motion.div style={{ y: ringY }} className="lg:col-span-5">
          <RingShowcase />
        </motion.div>
      </div>
    </section>
  );
};
