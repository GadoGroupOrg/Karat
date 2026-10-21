import { Slot } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/src/auth";
import { AdminLogin } from "@/src/components/admin/login";
import { AdminShell } from "@/src/components/admin/shell";
import { useTheme } from "@/src/theme";

export default function AdminLayout() {
  const { colors } = useTheme();
  const { token, loading } = useAuth();
  if (loading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}><ActivityIndicator color={colors.brand} /></View>;
  }
  if (!token) return <AdminLogin />;
  return <AdminShell><Slot /></AdminShell>;
}
