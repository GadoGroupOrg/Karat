import * as ScreenCapture from "expo-screen-capture";
import { useEffect } from "react";
import { Platform } from "react-native";

import { useFeatures } from "@/src/api";

/** Blocks screenshots/recordings in the phone app while the store has design protection on. */
export function ScreenProtect() {
  const on = useFeatures()("protect_designs");
  useEffect(() => {
    if (Platform.OS === "web") return;
    (on ? ScreenCapture.preventScreenCaptureAsync() : ScreenCapture.allowScreenCaptureAsync()).catch(() => {});
  }, [on]);
  return null;
}
