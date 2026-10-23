import { LinearGradient } from "expo-linear-gradient";
import { Platform, Text, View } from "react-native";

import { fonts, makeStyles, radius, spacing } from "@/src/theme";

const FONT: Record<string, object> = {
  script: { fontFamily: Platform.select({ ios: "Snell Roundhand", android: "cursive", default: "'Brush Script MT', 'Segoe Script', cursive" }), fontSize: 22, fontStyle: "italic" },
  block: { fontFamily: fonts.bold, fontSize: 15, letterSpacing: 3, textTransform: "uppercase" },
  roman: { fontFamily: fonts.display, fontSize: 19, letterSpacing: 1.2 },
};

/** Inside-of-band preview of the inscription in the chosen font, on the chosen metal. */
export function InscriptionPreview({ text, font, metalColor }: { text: string; font: string; metalColor: string }) {
  const styles = useStyles();
  return (
    <View style={styles.wrap} testID="inscription-preview">
      <Text style={styles.label}>INSIDE OF THE BAND</Text>
      {/* metal tones stay the same in light/dark themes */}
      <LinearGradient colors={["#00000033", metalColor, "#FFFFFFAA", metalColor, "#00000040"]} locations={[0, 0.25, 0.5, 0.75, 1]}
        style={styles.band}>
        <Text style={[styles.text, FONT[font] ?? FONT.script]} numberOfLines={1} adjustsFontSizeToFit testID="inscription-preview-text">
          {text}
        </Text>
      </LinearGradient>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { marginTop: spacing.md, gap: spacing.xs },
  label: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2, color: c.muted },
  band: { height: 56, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  text: { color: "#5A4520", textShadowColor: "#FFFFFF99", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0 },
}));
