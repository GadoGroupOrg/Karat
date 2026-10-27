import { Platform } from "react-native";

// True when the app runs inside a jeweler's website via the embed snippet (iframe or ?embed=1 link).
export const isEmbedded =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  (window.self !== window.top || new URLSearchParams(window.location.search).has("embed"));

// True only for the shopper-facing embed (embed.js adds ?embed=1), not the jeweller dashboard inside the Shopify admin.
export const isStorefrontEmbed =
  Platform.OS === "web" && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("embed");
