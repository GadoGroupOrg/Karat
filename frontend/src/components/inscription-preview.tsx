import { Platform, Text, View } from "react-native";
import Svg, { Circle, Defs, Path, RadialGradient, Stop, Text as SvgText, TextPath } from "react-native-svg";

import { fonts, makeStyles, spacing } from "@/src/theme";

const FONT: Record<string, { family: string; size: number; spacing: number; upper?: boolean; italic?: boolean }> = {
  script: { family: Platform.select({ ios: "Snell Roundhand", android: "cursive", default: "'Brush Script MT', 'Segoe Script', cursive" })!, size: 17, spacing: 0.5, italic: true },
  block: { family: Platform.select({ ios: "Helvetica Neue", android: "sans-serif-medium", default: "Helvetica, Arial, sans-serif" })!, size: 12, spacing: 2.4, upper: true },
  roman: { family: Platform.select({ ios: "Times New Roman", android: "serif", default: "'Times New Roman', Georgia, serif" })!, size: 14, spacing: 1.2 },
};

const SIZE = 220, C = SIZE / 2, OUTER = 100, INNER = 78, TEXT_R = INNER + 9;
// text runs clockwise along the inside of the band, centred at the top
const arc = `M ${C - TEXT_R} ${C} A ${TEXT_R} ${TEXT_R} 0 1 1 ${C + TEXT_R} ${C} A ${TEXT_R} ${TEXT_R} 0 1 1 ${C - TEXT_R} ${C}`;

/** Live view looking into the ring: the inscription follows the inside of the band in the chosen font and metal. */
export function InscriptionPreview({ text, font, metalColor }: { text: string; font: string; metalColor: string }) {
  const styles = useStyles();
  const f = FONT[font] ?? FONT.script;
  return (
    <View style={styles.wrap} testID="inscription-preview">
      <Text style={styles.label}>INSIDE OF THE BAND</Text>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Defs>
          {/* metal shading stays the same in light/dark themes */}
          <RadialGradient id="metal" cx="50%" cy="45%" r="50%">
            <Stop offset="0.72" stopColor="#000000" stopOpacity="0.25" />
            <Stop offset="0.8" stopColor={metalColor} />
            <Stop offset="0.9" stopColor="#FFFFFF" stopOpacity="0.85" />
            <Stop offset="1" stopColor={metalColor} />
          </RadialGradient>
          <Path id="inscription-arc" d={arc} />
        </Defs>
        <Circle cx={C} cy={C} r={(OUTER + INNER) / 2} stroke="url(#metal)" strokeWidth={OUTER - INNER} fill="none" />
        <Circle cx={C} cy={C} r={INNER + 1} stroke="#00000022" strokeWidth={2} fill="none" />
        <SvgText fill="#5A4520" fontFamily={f.family} fontSize={f.size} letterSpacing={f.spacing} fontStyle={f.italic ? "italic" : "normal"}
          testID="inscription-preview-text">
          <TextPath href="#inscription-arc" startOffset="25%" textAnchor="middle">
            {f.upper ? text.toUpperCase() : text}
          </TextPath>
        </SvgText>
      </Svg>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { marginTop: spacing.md, gap: spacing.xs, alignItems: "center" },
  label: { alignSelf: "flex-start", fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2, color: c.muted },
}));
