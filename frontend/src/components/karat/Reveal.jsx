import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1];

export const FadeUp = ({ children, delay = 0, className = "", ...rest }) => (
  <motion.div
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 0.9, delay, ease }}
    className={className}
    {...rest}
  >
    {children}
  </motion.div>
);

const lineVariants = {
  hidden: { y: "105%" },
  shown: (d) => ({ y: "0%", transition: { duration: 1.1, delay: d, ease } }),
};

export const MaskLines = ({ lines, className = "", delay = 0, inView = false }) => {
  const trigger = inView
    ? { whileInView: "shown", viewport: { once: true, amount: 0.1 } }
    : { animate: "shown" };
  return (
    <motion.span className={`block ${className}`} initial="hidden" {...trigger}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.12em] -mb-[0.12em]">
          <motion.span className="block" variants={lineVariants} custom={delay + i * 0.12}>
            {line}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
};

export const Eyebrow = ({ children, light = false }) => (
  <p className={`font-mono text-xs uppercase tracking-[0.28em] ${light ? "text-gold-deep" : "text-gold"}`}>
    {children}
  </p>
);
