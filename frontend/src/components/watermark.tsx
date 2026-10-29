import { Platform, StyleSheet, Text, View } from "react-native";

import { useFeatures } from "@/src/api";
import { getBranding } from "@/src/branding";
import { fonts } from "@/src/theme";

const ROWS = 5;

/** Soft store-name watermark over design images on web (browsers can't block screenshots). Also stops right-click saving. */
export function Watermark() {
  const feat = useFeatures();
  if (Platform.OS !== "web" || !feat("protect_designs")) return null;
  const name = getBranding()?.store_name || "Preview";
  return (
    <View style={[StyleSheet.absoluteFill, styles.wrap, { pointerEvents: "auto" }]} testID="design-watermark" {...({ onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault() } as object)}>
      <View style={[styles.grid, { pointerEvents: "none" }]}>
        {Array.from({ length: ROWS }, (_, i) => (
          <Text key={i} numberOfLines={1} style={[styles.text, { marginLeft: i % 2 ? -60 : 0 }]}>
            {`${name}   ·   ${name}   ·   ${name}`}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: "transparent" },
  grid: { transform: [{ rotate: "-24deg" }], gap: 56, width: "160%" },
  // Fixed white with low opacity so it reads on both light and dark photos in any theme.
  text: { fontFamily: fonts.bold, fontSize: 18, letterSpacing: 3, color: "#FFFFFF", opacity: 0.4, textAlign: "center" },
});
