import type { Branding } from "@/src/api";

// Branding loaded once at startup (see app/_layout.tsx). Read synchronously anywhere.
let current: Branding | null = null;

export const setCurrentBranding = (b: Branding | null) => {
  current = b;
};
export const getBranding = () => current;
