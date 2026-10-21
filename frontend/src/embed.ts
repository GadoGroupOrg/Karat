import { Platform } from "react-native";

// True when the app runs inside a jeweler's website via the embed snippet (iframe or ?embed=1 link).
export const isEmbedded =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  (window.self !== window.top || new URLSearchParams(window.location.search).has("embed"));
