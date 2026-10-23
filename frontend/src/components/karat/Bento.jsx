import { FadeUp, MaskLines, Eyebrow } from "./Reveal";
import { AtelierCard, MirrorCard, LedgerCard, EmbedCard } from "./BentoCards";

export const Bento = () => (
  <section id="studio" data-testid="bento-section" className="bg-cream py-24 text-onyx lg:py-36">
    <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-16">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <Eyebrow light>The studio</Eyebrow>
          <h2 className="mt-5 font-display text-5xl font-light leading-[1] tracking-tight sm:text-6xl">
            <MaskLines inView lines={["Three tools.", <em key="o" className="italic text-gold-deep">One atelier.</em>]} />
          </h2>
        </div>
        <p className="max-w-sm text-zinc-600">A storefront designer for your clients, and a design desk and CRM for you — all under your name.</p>
      </div>
      <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-12 lg:grid-rows-[minmax(300px,auto)_minmax(300px,auto)_auto]">
        <FadeUp className="lg:col-span-8 lg:row-span-2"><AtelierCard /></FadeUp>
        <FadeUp delay={0.1} className="lg:col-span-4 lg:row-span-2"><MirrorCard /></FadeUp>
        <FadeUp className="lg:col-span-7"><LedgerCard /></FadeUp>
        <FadeUp delay={0.1} className="lg:col-span-5"><EmbedCard /></FadeUp>
      </div>
    </div>
  </section>
);
