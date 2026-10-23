export const KaratMark = ({ className = "h-10" }) => (
  <img src="/brand/karat-k.png" alt="" aria-hidden="true" className={`w-auto ${className}`} />
);

export const KaratLogo = ({ variant = "wordmark", className = "h-10 sm:h-11" }) => (
  <a href="#top" data-testid={`logo-${variant}`} className="group flex items-center">
    <img
      src={variant === "design" ? "/brand/karat-design.png" : "/brand/karat-wordmark.png"}
      alt="Karat"
      className={`w-auto transition-transform duration-700 group-hover:-translate-y-0.5 ${className}`}
    />
  </a>
);
