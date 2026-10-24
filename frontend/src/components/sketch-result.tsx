import Feather from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DesignSpec, assetUrl, createQuote } from "@/src/api";
import { useCustomer } from "@/src/customer";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Props = { design: DesignSpec | null; sketch: { id: string; image_url: string; sketch_url: string; note: string }; onClose: () => void };

/** The AI render of a customer's sketch, with "Send to our jewelers" (creates a Sketch request lead). */
export function SketchResult({ design, sketch, onClose }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { customer, ensure } = useCustomer();
  const [showSketch, setShowSketch] = useState(false);
  const [form, setForm] = useState({ name: customer?.name ?? "", email: customer?.email ?? "", phone: customer?.phone ?? "", note: sketch.note });
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setError(null);
    if (!form.name.trim() || !/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError("Please enter your name and a valid email.");
    if (!(await ensure("quote"))) return;
    setState("sending");
    try {
      await createQuote({ design: design ?? undefined, sketch_id: sketch.id, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), note: form.note });
      setState("sent");
    } catch (e) {
      setError((e as Error).message);
      setState("idle");
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAwareScrollView style={styles.root} contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }} testID="sketch-result">
        <View style={styles.head}>
          <View>
            <Text style={styles.eyebrow}>YOUR IDEA, RENDERED</Text>
            <Text style={styles.title}>Sketch to studio photo</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8} style={styles.close} testID="sketch-result-close"><Feather name="x" size={22} color={colors.onSurface} /></Pressable>
        </View>
        <View style={styles.imgWrap}>
          <Image source={{ uri: assetUrl(showSketch ? sketch.sketch_url : sketch.image_url) }} style={styles.img} contentFit="contain" testID="sketch-result-image" />
          <Pressable onPress={() => setShowSketch((v) => !v)} style={styles.toggle} testID="sketch-compare-toggle">
            <Feather name={showSketch ? "image" : "edit-3"} size={13} color={colors.onSurface} />
            <Text style={styles.toggleText}>{showSketch ? "Show render" : "Show my sketch"}</Text>
          </Pressable>
        </View>
        {state === "sent" ? (
          <View style={styles.sent} testID="sketch-sent">
            <Feather name="check-circle" size={18} color={colors.onSuccess} />
            <Text style={styles.sentText}>Sent! Our jewelers will review your sketch and be in touch.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sub}>Love it? Send it to our jewelers for a quote. We’ll refine it with you.</Text>
            {(["name", "email", "phone"] as const).map((k) => (
              <TextInput key={k} testID={`sketch-${k}-input`} value={form[k]} onChangeText={(v) => setForm({ ...form, [k]: v })}
                placeholder={k === "name" ? "Full name" : k === "email" ? "Email" : "Phone (optional)"} placeholderTextColor={colors.muted} style={styles.input}
                autoCapitalize={k === "email" ? "none" : "words"} keyboardType={k === "email" ? "email-address" : k === "phone" ? "phone-pad" : "default"} />
            ))}
            <TextInput testID="sketch-message-input" value={form.note} onChangeText={(v) => setForm({ ...form, note: v })} placeholder="Anything else? (optional)"
              placeholderTextColor={colors.muted} style={[styles.input, { height: 80, paddingTop: spacing.md, textAlignVertical: "top" }]} multiline />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <Pressable testID="sketch-send-button" onPress={send} disabled={state === "sending"} style={[styles.btn, state === "sending" && { opacity: 0.7 }]}>
              {state === "sending" ? <ActivityIndicator color={colors.onSurfaceInverse} /> : <Text style={styles.btnText}>Send to our jewelers</Text>}
            </Pressable>
          </>
        )}
      </KeyboardAwareScrollView>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  head: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, color: c.brandPrimary },
  title: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface, marginTop: 2 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  imgWrap: { width: "100%", maxWidth: 560, alignSelf: "center", aspectRatio: 1, borderRadius: radius.lg, overflow: "hidden", backgroundColor: c.surfaceSecondary },
  img: { width: "100%", height: "100%" },
  toggle: { position: "absolute", top: spacing.md, right: spacing.md, flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: c.surface },
  toggleText: { fontFamily: fonts.medium, fontSize: 12, color: c.onSurface },
  sub: { fontFamily: fonts.text, fontSize: 14, lineHeight: 20, color: c.muted },
  input: { height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.lg, fontFamily: fonts.text, fontSize: 15, color: c.onSurface },
  error: { fontFamily: fonts.medium, fontSize: 13, color: c.error },
  btn: { height: 52, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, alignItems: "center", justifyContent: "center" },
  btnText: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurfaceInverse },
  sent: { flexDirection: "row", gap: spacing.md, alignItems: "center", backgroundColor: c.success, padding: spacing.lg, borderRadius: radius.md },
  sentText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: c.onSuccess },
}));
