
const words = ["Design it", "Try it on", "Rings", "Bracelets", "Pendants", "Earrings", "Bespoke"];

const Row = () => (
  <div className="flex shrink-0 items-center gap-12 pr-12">
    {words.map((w) => (
      <span key={w} className="flex items-center gap-12">
        <span className="font-display text-5xl font-light italic text-[#FAF8F5]/90 sm:text-7xl">{w}</span>
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#FAF8F5] shadow-[0_0_0_6px_rgba(212,175,55,0.12)] sm:h-16 sm:w-16">
          <img src="/brand/karat-k-dark.png" alt="" aria-hidden="true" className="h-9 w-auto sm:h-10" />
        </span>
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
