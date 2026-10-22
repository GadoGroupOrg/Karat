import Feather from "@react-native-vector-icons/feather";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg from "react-native-svg";

import { Catalog, DesignSpec, OptionGroup, assetUrl, formatPrice, useCatalog, usePrice } from "@/src/api";
import { DesignCanvas } from "@/src/components/design-canvas";
import { Charm } from "@/src/components/jewelry-preview";
import { forWearer, groupVisible } from "@/src/catalog-utils";
import { useCustomer } from "@/src/customer";
import { getDesign, newId, upsertDesign } from "@/src/designs";
import { usesNativeTabs } from "@/src/navigation";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

function defaults(c: Catalog, type: string): DesignSpec {
  const t = c.types.find((x) => x.id === type) ?? c.types[0];
  const options = Object.fromEntries((t.option_groups ?? []).map((g) => [g.id, g.default]));
  const stone = t.addon_kind === "stone" ? c.addons.find((a) => a.types.includes(t.id) && a.source !== "shopify") : undefined;
  return {
    type: t.id, styleId: t.styles[0].id, metalId: c.metals[0].id, sizeId: t.sizes[0].id,
    addonIds: stone ? [stone.id] : [], engraving: "", name: "", options,
  };
}

const BEFORE_ADDONS = ["shape"];
const WIDE_BREAKPOINT = 900;
const AFTER_METAL = ["karat"];

const tap = () => {
  if (Platform.OS !== "web") Haptics.selectionAsync();
};

export default function Build() {
  const { data: catalog, isLoading, isError, refetch } = useCatalog();
  const styles = useStyles();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.root, styles.center]} testID="builder-loading">
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }
  if (isError || !catalog) {
    return (
      <View style={[styles.root, styles.center]} testID="builder-error">
        <Text style={styles.errorText}>Unable to load the atelier.</Text>
        <Pressable testID="builder-retry-button" onPress={() => refetch()} style={styles.outlineBtn}>
          <Text style={styles.outlineBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }
  return <Builder catalog={catalog} />;
}

function Builder({ catalog }: { catalog: Catalog }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; designId?: string; addId?: string; nonce?: string }>();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const { width: winW, height: winH } = useWindowDimensions();
  const wide = winW >= WIDE_BREAKPOINT;
  // Mobile: square-ish stage, capped so the first options stay visible on short screens.
  const stageH = Math.round(Math.min(winW - spacing.xl * 2, winH * 0.42));
  // Desktop: options wrap into a grid inside the side panel. Mobile: one swipeable row.
  const optionRow = (kind: "cards" | "chips", children: React.ReactNode, testID?: string) =>
    wide ? (
      <View style={kind === "cards" ? styles.grid : styles.chipWrap} testID={testID}>{children}</View>
    ) : (
      <ScrollView key={`${t.id}-${testID ?? kind}`} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }} testID={testID}>{children}</ScrollView>
    );

  const [design, setDesign] = useState<DesignSpec>(() => defaults(catalog, params.type ?? "ring"));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (params.designId) {
      getDesign(params.designId).then((d) => {
        if (d) {
          const { id, price, createdAt, renderUrl: _r, ...spec } = d;
          const base = defaults(catalog, spec.type);
          setDesign({ ...spec, options: { ...base.options, ...(spec.options ?? {}) } });
          setEditingId(id);
        }
      });
    } else if (params.type) {
      const base = defaults(catalog, params.type);
      const valid = params.addId && catalog.addons.some((a) => a.id === params.addId);
      setDesign(valid ? { ...base, addonIds: [params.addId as string] } : base);
      setEditingId(null);
    }
  }, [params.type, params.designId, params.addId, params.nonce, catalog]);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const t = catalog.types.find((x) => x.id === design.type)!;
  const addons = useMemo(() => catalog.addons.filter((a) => a.types.includes(design.type) && a.source !== "shopify"), [catalog, design.type]);
  const storeAddons = useMemo(() => catalog.addons.filter((a) => a.source === "shopify" && a.types.includes(design.type)), [catalog, design.type]);
  const quote = usePrice(design);
  const price = quote.data?.total ?? 0;
  const metal = catalog.metals.find((m) => m.id === design.metalId)!;
  const style = t.styles.find((s) => s.id === design.styleId)!;
  const groups = (t.option_groups ?? []).filter((g) => groupVisible(t, g, design));
  const styles_ = forWearer(t, design, t.styles);
  const bridal = t.group ? catalog.types.filter((x) => x.group === t.group) : [];
  const chipTypes = catalog.types.filter((x, i, all) => !x.group || all.findIndex((y) => y.group === x.group) === i);
  const bandType = catalog.types.find((x) => x.id === "band");
  const matchBand = () => {
    if (!bandType) return;
    tap();
    const base = defaults(catalog, "band");
    const contour = bandType.styles.some((s) => s.id === "curved-contour") ? "curved-contour" : base.styleId;
    const sizeOk = bandType.sizes.some((s) => s.id === design.sizeId);
    const acc = design.options?.accent_stone;
    setDesign({
      ...base, styleId: contour, metalId: design.metalId, sizeId: sizeOk ? design.sizeId : base.sizeId,
      name: design.name.trim() ? `${design.name.trim()} · Band` : "",
      options: { ...base.options, wearer: "womens", ...(acc ? { accent_stone: acc } : {}) },
    });
    setEditingId(null);
    showToast("Matching band: same gold and size");
  };
  const groupsBefore = groups.filter((g) => BEFORE_ADDONS.includes(g.id));
  const groupsAfterMetal = groups.filter((g) => AFTER_METAL.includes(g.id));
  const groupsMiddle = groups.filter((g) => !BEFORE_ADDONS.includes(g.id) && !AFTER_METAL.includes(g.id));
  const setOption = (gid: string, oid: string) => {
    tap();
    setDesign((d) => {
      const next = { ...d, options: { ...(d.options ?? {}), [gid]: oid } };
      if (gid !== "wearer") return next;
      // Switching women's/men's: keep style and width only if they suit the new wearer.
      const okStyles = forWearer(t, next, t.styles);
      const widths = forWearer(t, next, t.option_groups.find((g) => g.id === "width")?.options ?? []);
      if (!okStyles.some((s) => s.id === next.styleId)) next.styleId = okStyles[0]?.id ?? next.styleId;
      if (widths.length && !widths.some((w) => w.id === next.options.width)) next.options.width = widths[Math.min(1, widths.length - 1)].id;
      return next;
    });
  };
  const renderGroup = (g: OptionGroup) => {
    const current = design.options?.[g.id] ?? g.default;
    const visual = g.options.some((o) => o.description);
    return (
      <Section key={g.id} label={g.label} value={g.options.find((o) => o.id === current)?.name}>
        {optionRow(visual ? "cards" : "chips",
          forWearer(t, design, g.options).map((o) => {
            const sel = o.id === current;
            const extra = o.accent_ct ? `+${o.accent_ct} ct pavé` : undefined;
            return visual ? (
              <OptionCard key={o.id} testID={`option-${g.id}-${o.id}`} selected={sel} onPress={() => setOption(g.id, o.id)}
                title={o.name} description={o.description} image={o.image} meta={extra} grid={wide} />
            ) : (
              <Pressable key={o.id} testID={`option-${g.id}-${o.id}`} onPress={() => setOption(g.id, o.id)} style={[styles.chip, !!o.color && styles.chipWithDot, sel && styles.chipSel]}>
                {!!o.color && <View style={[styles.dot, { backgroundColor: o.color }]} />}
                <Text style={[styles.chipText, sel && styles.chipTextSel]}>{o.name}{o.price ? `  +${formatPrice(o.price)}` : ""}</Text>
              </Pressable>
            );
          }))}
      </Section>
    );
  };
  const breakdown = quote.data ?? { lines: [], total: 0, gold_grams: 0 };
  const [showMaterial, setShowMaterial] = useState(false);

  const update = (patch: Partial<DesignSpec>) => {
    tap();
    setDesign((d) => ({ ...d, ...patch }));
  };

  const switchType = (type: string) => {
    tap();
    setDesign(defaults(catalog, type));
    setEditingId(null);
  };

  const toggleAddon = (id: string) => {
    tap();
    setDesign((d) => {
      if (d.addonIds.includes(id)) {
        if (d.type === "ring") return d; // a ring always keeps its centre stone
        return { ...d, addonIds: d.addonIds.filter((x) => x !== id) };
      }
      if (t.max_addons === 1) return { ...d, addonIds: [id] };
      if (d.addonIds.length >= t.max_addons) {
        showToast(`Up to ${t.max_addons} ${t.addon_label.toLowerCase()}`);
        return d;
      }
      return { ...d, addonIds: [...d.addonIds, id] };
    });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const { allowed, ensure } = useCustomer();
  const showPrice = allowed("prices");
  const save = async () => {
    if (!(await ensure("save_design"))) return;
    const id = editingId ?? newId();
    const name = design.name.trim() || `The ${style.name} ${t.name}`;
    await upsertDesign({ ...design, name, id, price, renderUrl, createdAt: new Date().toISOString() });
    setEditingId(id);
    setDesign((d) => ({ ...d, name }));
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(editingId ? "Design updated" : "Saved to your collection");
  };

  const stage = (
    <>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>Atelier</Text>
        <Pressable testID="builder-reset-button" hitSlop={10} onPress={() => switchType(design.type)} style={styles.iconBtn}>
          <Feather name="rotate-ccw" size={18} color={colors.onSurface} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipRowContent}>
        {chipTypes.map((x) => {
          const sel = x.group ? x.group === t.group : x.id === design.type;
          const testId = x.group ? `type-chip-${x.group}` : `type-chip-${x.id}`;
          return (
            <Pressable key={x.id} testID={testId} onPress={() => !sel && switchType(x.id)} style={[styles.chip, sel && styles.chipSel]}>
              <Text style={[styles.chipText, sel && styles.chipTextSel]}>{x.group_name ?? x.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {bridal.length > 1 && (
        <View style={styles.modeRow} testID="bridal-mode-toggle">
          {bridal.map((x) => {
            const sel = x.id === design.type;
            return (
              <Pressable key={x.id} testID={`bridal-mode-${x.id}`} onPress={() => !sel && switchType(x.id)} style={[styles.modeBtn, sel && styles.modeSel]}>
                <Text style={[styles.modeText, sel && styles.modeTextSel]}>{x.name}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <DesignCanvas catalog={catalog} design={design} height={wide ? undefined : stageH} onRenderChange={setRenderUrl} />
      <Text style={styles.canvasCaption} testID="builder-preview-caption" numberOfLines={1}>
        {style.name} {t.name} · {metal.name}
      </Text>
    </>
  );

  const panel = (
    <>
      <KeyboardAwareScrollView bottomOffset={24} style={{ flex: 1 }} contentContainerStyle={styles.controls} showsVerticalScrollIndicator={false}>
        <Section label={t.style_label ?? "Style"} value={style.name}>
          {optionRow(t.styles.some((s) => s.description) ? "cards" : "chips",
            styles_.map((s) => {
              const sel = s.id === design.styleId;
              if (s.description) {
                return (
                  <OptionCard key={s.id} testID={`style-option-${s.id}`} selected={sel} onPress={() => update({ styleId: s.id })}
                    title={s.name ?? ""} description={s.description} image={s.image}
                    meta={s.accent_ct ? `+${s.accent_ct} ct accents` : undefined} grid={wide} />
                );
              }
              return (
                <Pressable key={s.id} testID={`style-option-${s.id}`} onPress={() => update({ styleId: s.id })} style={[styles.styleCard, sel && styles.optionSel]}>
                  <Text style={styles.optionTitle}>{s.name}</Text>
                  <Text style={styles.optionPrice}>{s.price ? `+${formatPrice(s.price)}` : "Included"}</Text>
                </Pressable>
              );
            }))}
        </Section>

        {groupsBefore.map(renderGroup)}

        {t.max_addons > 0 && <Section label={design.styleId === "toi-et-moi" ? "First stone" : t.addon_label} value={t.max_addons > 1 ? `${design.addonIds.length}/${t.max_addons}` : undefined}>
          <View style={styles.addonGrid}>
            {addons.map((a) => {
              const sel = design.addonIds.includes(a.id);
              return (
                <Pressable key={a.id} testID={`addon-option-${a.id}`} onPress={() => toggleAddon(a.id)} style={[styles.addonTile, sel && styles.optionSel]}>
                  <Svg width={36} height={36} viewBox="0 0 36 36">
                    <Charm addon={a} cx={18} cy={18} s={12} metal={metal.color} canvas={sel ? colors.brandTertiary : colors.surfaceSecondary} letter={(design.engraving.trim()[0] ?? "A").toUpperCase()} />
                  </Svg>
                  <Text style={styles.addonName} numberOfLines={1}>{a.name}</Text>
                  {t.id !== "ring" && <Text style={styles.optionPrice}>+{formatPrice(a.price)}</Text>}
                  {sel && (
                    <View style={styles.check}>
                      <Feather name="check" size={10} color={colors.onBrandPrimary} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Section>}

        {groupsMiddle.map(renderGroup)}

        <Section label="Metal" value={metal.name}>
          <View style={styles.metalRow}>
            {catalog.metals.map((m) => {
              const sel = m.id === design.metalId;
              return (
                <Pressable key={m.id} testID={`metal-option-${m.id}`} onPress={() => update({ metalId: m.id })} style={styles.metalItem}>
                  <View style={[styles.swatchRing, sel && { borderColor: colors.onSurface }]}>
                    <View style={[styles.swatch, { backgroundColor: m.color }]} />
                  </View>
                  <Text style={[styles.metalName, sel && { color: colors.onSurface }]}>{m.name}</Text>
                </Pressable>
              );
            })}
          </View>
          {t.material_request && (
            <View style={styles.materialWrap}>
              <Pressable testID="request-other-material-button" onPress={() => setShowMaterial((v) => !v)} style={styles.linkRow} hitSlop={8}>
                <Feather name={showMaterial ? "minus-circle" : "plus-circle"} size={14} color={colors.brandPrimary} />
                <Text style={styles.linkText}>Request other ring material</Text>
              </Pressable>
              {(showMaterial || !!design.options?.material_request) && (
                <TextInput
                  testID="material-request-input"
                  value={design.options?.material_request ?? ""}
                  onChangeText={(v) => setDesign((d) => ({ ...d, options: { ...(d.options ?? {}), material_request: v } }))}
                  placeholder="e.g. Platinum, 14k, two-tone…"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  maxLength={60}
                />
              )}
            </View>
          )}
        </Section>

        {groupsAfterMetal.map(renderGroup)}
        <Section label={t.id === "ring" || t.id === "band" ? "Ring size" : t.id === "earrings" ? "Size" : "Length"}>
          {optionRow("chips",
            t.sizes.map((s) => {
              const sel = s.id === design.sizeId;
              return (
                <Pressable key={s.id} testID={`size-option-${s.id}`} onPress={() => update({ sizeId: s.id })} style={[styles.chip, sel && styles.chipSel]}>
                  <Text style={[styles.chipText, sel && styles.chipTextSel]}>{s.label}{s.price ? `  +$${s.price}` : ""}</Text>
                </Pressable>
              );
            }))}
        </Section>

        {catalog.store && storeAddons.length > 0 && (
          <Section label={`From ${catalog.store.name}`} value={t.addon_kind === "charm" ? "Add as charm" : "Use as centre"}>
            {optionRow("cards",
              storeAddons.map((a) => {
                const sel = design.addonIds.includes(a.id);
                return (
                  <Pressable key={a.id} testID={`store-addon-option-${a.id}`} onPress={() => toggleAddon(a.id)} style={[styles.storeTile, wide && styles.gridItem, sel && styles.optionSel]}>
                    <Image source={{ uri: a.image ?? undefined }} style={styles.storeImg} contentFit="cover" transition={200} />
                    <Text style={styles.addonName} numberOfLines={2}>{a.name}</Text>
                    <Text style={styles.optionPrice}>+{formatPrice(a.price)}</Text>
                    {sel && (
                      <View style={styles.check}>
                        <Feather name="check" size={10} color={colors.onBrandPrimary} />
                      </View>
                    )}
                  </Pressable>
                );
              }), "store-addon-row")}
            <Pressable testID="builder-browse-shop-button" onPress={() => router.push("/shop")} style={styles.linkRow} hitSlop={8}>
              <Text style={styles.linkText}>Browse the full shop</Text>
              <Feather name="arrow-right" size={14} color={colors.brandPrimary} />
            </Pressable>
          </Section>
        )}

        {t.engraving_max > 0 && (
          <Section label="Engraving" value={`+${formatPrice(t.engraving_price)}`}>
            <TextInput
              testID="engraving-input"
              value={design.engraving}
              onChangeText={(v) => setDesign((d) => ({ ...d, engraving: v }))}
              maxLength={t.engraving_max}
              placeholder={`Up to ${t.engraving_max} characters`}
              placeholderTextColor={colors.muted}
              style={styles.input}
              returnKeyType="done"
            />
          </Section>
        )}

        {t.id === "ring" && bandType && (
          <Pressable testID="add-matching-band-button" onPress={matchBand} style={styles.matchBtn}>
            <Feather name="link-2" size={16} color={colors.onSurface} />
            <View style={{ flex: 1 }}>
              <Text style={styles.matchTitle}>Add a matching wedding band</Text>
              <Text style={styles.matchText}>Same 18k gold and size, contoured to sit against this ring</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.onSurface} />
          </Pressable>
        )}

        {showPrice && <Section label="Price breakdown" value="Estimate">
          <View style={styles.breakdown} testID="price-breakdown">
            {breakdown.lines.map((l) => (
              <View key={l.label} style={styles.bdRow}>
                <Text style={styles.bdLabel}>{l.label}</Text>
                <Text style={styles.bdAmount}>{formatPrice(l.amount)}</Text>
              </View>
            ))}
            {!!design.options?.material_request && (
              <Text style={styles.bdNote}>Alternative material “{design.options.material_request}” priced on request.</Text>
            )}
          </View>
        </Section>}

        <Section label="Name your piece">
          <TextInput
            testID="design-name-input"
            value={design.name}
            onChangeText={(v) => setDesign((d) => ({ ...d, name: v }))}
            maxLength={40}
            placeholder={`The ${style.name} ${t.name}`}
            placeholderTextColor={colors.muted}
            style={styles.input}
            returnKeyType="done"
          />
        </Section>
      </KeyboardAwareScrollView>

      <View style={[styles.bottomBar, { paddingBottom: (wide ? 0 : bottomChrome) + spacing.md }]}>
        <View>
          <Text style={styles.totalLabel}>Estimated total</Text>
          {showPrice ? (
            <Text style={[styles.total, quote.isFetching && { opacity: 0.5 }]} testID="builder-total-price">{quote.data ? formatPrice(price) : "…"}</Text>
          ) : (
            <Pressable testID="see-price-button" onPress={() => ensure("prices")} hitSlop={8}>
              <Text style={[styles.total, { textDecorationLine: "underline" }]}>See price</Text>
            </Pressable>
          )}
        </View>
        <Pressable testID="save-design-button" onPress={save} style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}>
          <Feather name="heart" size={16} color={colors.onSurfaceInverse} />
          <Text style={styles.saveText}>{editingId ? "Update design" : "Save design"}</Text>
        </Pressable>
      </View>
    </>
  );

  return (
    <View style={styles.root} testID="builder-screen">
      {wide ? (
        <View style={styles.split}>
          <View style={styles.stageCol} testID="builder-stage-column">{stage}</View>
          <View style={styles.panelCol} testID="builder-options-panel">{panel}</View>
        </View>
      ) : (
        <>
          {stage}
          {panel}
        </>
      )}

      {toast && (
        <Animated.View entering={FadeInUp} exiting={FadeOutDown} style={[styles.toast, { bottom: bottomChrome + 96 }]} testID="builder-toast">
          <Feather name="check-circle" size={16} color={colors.brandSecondary} />
          <Text style={styles.toastText}>{toast}</Text>
          {toast !== "Design updated" && !toast.startsWith("Up to") && (
            <Pressable testID="toast-view-saved-button" onPress={() => router.push("/saved")} hitSlop={10}>
              <Text style={styles.toastAction}>View</Text>
            </Pressable>
          )}
        </Animated.View>
      )}
    </View>
  );
}

function OptionCard({ title, description, image, meta, selected, onPress, testID, grid }: {
  title: string; description?: string; image?: string; meta?: string; selected: boolean; onPress: () => void; testID: string; grid?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.card, grid && styles.gridItem, selected && styles.optionSel, pressed && { opacity: 0.85 }]}>
      {image ? (
        <Image source={{ uri: assetUrl(image) }} style={styles.cardImg} contentFit="cover" transition={250} />
      ) : (
        <View style={[styles.cardImg, { alignItems: "center", justifyContent: "center" }]}>
          <Feather name="image" size={18} color={colors.muted} />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
        {!!description && <Text style={styles.cardDesc} numberOfLines={grid ? 3 : 2}>{description}</Text>}
        {!!meta && <Text style={styles.cardMeta}>{meta}</Text>}
      </View>
      {selected && (
        <View style={styles.check}>
          <Feather name="check" size={10} color={colors.onBrandPrimary} />
        </View>
      )}
    </Pressable>
  );
}

function Section({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>
        {value ? <Text style={styles.sectionValue}>{value}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  center: { alignItems: "center", justifyContent: "center", gap: spacing.lg },
  errorText: { fontFamily: fonts.display, fontSize: 18, color: c.onSurface },
  outlineBtn: { borderWidth: 1, borderColor: c.borderStrong, paddingHorizontal: spacing.xl, height: 44, justifyContent: "center", borderRadius: radius.pill },
  outlineBtnText: { fontFamily: fonts.medium, color: c.onSurface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingBottom: spacing.xs },
  title: { fontFamily: fonts.display, fontSize: 28, color: c.onSurface },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  chipRow: { flexGrow: 0, flexShrink: 0, height: 56, minHeight: 56 },
  chipRowContent: { gap: spacing.sm, paddingHorizontal: spacing.xl, alignItems: "center" },
  chip: {
    height: 36, flexShrink: 0, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1,
    borderColor: c.border, backgroundColor: c.surface, justifyContent: "center",
  },
  chipSel: { backgroundColor: c.surfaceInverse, borderColor: c.surfaceInverse },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: c.onSurface },
  chipTextSel: { color: c.onSurfaceInverse },
  chipWithDot: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingLeft: spacing.md },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: c.borderStrong },
  modeRow: { flexDirection: "row", marginHorizontal: spacing.xl, marginBottom: spacing.md, padding: 3, borderRadius: radius.pill, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  modeBtn: { flex: 1, height: 38, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  modeSel: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderStrong },
  modeText: { fontFamily: fonts.medium, fontSize: 13, color: c.muted },
  modeTextSel: { fontFamily: fonts.bold, color: c.onSurface },
  matchBtn: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.md, backgroundColor: c.brandTertiary },
  matchTitle: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurface },
  matchText: { fontFamily: fonts.text, fontSize: 12, color: c.onSurface, marginTop: 2 },
  canvasCaption: { textAlign: "center", fontFamily: fonts.medium, fontSize: 12, color: c.muted, letterSpacing: 0.5, marginTop: spacing.sm, flexShrink: 0 },
  controls: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  section: { marginTop: spacing.xl },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: spacing.md },
  sectionLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, color: c.onSurface },
  sectionValue: { fontFamily: fonts.text, fontSize: 12, color: c.muted },
  rowWrap: { flexDirection: "row", gap: spacing.sm },
  styleCard: { width: 148, flexShrink: 0, paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  optionSel: { borderColor: c.brandPrimary, backgroundColor: c.brandTertiary },
  optionTitle: { fontFamily: fonts.display, fontSize: 16, color: c.onSurface },
  optionPrice: { fontFamily: fonts.text, fontSize: 11, color: c.muted, marginTop: 2 },
  metalRow: { flexDirection: "row", gap: spacing.xl },
  metalItem: { alignItems: "center", gap: spacing.xs },
  metalName: { fontFamily: fonts.medium, fontSize: 11, color: c.muted },
  swatchRing: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: "transparent", alignItems: "center", justifyContent: "center" },
  swatch: { width: 36, height: 36, borderRadius: 18 },
  addonGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  addonTile: {
    width: "31.5%", alignItems: "center", paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1,
    borderColor: c.border, backgroundColor: c.surfaceSecondary,
  },
  addonName: { fontFamily: fonts.medium, fontSize: 12, color: c.onSurface, marginTop: spacing.xs },
  check: { position: "absolute", top: 6, right: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  storeTile: { width: 120, flexShrink: 0, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary },
  storeImg: { width: "100%", aspectRatio: 1, borderRadius: radius.sm, backgroundColor: c.surfaceTertiary },
  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.md, minHeight: 32 },
  linkText: { fontFamily: fonts.bold, fontSize: 13, color: c.brandPrimary },
  materialWrap: { marginTop: spacing.sm, gap: spacing.sm },
  breakdown: { borderRadius: radius.md, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  bdRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm, gap: spacing.md },
  bdLabel: { flex: 1, fontFamily: fonts.text, fontSize: 13, color: c.onSurface },
  bdAmount: { fontFamily: fonts.bold, fontSize: 13, color: c.onSurface },
  bdNote: { fontFamily: fonts.text, fontSize: 12, color: c.muted, paddingBottom: spacing.sm },
  card: { width: 136, flexShrink: 0, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, overflow: "hidden" },
  cardImg: { width: "100%", aspectRatio: 1, backgroundColor: c.surfaceTertiary },
  cardBody: { padding: spacing.sm + 2 },
  cardTitle: { fontFamily: fonts.display, fontSize: 14, color: c.onSurface },
  cardDesc: { fontFamily: fonts.text, fontSize: 11, lineHeight: 15, color: c.muted, marginTop: 2 },
  cardMeta: { fontFamily: fonts.bold, fontSize: 11, color: c.brandPrimary, marginTop: spacing.xs },
  // Desktop split layout
  split: { flex: 1, flexDirection: "row" },
  stageCol: { flex: 1, paddingBottom: spacing.xl },
  panelCol: { width: 480, borderLeftWidth: 1, borderLeftColor: c.border, backgroundColor: c.surface },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  gridItem: { width: "31.8%" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  input: {
    height: 48, borderRadius: radius.md, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.lg,
    fontFamily: fonts.text, fontSize: 15, color: c.onSurface, borderWidth: 1, borderColor: c.border,
  },
  bottomBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl,
    paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface,
  },
  totalLabel: { fontFamily: fonts.text, fontSize: 12, color: c.muted },
  total: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface },
  saveBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 50, paddingHorizontal: spacing.xl, borderRadius: radius.pill, backgroundColor: c.surfaceInverse },
  saveText: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurfaceInverse },
  toast: {
    position: "absolute", left: spacing.xl, right: spacing.xl, flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: c.surfaceInverse, paddingHorizontal: spacing.lg, height: 48, borderRadius: radius.md,
  },
  toastText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: c.onSurfaceInverse },
  toastAction: { fontFamily: fonts.bold, fontSize: 14, color: c.brandSecondary },
}));
