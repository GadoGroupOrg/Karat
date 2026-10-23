import { useState } from "react";
import { Copy, Check, ScanLine, Camera } from "lucide-react";

const Card = ({ children, className = "", testid, dark = false }) => (
  <div data-testid={testid} className={`group relative h-full overflow-hidden rounded-[28px] border transition-shadow duration-500 hover:shadow-[0_30px_80px_-40px_rgba(15,18,25,0.35)] ${dark ? "border-white/10 bg-onyx text-ivory" : "border-sand bg-white"} ${className}`}>
    {children}
  </div>
);

const Label = ({ name, title, dark }) => (
  <div>
    <p className={`font-mono text-xs uppercase tracking-[0.24em] ${dark ? "text-gold" : "text-gold-deep"}`}>{name}</p>
    <h3 className="mt-2 font-display text-3xl leading-tight">{title}</h3>
  </div>
);

const shapes = ["Round", "Oval", "Emerald", "Pear", "Cushion"];

export const AtelierCard = () => {
  const [shape, setShape] = useState("Oval");
  return (
    <Card testid="bento-atelier" className="flex flex-col">
      <div className="relative h-64 overflow-hidden sm:h-80 lg:h-auto lg:flex-1">
        <img src="/img/rings.jpg" alt="Three rings in yellow gold, rose gold and platinum on travertine" className="h-full w-full object-cover transition-transform duration-[1.6s] ease-out group-hover:scale-105" />
        <div className="absolute right-4 top-4 rounded-full bg-white/80 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-onyx backdrop-blur">Live preview</div>
      </div>
      <div className="flex flex-col gap-6 p-7 sm:flex-row sm:items-end sm:justify-between">
        <Label name="Atelier · Configurator" title="Clients design the ring they want." />
        <div className="flex flex-wrap gap-2">
          {shapes.map((s) => (
            <button key={s} onClick={() => setShape(s)} data-testid={`shape-${s.toLowerCase()}`}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors duration-300 ${shape === s ? "border-onyx bg-onyx text-ivory" : "border-sand text-zinc-600 hover:border-onyx"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
};

export const MirrorCard = () => {
  const [on, setOn] = useState(true);
  return (
    <Card testid="bento-mirror" dark className="flex min-h-[520px] flex-col">
      <div className="relative flex-1 overflow-hidden">
        <img src="/img/hand.jpg" alt="Hand wearing a diamond ring" className="absolute inset-0 h-full w-full object-cover" />
        {on && (
          <div className="absolute inset-0">
            <div className="scan-line absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-gold/30 to-transparent" />
            <div className="absolute left-1/2 top-[44%] h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/80 shadow-[0_0_30px_rgba(212,175,55,0.6)]" />
            <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-gold backdrop-blur"><ScanLine className="h-3.5 w-3.5" /> Size 6 ½ detected</span>
          </div>
        )}
      </div>
      <div className="flex items-end justify-between gap-4 p-7">
        <Label dark name="Mirror · AR try-on" title="See it on their hand." />
        <button onClick={() => setOn(!on)} data-testid="ar-toggle-button" aria-label="Toggle AR overlay"
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${on ? "border-gold bg-gold text-onyx" : "border-white/20 text-ivory"}`}>
          <Camera className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
};

const columns = [
  { name: "New concept", items: [["A. Laurent", "Oval · 18k Rose"], ["M. Okafor", "Pear · Platinum"]] },
  { name: "Consultation", items: [["J. Rivera", "Emerald · 18k Yellow"]] },
  { name: "In the bench", items: [["S. Chen", "Cushion · Platinum"]] },
];

export const LedgerCard = () => (
  <Card testid="bento-ledger" className="p-7">
    <Label name="Ledger · Jeweler CRM" title="Every concept becomes a lead." />
    <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {columns.map((c) => (
        <div key={c.name} className="rounded-2xl bg-cream p-3">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-zinc-600">{c.name}</p>
          <div className="space-y-2">
            {c.items.map(([who, spec]) => (
              <div key={who} className="rounded-xl border border-sand bg-white p-3 transition-transform duration-300 hover:-translate-y-0.5">
                <p className="text-sm font-medium">{who}</p>
                <p className="mt-0.5 text-xs text-zinc-600">{spec}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
    <p className="mt-4 text-xs text-zinc-500">Sample data shown for illustration.</p>
  </Card>
);

const snippet = `<script src="https://cdn.karatdesign.io/embed.js"
  data-store="your-store" async></script>`;

export const EmbedCard = () => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(snippet); } catch { /* clipboard unavailable */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <Card testid="bento-embed" dark className="flex h-full flex-col justify-between p-7">
      <Label dark name="Embed · One line" title="Live on your store in minutes." />
      <div className="relative mt-7 rounded-2xl border border-white/10 bg-black/40 p-5">
        <pre className="overflow-x-auto whitespace-pre font-mono text-xs leading-relaxed text-zinc-300"><span className="text-gold">{snippet}</span></pre>
        <button onClick={copy} data-testid="embed-copy-button" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-ivory transition-colors hover:bg-gold hover:text-onyx">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </Card>
  );
};
