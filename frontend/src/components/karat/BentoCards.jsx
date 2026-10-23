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

const shapes = ["Round", "Oval", "Emerald", "Pear", "Cushion"];

export const DesignCard = () => {
  const [shape, setShape] = useState("Oval");
  return (
    <Card testid="card-design" className="flex flex-col">
      <div className="relative h-64 overflow-hidden sm:h-80 lg:h-auto lg:flex-1">
        <img src="/img/rings.jpg" alt="Three rings in yellow gold, rose gold and platinum on travertine" className="h-full w-full object-cover transition-transform duration-[1.6s] ease-out group-hover:scale-105" />
      </div>
      <div className="flex flex-col gap-6 p-7 sm:flex-row sm:items-end sm:justify-between">
        <Label name="Design" title="Clients shape their own concept." />
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

const modes = [
  { key: "photo", label: "Upload photo", Icon: ImageUp },
  { key: "live", label: "Live camera", Icon: Camera },
];

export const TryOnCard = () => {
  const [mode, setMode] = useState("photo");
  return (
    <Card testid="card-tryon" dark className="flex min-h-[520px] flex-col">
      <div className="relative flex-1 overflow-hidden">
        <img src="/img/hand.jpg" alt="Hand wearing a diamond ring" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.6s] ease-out group-hover:scale-105" />
        <div className="absolute inset-x-4 top-4 flex rounded-full bg-black/55 p-1 backdrop-blur-md">
          {modes.map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setMode(key)} data-testid={`tryon-mode-${key}`}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors duration-300 ${mode === key ? "bg-gold text-onyx" : "text-zinc-200 hover:text-ivory"}`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-7">
        <Label dark name="Try on" title="See it on their own hand." />
        <p className="mt-3 text-sm text-zinc-300">From a photo they upload, or live through their camera.</p>
      </div>
    </Card>
  );
};
