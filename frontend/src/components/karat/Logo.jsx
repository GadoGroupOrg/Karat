export const KaratMark = ({ className = "h-7 w-7" }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="karat-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#F3DD8A" />
        <stop offset=".55" stopColor="#D4AF37" />
        <stop offset="1" stopColor="#8A6E1F" />
      </linearGradient>
    </defs>
    <path d="M32 6 L54 25 L32 58 L10 25 Z" fill="none" stroke="url(#karat-g)" strokeWidth="3" strokeLinejoin="round" />
    <path d="M10 25 H54 M22 25 L32 6 L42 25 M22 25 L32 58 L42 25" fill="none" stroke="url(#karat-g)" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

export const KaratLogo = ({ dark = true }) => (
  <a href="#top" data-testid="nav-logo" className="flex items-center gap-2.5 group">
    <KaratMark className="h-7 w-7 transition-transform duration-700 group-hover:rotate-[18deg]" />
    <span className={`font-display text-2xl tracking-[0.02em] ${dark ? "text-ivory" : "text-onyx"}`}>Karat</span>
  </a>
);
