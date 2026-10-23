import { KaratMark } from "./Logo";

const words = ["Design it", "Try it on", "Commission it", "Atelier", "Mirror", "Ledger", "Bespoke, at scale"];

const Row = () => (
  <div className="flex shrink-0 items-center gap-12 pr-12">
    {words.map((w) => (
      <span key={w} className="flex items-center gap-12">
        <span className="font-display text-5xl font-light italic text-ivory/90 sm:text-7xl">{w}</span>
        <KaratMark className="h-6 w-6 opacity-70" />
      </span>
    ))}
  </div>
);

export const Marquee = () => (
  <section data-testid="editorial-marquee" aria-label="Karat" className="overflow-hidden border-y border-gold/15 bg-onyx py-10">
    <div className="marquee flex w-max">
      <Row />
      <Row />
    </div>
  </section>
);
