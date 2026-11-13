import type { Role, TokenResponse } from "./types";

/**
 * The access token lives in sessionStorage: it is gone when the tab closes, and the
 * backend has no refresh token, so there is nothing longer-lived to keep.
 */
export const SESSION_KEY = "pkonek.session";

export type StoredSession = { token: string; role: Role; expiresAt: number };

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveSession(token: TokenResponse, now = Date.now()): StoredSession {
  const session: StoredSession = {
    token: token.access_token,
    role: token.role,
    expiresAt: now + token.expires_in * 1000,
  };
  storage()?.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function readSession(now = Date.now()): StoredSession | null {
  const raw = storage()?.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as StoredSession;
    if (typeof session.token !== "string" || typeof session.expiresAt !== "number") throw new Error("bad session");
    if (session.expiresAt <= now) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession(): void {
  storage()?.removeItem(SESSION_KEY);
}

export function getToken(): string | null {
  return readSession()?.token ?? null;
}

/** The API layer reports a rejected token here; the AuthProvider listens and signs the user out. */
const unauthorizedListeners = new Set<() => void>();

export function notifyUnauthorized(): void {
  unauthorizedListeners.forEach((listener) => listener());
}

export function subscribeUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}
