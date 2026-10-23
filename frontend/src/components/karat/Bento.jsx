import { FadeUp, MaskLines, Eyebrow } from "./Reveal";
import { DesignCard, TryOnCard, CatalogCard } from "./BentoCards";

export const Bento = () => (
  <section id="clients" data-testid="clients-section" className="bg-cream py-24 text-onyx lg:py-36">
    <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-16">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <Eyebrow light>For your clients</Eyebrow>
          <h2 className="mt-5 font-display text-5xl font-light leading-[1] tracking-tight sm:text-6xl">
            <MaskLines inView lines={["Design it.", <em key="o" className="italic text-gold-deep">Try it on.</em>]} />
          </h2>
        </div>
        <p className="max-w-sm text-zinc-600">On your website, prospects design rings, bracelets, pendants and earrings, or start from your catalog, then see them on.</p>
      </div>
      <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-rows-[600px_auto] lg:grid-cols-12">
        <FadeUp className="lg:col-span-7"><DesignCard /></FadeUp>
        <FadeUp delay={0.1} className="lg:col-span-5"><TryOnCard /></FadeUp>
        <FadeUp className="lg:col-span-12"><CatalogCard /></FadeUp>
      </div>
    </div>
  </section>
);
