import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import { fetchMe, login, signup, type AdminSession } from "@/src/api";
import { queryClient } from "@/src/query-client";
import { switchStore } from "@/src/tenant";
import { storage } from "@/src/utils/storage";

type SignUpInput = { business_name: string; name: string; email: string; password: string };
type AuthState = {
  token: string | null;
  admin: AdminSession["admin"] | null;
  session: AdminSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (b: SignUpInput) => Promise<void>;
  /** Adopt a token issued elsewhere (platform "open dashboard", Shopify SSO). */
  startSession: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const KEY = "atelier_admin_token";
const Ctx = createContext<AuthState | null>(null);

/** One-time token handed over by the Shopify app (`/admin?sso=...`). */
function takeSsoToken(): string | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const sso = url.searchParams.get("sso");
  if (!sso) return null;
  url.searchParams.delete("sso");
  window.history.replaceState(null, "", url.toString());
  return sso;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<AdminSession | null>(null);
  const sessionRef = useRef<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  /** Persist, then make the storefront follow the signed-in business (web reloads to re-brand). */
  const adopt = useCallback(async (t: string, s: AdminSession) => {
    await storage.secureSet(KEY, t);
    if (switchStore(s.tenant.slug)) return;
    // Different business (native, no reload): drop its cached data; same business: just refetch, keep in-flight requests.
    if (sessionRef.current && sessionRef.current.tenant.id !== s.tenant.id) queryClient.clear();
    else queryClient.invalidateQueries();
    sessionRef.current = s;
    setSession(s);
    setToken(t);
  }, []);

  useEffect(() => {
    (async () => {
      const saved = takeSsoToken() ?? (await storage.secureGet<string | null>(KEY, null));
      if (saved) {
        try {
          await adopt(saved, await fetchMe(saved));
        } catch {
          await storage.secureRemove(KEY);
        }
      }
      setLoading(false);
    })();
  }, [adopt]);

  const signIn = useCallback(async (email: string, password: string) => {
    const r = await login(email.trim(), password);
    await adopt(r.access_token, r);
  }, [adopt]);

  const signUp = useCallback(async (b: SignUpInput) => {
    const r = await signup({ ...b, email: b.email.trim() });
    await adopt(r.access_token, r);
  }, [adopt]);

  const startSession = useCallback(async (t: string) => {
    await adopt(t, await fetchMe(t));
  }, [adopt]);

  const signOut = useCallback(async () => {
    await storage.secureRemove(KEY);
    setToken(null);
    sessionRef.current = null;
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ token, session, admin: session?.admin ?? null, loading, signIn, signUp, startSession, signOut }),
    [token, session, loading, signIn, signUp, startSession, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("AuthProvider missing");
  return v;
}
