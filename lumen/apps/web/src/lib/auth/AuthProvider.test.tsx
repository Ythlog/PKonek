import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PKonekApi } from "@/lib/api/contract";
import { createMockApi } from "@/lib/api/mock";
import { memoryPersistence } from "@/lib/api/mock/persistence";
import { DEMO_PASSWORD } from "@/lib/api/mock/seed";
import { SESSION_KEY, getToken, notifyUnauthorized, readSession, saveSession } from "@/lib/api/session";
import { createQueryClient } from "@/lib/query";
import { AuthProvider, useAuth } from "./AuthProvider";

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <p data-testid="status">{auth.status}</p>
      <p data-testid="user">{auth.user ? `${auth.user.full_name} (${auth.role})` : "nobody"}</p>
      <p data-testid="reason">{auth.endReason ?? "none"}</p>
      <button onClick={() => auth.login("official@pkonek.demo", DEMO_PASSWORD).catch(() => {})}>login</button>
      <button onClick={() => auth.login("official@pkonek.demo", "wrong").catch((e: Error) => alert(e.message))}>bad login</button>
      <button onClick={() => auth.registerCitizen({ full_name: "Maria Clara", email: "maria@example.com", password: "longenough" })}>register</button>
      <button onClick={() => auth.logout()}>logout</button>
    </div>
  );
}

let api: PKonekApi;

function renderAuth(customApi = api) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthProvider api={customApi}>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

const statusText = () => screen.getByTestId("status").textContent;

beforeEach(() => {
  sessionStorage.clear();
  api = createMockApi({ deps: { getToken, onUnauthorized: notifyUnauthorized }, persistence: memoryPersistence(), delayMs: 0 });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AuthProvider", () => {
  it("starts anonymous when nothing is stored", async () => {
    renderAuth();
    await waitFor(() => expect(statusText()).toBe("anonymous"));
  });

  it("signs in, stores the token in sessionStorage, and loads the user", async () => {
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: "login" }));
    await waitFor(() => expect(statusText()).toBe("authenticated"));
    expect(screen.getByTestId("user")).toHaveTextContent("Ramon Aquino (official)");
    expect(readSession()?.role).toBe("official");
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("does not store anything after a failed login", async () => {
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: "bad login" }));
    await waitFor(() => expect(alert).toHaveBeenCalledWith("Incorrect email or password."));
    expect(statusText()).toBe("anonymous");
    expect(readSession()).toBeNull();
  });

  it("registers a citizen and signs them in", async () => {
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: "register" }));
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Maria Clara (citizen)"));
  });

  it("restores a stored session on reload", async () => {
    saveSession(await api.auth.login("admin@pkonek.demo", DEMO_PASSWORD));
    renderAuth();
    expect(statusText()).toBe("loading");
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Patricia Lopez (pasig_admin)"));
  });

  it("drops a stored session the API no longer accepts", async () => {
    saveSession({ access_token: "mock.999.9999999999999", token_type: "bearer", expires_in: 3600, role: "official" });
    renderAuth();
    await waitFor(() => expect(statusText()).toBe("anonymous"));
    expect(readSession()).toBeNull();
  });

  it("signs out and clears the session", async () => {
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: "login" }));
    await waitFor(() => expect(statusText()).toBe("authenticated"));
    await userEvent.click(screen.getByRole("button", { name: "logout" }));
    await waitFor(() => expect(statusText()).toBe("anonymous"));
    expect(readSession()).toBeNull();
    expect(screen.getByTestId("reason")).toHaveTextContent("none");
  });

  it("signs out when the token expires", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const shortLived = createMockApi({ deps: { getToken }, persistence: memoryPersistence(), delayMs: 0, tokenTtlSeconds: 60 });
    renderAuth(shortLived);
    await userEvent.click(screen.getByRole("button", { name: "login" }));
    await waitFor(() => expect(statusText()).toBe("authenticated"));
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    await waitFor(() => expect(statusText()).toBe("anonymous"));
    expect(screen.getByTestId("reason")).toHaveTextContent("expired");
  });

  it("signs out when a request is rejected with 401", async () => {
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: "login" }));
    await waitFor(() => expect(statusText()).toBe("authenticated"));
    act(() => notifyUnauthorized());
    await waitFor(() => expect(screen.getByTestId("reason")).toHaveTextContent("unauthorized"));
    expect(statusText()).toBe("anonymous");
  });
});
