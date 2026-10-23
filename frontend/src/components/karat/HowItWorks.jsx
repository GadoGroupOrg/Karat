import { FadeUp, MaskLines, Eyebrow } from "./Reveal";

const steps = [
  { n: "01", title: "Paste one line", text: "Drop the Karat snippet into Shopify, WordPress, Squarespace or a custom site. Your brand, your catalogue, your styling." },
  { n: "02", title: "Clients design & try on", text: "Prospects choose metal, stone, cut and setting, then see their concept on their own hand through the camera." },
  { n: "03", title: "You receive the brief", text: "Every concept arrives in your CRM with specs, renders and contact details — a qualified lead, not a vague enquiry." },
];

export const HowItWorks = () => (
  <section id="how" data-testid="how-section" className="bg-ivory py-24 text-onyx lg:py-36">
    <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-12 lg:px-16">
      <div className="lg:col-span-5">
        <div className="lg:sticky lg:top-32">
          <Eyebrow light>How it works</Eyebrow>
          <h2 className="mt-5 font-display text-5xl font-light leading-[1] tracking-tight sm:text-6xl">
            <MaskLines inView lines={["From a click", <em key="c" className="italic text-gold-deep">to a commission.</em>]} />
          </h2>
          <p className="mt-6 max-w-sm text-zinc-600">Three steps between a curious visitor and a client sitting at your bench.</p>
        </div>
      </div>
      <ol className="lg:col-span-7">
        {steps.map((s, i) => (
          <FadeUp key={s.n} delay={i * 0.08}>
            <li data-testid={`how-step-${s.n}`} className="group grid grid-cols-[auto_1fr] gap-6 border-t border-sand py-10 sm:gap-10">
              <span className="font-mono text-sm text-gold-deep">{s.n}</span>
              <div>
                <h3 className="font-display text-3xl transition-transform duration-500 group-hover:translate-x-2 sm:text-4xl">{s.title}</h3>
                <p className="mt-3 max-w-md text-zinc-600">{s.text}</p>
              </div>
            </li>
          </FadeUp>
        ))}
      </ol>
    </div>
  </section>
);
