import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { FadeUp, MaskLines, Eyebrow } from "./Reveal";

const points = [
  ["Design & consult", "Refine each client's concept with them, in one shared workspace."],
  ["Client CRM", "Every enquiry, design and conversation kept in one client record."],
  ["Production briefs", "Turn an approved design into a production-ready brief for your bench."],
];

export const Jewelers = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  return (
    <section id="studio" ref={ref} data-testid="studio-section" className="bg-ivory py-24 text-onyx lg:py-36">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-12 lg:px-16">
        <FadeUp className="lg:col-span-5">
          <div className="relative aspect-[4/5] overflow-hidden rounded-t-full rounded-b-[28px]">
            <motion.img style={{ y }} src="/img/bench.jpg" alt="Jeweler setting a diamond at the bench" className="absolute inset-0 h-[116%] w-full -top-[8%] object-cover" />
          </div>
        </FadeUp>
        <div className="lg:col-span-6 lg:col-start-7">
          <Eyebrow light>For your studio</Eyebrow>
          <h2 className="mt-5 font-display text-5xl font-light leading-[1] tracking-tight sm:text-6xl">
            <MaskLines inView lines={["From concept", <em key="m" className="italic text-gold-deep">to the bench.</em>]} />
          </h2>
          <p className="mt-6 max-w-md text-zinc-600">Behind every concept is a studio for you: design with your client, manage the relationship, and hand over a brief ready for production.</p>
          <dl className="mt-12 divide-y divide-sand border-y border-sand">
            {points.map(([k, v], i) => (
              <FadeUp key={k} delay={i * 0.08}>
                <div data-testid={`jeweler-point-${i}`} className="grid grid-cols-1 gap-2 py-6 sm:grid-cols-[220px_1fr] sm:gap-8">
                  <dt className="font-display text-3xl italic text-gold-deep">{k}</dt>
                  <dd className="text-zinc-600">{v}</dd>
                </div>
              </FadeUp>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
};
