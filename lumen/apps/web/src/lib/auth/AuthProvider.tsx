"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api as defaultApi, type PKonekApi } from "@/lib/api";
import { clearSession, readSession, saveSession, subscribeUnauthorized, type StoredSession } from "@/lib/api/session";
import type { CitizenRegisterRequest, Role, TokenResponse, User } from "@/lib/api/types";

export type AuthStatus = "loading" | "authenticated" | "anonymous";
/** Why the last session ended without the user signing out, for a message on the login screen. */
export type SessionEndReason = "expired" | "unauthorized" | null;

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  role: Role | null;
  login: (email: string, password: string) => Promise<User>;
  registerCitizen: (input: CitizenRegisterRequest) => Promise<User>;
  logout: () => Promise<void>;
  endReason: SessionEndReason;
  clearEndReason: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// setTimeout overflows above ~24.8 days.
const MAX_TIMEOUT = 2_147_483_647;

export function AuthProvider({ children, api = defaultApi }: { children: ReactNode; api?: PKonekApi }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<StoredSession | null>(null);
  const [endReason, setEndReason] = useState<SessionEndReason>(null);

  const reset = useCallback(
    (reason: SessionEndReason) => {
      clearSession();
      setSession(null);
      setUser(null);
      setStatus("anonymous");
      setEndReason(reason);
      queryClient.clear();
    },
    [queryClient],
  );

  // Restore a session saved in this tab.
  useEffect(() => {
    let cancelled = false;
    const stored = readSession();
    if (!stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of browser storage on mount
      setStatus("anonymous");
      return;
    }
    api.auth
      .me()
      .then((me) => {
        if (cancelled) return;
        setSession(stored);
        setUser(me);
        setStatus("authenticated");
      })
      .catch(() => {
        if (!cancelled) reset(null);
      });
    return () => {
      cancelled = true;
    };
  }, [api, reset]);

  // Sign out when the token runs out (no refresh token in the backend).
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => reset("expired"), Math.min(Math.max(session.expiresAt - Date.now(), 0), MAX_TIMEOUT));
    return () => clearTimeout(timer);
  }, [session, reset]);

  // Sign out when any request comes back 401 with our token.
  useEffect(() => subscribeUnauthorized(() => reset("unauthorized")), [reset]);

  const start = useCallback(
    async (token: TokenResponse) => {
      const stored = saveSession(token);
      try {
        const me = await api.auth.me();
        setSession(stored);
        setUser(me);
        setStatus("authenticated");
        setEndReason(null);
        return me;
      } catch (error) {
        clearSession();
        throw error;
      }
    },
    [api],
  );

  const login = useCallback(async (email: string, password: string) => start(await api.auth.login(email, password)), [api, start]);

  const registerCitizen = useCallback(
    async (input: CitizenRegisterRequest) => start(await api.auth.registerCitizen(input)),
    [api, start],
  );

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // The token is discarded either way; the backend call only records the logout.
    }
    reset(null);
  }, [api, reset]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      role: user?.role ?? null,
      login,
      registerCitizen,
      logout,
      endReason,
      clearEndReason: () => setEndReason(null),
    }),
    [status, user, login, registerCitizen, logout, endReason],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
