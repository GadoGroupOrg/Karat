import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import { AccessRules, Customer, Level, customerApi, setCustomerToken } from "@/src/api";
import { GateModal } from "@/src/components/gate-modal";
import { storage } from "@/src/utils/storage";

WebBrowser.maybeCompleteAuthSession();

export const ACTION_LABELS: Record<string, string> = {
  prices: "see prices", studio_photo: "create studio photos", angles: "see more angles", try_on: "try pieces on",
  sketch: "render your sketch", save_design: "save designs", quote: "request a quote",
};
const RANK: Record<Level, number> = { none: 0, form: 1, account: 2 };
const KEY = "atelier_customer_token";
const AUTH_URL = "https://auth.emergentagent.com/?redirect=";

type Gate = { action: string; need: Level; resolve: (ok: boolean) => void } | null;
type Ctx = {
  customer: Customer | null;
  rules: AccessRules | null;
  allowed: (action: string) => boolean;
  ensure: (action: string) => Promise<boolean>;
  signIn: (r: { session_token: string; user: Customer }) => Promise<void>;
  signOut: () => Promise<void>;
  google: () => Promise<boolean>;
};
const C = createContext<Ctx | null>(null);
const sessionIdFrom = (url: string | null) => url?.match(/[?#&]session_id=([^&#]+)/)?.[1] ?? null;

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [rules, setRules] = useState<AccessRules | null>(null);
  const [gate, setGate] = useState<Gate>(null);
  const used = useRef(new Set<string>());

  const signIn = useCallback(async (r: { session_token: string; user: Customer }) => {
    await storage.secureSet(KEY, r.session_token);
    setCustomerToken(r.session_token);
    setCustomer(r.user);
  }, []);

  const exchange = useCallback(async (sid: string | null) => {
    if (!sid || used.current.has(sid)) return false;
    used.current.add(sid);
    try {
      await signIn(await customerApi.google(sid));
      if (Platform.OS === "web") {
        const u = new URL(window.location.href);
        u.searchParams.delete("session_id");
        u.hash = u.hash.replace(/session_id=[^&]+&?/, "").replace(/^#$/, "");
        window.history.replaceState(window.history.state, "", u.toString());
      }
      return true;
    } catch {
      return false;
    }
  }, [signIn]);

  useEffect(() => {
    customerApi.access().then(setRules).catch(() => null);
    (async () => {
      const first = Platform.OS === "web" ? sessionIdFrom(window.location.href) : sessionIdFrom(await Linking.getInitialURL());
      if (await exchange(first)) return;
      const saved = await storage.secureGet<string | null>(KEY, null);
      if (!saved) return;
      setCustomerToken(saved);
      try {
        setCustomer(await customerApi.me());
      } catch {
        setCustomerToken(null);
        await storage.secureRemove(KEY);
      }
    })();
    if (Platform.OS === "web") return;
    const sub = Linking.addEventListener("url", ({ url }) => exchange(sessionIdFrom(url)));
    return () => sub.remove();
  }, [exchange]);

  const level: Level = customer?.level ?? "none";
  const need = useCallback((action: string): Level => rules?.rules[action] ?? "none", [rules]);
  const allowed = useCallback((action: string) => RANK[level] >= RANK[need(action)], [level, need]);
  const ensure = useCallback(
    (action: string) => (allowed(action) ? Promise.resolve(true) : new Promise<boolean>((resolve) => setGate({ action, need: need(action), resolve }))),
    [allowed, need],
  );

  const signOut = useCallback(async () => {
    await customerApi.logout().catch(() => null);
    setCustomerToken(null);
    await storage.secureRemove(KEY);
    setCustomer(null);
  }, []);

  const google = useCallback(async () => {
    if (Platform.OS === "web") {
      window.location.href = AUTH_URL + encodeURIComponent(window.location.origin + window.location.pathname);
      return false;
    }
    const redirect = Linking.createURL("");
    let heard: string | null = null;
    const sub = Linking.addEventListener("url", ({ url }) => (heard = url));
    try {
      const r = await WebBrowser.openAuthSessionAsync(AUTH_URL + encodeURIComponent(redirect), redirect);
      const url = (r.type === "success" ? r.url : null) ?? heard ?? (await Linking.getInitialURL());
      return await exchange(sessionIdFrom(url));
    } finally {
      sub.remove();
    }
  }, [exchange]);

  const close = (ok: boolean) => {
    gate?.resolve(ok);
    setGate(null);
  };

  const value = useMemo(() => ({ customer, rules, allowed, ensure, signIn, signOut, google }), [customer, rules, allowed, ensure, signIn, signOut, google]);
  return (
    <C.Provider value={value}>
      {children}
      {gate && (
        <GateModal need={gate.need} action={ACTION_LABELS[gate.action] ?? gate.action} questions={rules?.questions ?? []}
          customer={customer} onGoogle={async () => { if (await google()) close(true); }}
          onDone={async (r) => { await signIn(r); close(RANK[r.user.level] >= RANK[gate.need]); }}
          onCancel={() => close(false)} />
      )}
    </C.Provider>
  );
}

export function useCustomer() {
  const v = useContext(C);
  if (!v) throw new Error("CustomerProvider missing");
  return v;
}
