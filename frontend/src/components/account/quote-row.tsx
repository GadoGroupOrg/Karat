import Feather from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { Text, View } from "react-native";

import { assetUrl, formatPrice, type MyQuote } from "@/src/api";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const STATUS: Record<string, string> = { new: "Received", contacted: "In touch", quoted: "Quote sent", won: "Confirmed", lost: "Closed" };

export function QuoteRow({ q }: { q: MyQuote }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const img = q.image_url ? assetUrl(q.image_url) : q.product_image;
  return (
    <View style={styles.row} testID={`account-quote-${q.id}`}>
      <View style={styles.thumb}>
        {img ? <Image source={{ uri: img }} style={styles.img} contentFit="cover" /> : <Feather name="hexagon" size={22} color={colors.brandPrimary} />}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.title} numberOfLines={1}>{q.title}</Text>
        <Text style={styles.meta}>{new Date(q.created_at).toLocaleDateString()} · Est. {formatPrice(q.price)}</Text>
        {!!q.note && <Text style={styles.meta} numberOfLines={2}>“{q.note}”</Text>}
      </View>
      <View style={[styles.pill, q.status === "won" && styles.pillWon]}>
        <Text style={styles.pillText}>{STATUS[q.status] ?? q.status}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: c.surfaceSecondary, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  img: { width: "100%", height: "100%" },
  title: { fontFamily: fonts.display, fontSize: 16, color: c.onSurface },
  meta: { fontFamily: fonts.text, fontSize: 12, color: c.muted },
  pill: { paddingHorizontal: spacing.md, height: 26, borderRadius: radius.pill, justifyContent: "center", backgroundColor: c.surfaceTertiary },
  pillWon: { backgroundColor: c.brandTertiary },
  pillText: { fontFamily: fonts.bold, fontSize: 11, color: c.onSurface },
}));
