import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, LogBox, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useEffect, useState } from "react";

import { fetchBranding } from "@/src/api";
import { AuthProvider } from "@/src/auth";
import { setCurrentBranding } from "@/src/branding";
import { CustomerProvider } from "@/src/customer";
import { ErrorBoundary } from "@/src/components/error-boundary";
import { PoweredBy } from "@/src/components/powered-by";
import { DashboardReturn } from "@/src/components/dashboard-return";
import { ScreenProtect } from "@/src/components/screen-protect";
import { queryClient } from "@/src/query-client";
import { applyBranding, useTheme } from "@/src/theme";

// Disable logbox errors etc so that users can see the app
// and agent works as expected.
LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  const [brandReady, setBrandReady] = useState(false);
  useEffect(() => {
    fetchBranding().then((b) => {
      if (b) {
        applyBranding(b);
        setCurrentBranding(b);
      }
      setBrandReady(true);
    });
  }, []);
  const { colors } = useTheme();
  const [loaded, error] = useFonts({
    PlayfairDisplay: require("../assets/fonts/PlayfairDisplay.ttf"),
    "Satoshi-Regular": require("../assets/fonts/Satoshi-Regular.otf"),
    "Satoshi-Medium": require("../assets/fonts/Satoshi-Medium.otf"),
    "Satoshi-Bold": require("../assets/fonts/Satoshi-Bold.otf"),
    CormorantGaramond: require("../assets/fonts/CormorantGaramond-SemiBold.ttf"),
    DMSerifDisplay: require("../assets/fonts/DMSerifDisplay-Regular.ttf"),
    BodoniModa: require("../assets/fonts/BodoniModa-Medium.ttf"),
    "Inter-Regular": require("../assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("../assets/fonts/Inter-Medium.ttf"),
    "Inter-Bold": require("../assets/fonts/Inter-Bold.ttf"),
    "Jost-Regular": require("../assets/fonts/Jost-Regular.ttf"),
    "Jost-Medium": require("../assets/fonts/Jost-Medium.ttf"),
    "Jost-Bold": require("../assets/fonts/Jost-Bold.ttf"),
    "Montserrat-Regular": require("../assets/fonts/Montserrat-Regular.ttf"),
    "Montserrat-Medium": require("../assets/fonts/Montserrat-Medium.ttf"),
    "Montserrat-Bold": require("../assets/fonts/Montserrat-Bold.ttf"),
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if ((!loaded && !error) || !brandReady) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
          <KeyboardProvider>
          <CustomerProvider>
            <StatusBar style="dark" />
            <ScreenProtect />
            <DashboardReturn />
            <View style={styles.root}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="admin" />
              <Stack.Screen name="platform" />
              <Stack.Screen name="design/[id]" options={{ presentation: "modal" }} />
              <Stack.Screen name="product/[id]" options={{ presentation: "modal" }} />
              <Stack.Screen name="try-on/[id]" options={{ presentation: "modal" }} />
              <Stack.Screen name="store-connect" options={{ presentation: "modal" }} />
              <Stack.Screen name="merchant" options={{ presentation: "modal" }} />
            </Stack>
            </View>
            <PoweredBy />
          </CustomerProvider>
          </KeyboardProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
});
