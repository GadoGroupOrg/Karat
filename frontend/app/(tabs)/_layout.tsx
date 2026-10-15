import Feather from "@react-native-vector-icons/feather";
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

import { usesNativeTabs } from "@/src/navigation";
import { fonts, useTheme } from "@/src/theme";

export default function TabsLayout() {
  const { colors } = useTheme();

  if (usesNativeTabs) {
    return (
      <NativeTabs tintColor={colors.brandPrimary}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf="house.fill" />
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="build">
          <NativeTabs.Trigger.Icon sf="sparkles" />
          <NativeTabs.Trigger.Label>Build</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="saved">
          <NativeTabs.Trigger.Icon sf="heart.fill" />
          <NativeTabs.Trigger.Label>Saved</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.onSurface,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarButtonTestID: "tab-home", tabBarIcon: ({ color }) => <Feather name="home" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="build"
        options={{ title: "Build", tabBarButtonTestID: "tab-build", tabBarIcon: ({ color }) => <Feather name="edit-3" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="saved"
        options={{ title: "Saved", tabBarButtonTestID: "tab-saved", tabBarIcon: ({ color }) => <Feather name="heart" size={22} color={color} /> }}
      />
    </Tabs>
  );
}
