import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { BriefCard } from "./BriefCard";

const metals = [
  { key: "gold", label: "18k Yellow", swatch: "#D4AF37", filter: "none" },
  { key: "rose", label: "18k Rose", swatch: "#D99A86", filter: "hue-rotate(-22deg) saturate(1.25) brightness(1.02)" },
  { key: "platinum", label: "Platinum", swatch: "#D9DDE3", filter: "grayscale(1) brightness(1.18) contrast(1.05)" },
];

export const RingShowcase = () => {
  const [metal, setMetal] = useState(metals[0]);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return undefined;
    const t = setInterval(() => setMetal((m) => metals[(metals.indexOf(m) + 1) % metals.length]), 6500);
    return () => clearInterval(t);
  }, [auto]);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [9, -9]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-11, 11]), { stiffness: 120, damping: 18 });

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const reset = () => { mx.set(0); my.set(0); };

  return (
    <div className="relative mx-auto w-full max-w-[420px]" style={{ perspective: 1200 }}>
      <motion.div
        onMouseMove={onMove}
        onMouseLeave={reset}
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        initial={{ opacity: 0, scale: 0.94, clipPath: "inset(100% 0% 0% 0% round 999px 999px 24px 24px)" }}
        animate={{ opacity: 1, scale: 1, clipPath: "inset(0% 0% 0% 0% round 999px 999px 24px 24px)" }}
        transition={{ duration: 1.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        data-testid="hero-ring-showcase"
        className="relative aspect-[3/4] w-full overflow-hidden rounded-t-full rounded-b-3xl border border-gold/20 bg-[#05060A] shadow-[0_40px_120px_-30px_rgba(212,175,55,0.35)]"
      >
        <img
          src="/img/hero-ring.jpg"
          alt="Solitaire diamond ring under a spotlight"
          className="absolute inset-0 h-full w-full scale-[1.12] object-cover transition-[filter] duration-700"
          style={{ filter: metal.filter }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_10%,rgba(243,221,138,0.18),transparent_70%)]" />
        <div className="sheen pointer-events-none absolute inset-0" />
        <div style={{ transform: "translateZ(60px)" }} className="absolute left-4 top-1/2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-zinc-200 backdrop-blur-md">
          1.52 ct · Round
        </div>
        <div style={{ transform: "translateZ(80px)" }} className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/55 p-2 backdrop-blur-md">
          {metals.map((m) => (
            <button
              key={m.key}
              onClick={() => { setAuto(false); setMetal(m); }}
              data-testid={`metal-selector-${m.key}`}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2 text-xs transition-colors duration-300 ${metal.key === m.key ? "bg-white/10 text-ivory" : "text-zinc-400 hover:text-ivory"}`}
            >
              <span className="h-3 w-3 rounded-full ring-1 ring-white/30" style={{ background: m.swatch }} />
              {m.label}
            </button>
          ))}
        </div>
      </motion.div>
      <div className="relative z-10 -mt-6 ml-auto mr-1 w-[82%] max-w-[290px] xl:absolute xl:-left-28 xl:bottom-28 xl:m-0 xl:w-[290px]">
        <BriefCard metal={metal} />
      </div>
      <div className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-gold/10 blur-3xl" />
    </div>
  );
};
