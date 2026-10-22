import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { switchStore } from "@/src/tenant";
import { useTheme } from "@/src/theme";

/** Hosted storefront link: /s/<business>[/build|/shop|...] opens that business's branded builder. */
export default function StoreEntry() {
  const { slug, rest } = useLocalSearchParams<{ slug: string; rest?: string[] }>();
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    if (!slug || switchStore(slug.toLowerCase())) return; // web reloads with the new business's branding
    const path = Array.isArray(rest) && rest.length ? `/${rest.join("/")}` : "/";
    router.replace(path as never);
  }, [slug, rest, router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }} testID="store-entry">
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}
