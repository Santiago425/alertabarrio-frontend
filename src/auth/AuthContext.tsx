import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, api, tokenStore } from "../api/client";
import type { TokenResponse, User } from "../api/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  isModerator: boolean;
  signIn: (resp: TokenResponse) => void;
  signOut: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    let cancel = false;
    const load = (tries: number): void => {
      api
        .me()
        .then((u) => !cancel && setUser(u))
        .then(() => !cancel && setLoading(false))
        .catch((e) => {
          if (cancel) return;
          // El servidor gratuito tarda en despertar: reintenta antes de cerrar la sesion
          const waking = !(e instanceof ApiError) || e.status === 0 || e.status >= 500;
          if (waking && tries > 0) {
            setTimeout(() => load(tries - 1), 3000);
            return;
          }
          if (!waking) tokenStore.clear();
          setLoading(false);
        });
    };
    load(25);
    return () => {
      cancel = true;
    };
  }, []);

  const signIn = useCallback((resp: TokenResponse) => {
    tokenStore.set(resp.access_token);
    setUser(resp.user);
  }, []);

  const signOut = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const isModerator = user?.role === "moderator" || user?.role === "admin";
  return <AuthContext.Provider value={{ user, loading, isModerator, signIn, signOut, updateUser: setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
