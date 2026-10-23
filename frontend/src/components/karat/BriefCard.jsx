import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const ease = [0.22, 1, 0.36, 1];

export const BriefCard = ({ metal }) => {
  const first = useRef(true);
  const base = first.current ? 1.9 : 0.1;
  const [ready, setReady] = useState(false);

  const rows = [
    ["Piece", "Solitaire engagement ring"],
    ["Metal", metal.label === "Platinum" ? "Platinum 950" : `${metal.label} gold`],
    ["Centre stone", "1.52 ct · Round brilliant"],
    ["Setting", "Six-claw cathedral"],
    ["Client note", "“A slightly thinner band, please.”"],
  ];

  useEffect(() => {
    setReady(false);
    const t = setTimeout(() => setReady(true), (base + rows.length * 0.18 + 0.4) * 1000);
    first.current = false;
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metal.key]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: -6 }}
      animate={{ opacity: 1, y: 0, rotate: -3 }}
      transition={{ duration: 1.2, delay: 1.5, ease }}
      data-testid="hero-brief-card"
      className="relative w-full max-w-[290px] rounded-2xl border border-[#E5DECE] bg-[#FAF8F5] p-5 text-[#0F1219] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold-deep">Design brief</p>
          <p className="mt-1 font-display text-xl leading-none">No. KR-0142</p>
        </div>
        <img src="/brand/karat-k-dark.png" alt="" aria-hidden="true" className="h-8 w-auto" />
      </div>
      <dl key={metal.key} className="mt-4 space-y-2 border-t border-[#E5DECE] pt-3">
        {rows.map(([k, v], i) => (
          <motion.div
            key={k}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: base + i * 0.18, ease }}
            className="flex items-baseline justify-between gap-3 text-xs"
          >
            <dt className="shrink-0 text-zinc-600">{k}</dt>
            <dd className={`text-right font-medium ${k === "Metal" ? "text-gold-deep" : ""}`}>{v}</dd>
          </motion.div>
        ))}
      </dl>
      <div className="mt-4 flex items-center justify-between border-t border-[#E5DECE] pt-3">
        <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-600">From concept</span>
        <span
          data-testid="hero-brief-status"
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors duration-500 ${ready ? "bg-gold text-onyx" : "bg-[#F3EFEA] text-zinc-600"}`}
        >
          {ready ? <><Check className="h-3 w-3" /> Production-ready</> : <><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" /> Drafting</>}
        </span>
      </div>
    </motion.div>
  );
};
