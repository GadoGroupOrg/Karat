import { MaskLines, Eyebrow, FadeUp } from "./Reveal";
import { WaitlistForm } from "./WaitlistForm";
import { KaratMark } from "./Logo";

export const FinalCTA = () => (
  <section data-testid="final-cta-section" className="grain relative overflow-hidden bg-onyx py-28 text-ivory lg:py-40">
    <div className="pointer-events-none absolute bottom-[-30%] left-1/2 h-[60vh] w-[80vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(212,175,55,0.18),transparent)]" />
    <div className="relative mx-auto flex max-w-4xl flex-col items-start px-5 sm:px-8 md:items-center md:text-center">
      <KaratMark className="spin-slow h-12 w-12" />
      <div className="mt-8"><Eyebrow>Early access</Eyebrow></div>
      <h2 className="mt-5 font-display text-5xl font-light leading-[0.98] tracking-tight sm:text-7xl">
        <MaskLines inView lines={["Give every client", <em key="p" className="text-gold-gradient italic">a pen and a mirror.</em>]} />
      </h2>
      <p className="mt-6 max-w-md text-zinc-300">We're onboarding a small cohort of independent jewelers first. Reserve your place.</p>
      <FadeUp className="mt-10 flex w-full justify-start md:justify-center">
        <WaitlistForm id="cta" source="final_cta" />
      </FadeUp>
    </div>
  </section>
);
