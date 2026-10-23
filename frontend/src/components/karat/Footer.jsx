import { KaratLogo } from "./Logo";

export const Footer = () => (
  <footer data-testid="footer" className="overflow-hidden bg-onyx pt-16 text-ivory">
    <div className="mx-auto flex max-w-7xl flex-col gap-8 border-t border-white/10 px-5 pt-10 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-16">
      <KaratLogo variant="design" className="h-20" />
      <nav className="flex flex-wrap gap-6 text-sm text-zinc-400">
        <a href="#clients" data-testid="footer-link-clients" className="hover:text-ivory">For clients</a>
        <a href="#studio" data-testid="footer-link-studio" className="hover:text-ivory">For your studio</a>
        <a href="#faq" data-testid="footer-link-faq" className="hover:text-ivory">FAQ</a>
        <a href="mailto:hello@karatdesign.io" data-testid="footer-link-email" className="hover:text-ivory">[hello@karatdesign.io]</a>
      </nav>
      <p className="font-mono text-xs text-zinc-400">© 2026 Karat · karatdesign.io</p>
    </div>
    <p aria-hidden="true" className="mt-10 select-none text-center font-display text-[28vw] font-light leading-[0.75] tracking-tight text-white/[0.05]">Karat</p>
  </footer>
);
