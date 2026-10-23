import { useState } from "react";
import { Camera, ImageUp } from "lucide-react";

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

const opt = (key, labels) => labels.map((label) => ({ key: label.toLowerCase(), label, img: `/img/opt/${key}-${label.toLowerCase()}.jpg` }));

const types = [
  { key: "rings", label: "Rings", options: opt("ring", ["Round", "Oval", "Emerald", "Pear"]) },
  { key: "bracelets", label: "Bracelets", options: opt("br", ["Tennis", "Bangle", "Chain", "Cuff"]) },
  { key: "pendants", label: "Pendants", options: opt("pd", ["Solitaire", "Halo", "Drop", "Bar"]) },
  { key: "earrings", label: "Earrings", options: opt("er", ["Studs", "Drops", "Hoops", "Climbers"]) },
];

const Tabs = ({ items, value, onChange, prefix, dark }) => (
  <div className={`flex gap-1 overflow-x-auto rounded-full p-1 backdrop-blur-md ${dark ? "bg-black/55" : "bg-white/80"}`}>
    {items.map((t) => (
      <button key={t.key} onClick={() => onChange(t.key)} data-testid={`${prefix}-${t.key}`}
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors duration-300 ${value === t.key ? (dark ? "bg-gold text-onyx" : "bg-onyx text-ivory") : (dark ? "text-zinc-200 hover:text-ivory" : "text-zinc-700 hover:text-onyx")}`}>
        {t.Icon && <t.Icon className="h-3.5 w-3.5" />} {t.label}
      </button>
    ))}
  </div>
);

const Stack = ({ items, value, alt }) => (
  <>
    {items.map((t) => (
      <img key={t.key} src={t.img} alt={`${alt} ${t.label.toLowerCase()}`}
        className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-out group-hover:scale-105 ${value === t.key ? "opacity-100" : "opacity-0"}`} />
    ))}
  </>
);

export const DesignCard = () => {
  const [type, setType] = useState("pendants");
  const [choice, setChoice] = useState("halo");
  const current = types.find((t) => t.key === type);
  const pick = (k) => { setType(k); setChoice(types.find((t) => t.key === k).options[1].key); };
  return (
    <Card testid="card-design" className="flex flex-col">
      <div className="relative h-64 overflow-hidden sm:h-80 lg:h-auto lg:flex-1">
        <Stack key={type} items={current.options} value={choice} alt={`${current.label}:`} />
        <div className="absolute left-4 right-4 top-4 sm:right-auto">
          <Tabs items={types} value={type} onChange={pick} prefix="design-type" />
        </div>
      </div>
      <div className="flex flex-col gap-6 p-7 sm:flex-row sm:items-end sm:justify-between">
        <Label name="Design" title="Clients shape their own concept." />
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {current.options.map((o) => (
            <button key={o.key} onClick={() => setChoice(o.key)} data-testid={`design-option-${o.key}`}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors duration-300 ${choice === o.key ? "border-onyx bg-onyx text-ivory" : "border-sand text-zinc-600 hover:border-onyx"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
};

const catalog = [
  { name: "The Solène", spec: "Solitaire ring · 18k", img: "/img/hero-ring.jpg", scale: "scale-[1.5]", note: "Could the band be thinner, with an oval stone?" },
  { name: "The Aurelia", spec: "Cluster ring · Rose", img: "/img/cat-rose.jpg", scale: "scale-100", note: "Love the sapphires — could we try emeralds instead?" },
  { name: "The Lumière", spec: "Tennis bracelet · 18k White", img: "/img/cat-bracelet.jpg", scale: "scale-100", note: "Slightly smaller stones, and sized for a petite wrist." },
  { name: "The Étoile", spec: "Pear pendant · 18k", img: "/img/cat-pendant.jpg", scale: "scale-100", note: "Could the chain be shorter, closer to the collarbone?" },
  { name: "The Céleste", spec: "Drop earrings · 18k", img: "/img/cat-earrings.jpg", scale: "scale-100", note: "Perfect for the wedding — can these match my ring?" },
  { name: "The Iris", spec: "Eternity band · Platinum", img: "/img/cat-plat.jpg", scale: "scale-100", note: "Trying this on as-is — is it available in rose gold?" },
];

const actions = ["Browse your pieces", "Design from an existing piece", "Leave notes for you", "Try on as-is"];

export const CatalogCard = () => {
  const [active, setActive] = useState(0);
  return (
    <Card testid="card-catalog" className="grid gap-8 p-7 lg:grid-cols-12 lg:gap-10 lg:p-10">
      <div className="flex flex-col justify-between gap-8 lg:col-span-5">
        <div>
          <Label name="Catalog" title="Start from your collection." />
          <p className="mt-3 max-w-sm text-zinc-600">Clients see your existing pieces, design from them or try them on exactly as they are.</p>
        </div>
        <ul className="space-y-3">
          {actions.map((a) => (
            <li key={a} className="flex items-center gap-3 text-sm text-onyx">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {a}
            </li>
          ))}
        </ul>
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 lg:col-span-7">
        {catalog.map((p, i) => (
          <button key={p.name} onClick={() => setActive(i)} data-testid={`catalog-item-${i}`}
            className={`group/item relative overflow-hidden rounded-2xl border text-left transition-colors duration-300 ${active === i ? "border-onyx" : "border-sand hover:border-zinc-400"}`}>
            <div className="aspect-square overflow-hidden">
              <img src={p.img} alt={p.name} className={`h-full w-full object-cover transition-transform duration-700 group-hover/item:scale-110 ${p.scale}`} />
            </div>
            <div className="p-2.5 sm:p-3">
              <p className="font-display text-base sm:text-xl">{p.name}</p>
              <p className="hidden text-xs text-zinc-600 sm:block">{p.spec}</p>
            </div>
            {active === i && (
              <div className="absolute inset-x-2 top-2 hidden flex-wrap gap-1.5 sm:flex">
                <span className="rounded-full bg-onyx px-2.5 py-1 text-[11px] text-ivory">Customise</span>
                <span className="rounded-full bg-gold px-2.5 py-1 text-[11px] text-onyx">Try on</span>
              </div>
            )}
          </button>
        ))}
        <div className="col-span-3 flex gap-2 sm:hidden">
          <span className="rounded-full bg-onyx px-3 py-1.5 text-xs text-ivory">Customise {catalog[active].name.replace("The ", "")}</span>
          <span className="rounded-full bg-gold px-3 py-1.5 text-xs text-onyx">Try on</span>
        </div>
        <div data-testid="catalog-note" className="col-span-3 rounded-2xl border border-sand bg-cream p-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-gold-deep">Client note · {catalog[active].name}</p>
          <p className="mt-1.5 font-display text-lg italic text-onyx">"{catalog[active].note}"</p>
        </div>
      </div>
    </Card>
  );
};

const modes = [
  { key: "photo", label: "Upload photo", Icon: ImageUp },
  { key: "live", label: "Live camera", Icon: Camera },
];

const pieces = [
  { key: "ring", label: "Ring", img: "/img/hand.jpg" },
  { key: "bracelet", label: "Bracelet", img: "/img/tryon-wrist.jpg" },
  { key: "pendant", label: "Pendant", img: "/img/tryon-neck.jpg" },
  { key: "earrings", label: "Earrings", img: "/img/tryon-ear.jpg" },
];

export const TryOnCard = () => {
  const [mode, setMode] = useState("photo");
  const [piece, setPiece] = useState("ring");
  return (
    <Card testid="card-tryon" dark className="flex min-h-[560px] flex-col">
      <div className="relative flex-1 overflow-hidden">
        <Stack items={pieces} value={piece} alt="Trying on a" />
        <div className="absolute inset-x-4 top-4">
          <Tabs items={modes} value={mode} onChange={setMode} prefix="tryon-mode" dark />
        </div>
        <div className="absolute inset-x-4 bottom-4">
          <Tabs items={pieces} value={piece} onChange={setPiece} prefix="tryon-piece" dark />
        </div>
      </div>
      <div className="p-7">
        <Label dark name="Try on" title="See it on, wherever it's worn." />
        <p className="mt-3 text-sm text-zinc-300">Their own designs or your existing pieces — from a photo they upload, or live through their camera.</p>
      </div>
    </Card>
  );
};
