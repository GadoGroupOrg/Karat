import { motion } from "framer-motion";
import { KaratLogo } from "./Logo";

const links = [
  ["How it works", "#how"],
  ["Studio", "#studio"],
  ["Jewelers", "#jewelers"],
  ["FAQ", "#faq"],
];

export const Navbar = () => (
  <motion.header
    initial={{ y: -30, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
    className="fixed inset-x-0 top-4 z-50 px-4"
  >
    <nav data-testid="navbar" className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/10 bg-[#080A0F]/85 py-2.5 pl-5 pr-2.5 backdrop-blur-xl">
      <KaratLogo />
      <ul className="hidden items-center gap-8 md:flex">
        {links.map(([label, href]) => (
          <li key={href}>
            <a href={href} data-testid={`nav-link-${href.slice(1)}`} className="nav-link text-sm text-zinc-300 transition-colors duration-300 hover:text-ivory">
              {label}
            </a>
          </li>
        ))}
      </ul>
      <a href="#waitlist" data-testid="nav-waitlist-button" className="btn-gold rounded-full px-4 py-2 text-sm font-medium text-onyx sm:px-5">
        Early access
      </a>
    </nav>
  </motion.header>
);
