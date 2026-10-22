import Feather from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { assetUrl, type Customer } from "@/src/api";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Props = { customer: Customer | null; onSignIn: () => void; onSignOut: () => void };

const method = (c: Customer) => (c.kind === "account" ? (c.level === "account" ? "Signed in with email or Google" : "Account") : "Contact details shared");

/** Sign-in details on the Account tab, or a prompt to sign in. */
export function ProfileCard({ customer, onSignIn, onSignOut }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();

  if (!customer) {
    return (
      <View style={styles.card} testID="account-signed-out">
        <Text style={styles.title}>Keep your designs everywhere</Text>
        <Text style={styles.text}>Sign in to save designs to your account, see them on any device and track your quote requests.</Text>
        <Pressable testID="account-sign-in-button" onPress={onSignIn} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}>
          <Text style={styles.btnText}>Sign in or create account</Text>
        </Pressable>
      </View>
    );
  }
  const initial = (customer.name || customer.email).charAt(0).toUpperCase();
  return (
    <View style={styles.card} testID="account-profile">
      <View style={styles.row}>
        {customer.picture ? (
          <Image source={{ uri: assetUrl(customer.picture) }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarEmpty]}><Text style={styles.initial}>{initial}</Text></View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1} testID="account-name">{customer.name || "Your account"}</Text>
          <Text style={styles.text} numberOfLines={1} testID="account-email">{customer.email}</Text>
        </View>
      </View>
      <View style={styles.detail}>
        <Feather name="shield" size={14} color={colors.muted} />
        <Text style={styles.text}>{method(customer)}</Text>
      </View>
      {!!customer.phone && (
        <View style={styles.detail}>
          <Feather name="phone" size={14} color={colors.muted} />
          <Text style={styles.text}>{customer.phone}</Text>
        </View>
      )}
      <Pressable testID="account-sign-out-button" onPress={onSignOut} style={({ pressed }) => [styles.outline, pressed && { opacity: 0.7 }]}>
        <Feather name="log-out" size={14} color={colors.onSurface} />
        <Text style={styles.outlineText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarEmpty: { backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  initial: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface },
  name: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface },
  title: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface },
  text: { fontFamily: fonts.text, fontSize: 14, lineHeight: 20, color: c.muted },
  detail: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  btn: { height: 50, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, alignItems: "center", justifyContent: "center" },
  btnText: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurfaceInverse },
  outline: { flexDirection: "row", alignSelf: "flex-start", alignItems: "center", gap: spacing.sm, height: 44, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: c.borderStrong },
  outlineText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurface },
}));
