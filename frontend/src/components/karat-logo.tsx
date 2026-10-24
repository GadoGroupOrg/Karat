import { Image } from "expo-image";

const DARK = require("@/assets/images/karat-logo-dark.png");
const LIGHT = require("@/assets/images/karat-logo-light.png");
const RATIO = 1430 / 720;

/** Karat wordmark (gold diamond). `onDark` uses white letters for dark backgrounds. */
export function KaratLogo({ height = 40, onDark = false }: { height?: number; onDark?: boolean }) {
  return <Image source={onDark ? LIGHT : DARK} style={{ height, width: height * RATIO }} contentFit="contain" accessibilityLabel="Karat" testID="karat-logo" />;
}
