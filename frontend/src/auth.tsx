import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { fetchMe, login } from "@/src/api";
import { storage } from "@/src/utils/storage";

type Admin = { id: string; email: string; name: string };
type AuthState = {
  token: string | null;
  admin: Admin | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const KEY = "atelier_admin_token";
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const saved = await storage.secureGet<string | null>(KEY, null);
      if (saved) {
        try {
          setAdmin(await fetchMe(saved));
          setToken(saved);
        } catch {
          await storage.secureRemove(KEY);
        }
      }
      setLoading(false);
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const r = await login(email.trim(), password);
    await storage.secureSet(KEY, r.access_token);
    setAdmin(r.admin);
    setToken(r.access_token);
  }, []);

  const signOut = useCallback(async () => {
    await storage.secureRemove(KEY);
    setToken(null);
    setAdmin(null);
  }, []);

  const value = useMemo(() => ({ token, admin, loading, signIn, signOut }), [token, admin, loading, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("AuthProvider missing");
  return v;
}
