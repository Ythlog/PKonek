import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import type { PKonekApi } from "@/lib/api/contract";
import { createMockApi } from "@/lib/api/mock";
import { memoryPersistence } from "@/lib/api/mock/persistence";
import { DEMO_PASSWORD } from "@/lib/api/mock/seed";
import { getToken, notifyUnauthorized, saveSession } from "@/lib/api/session";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { createQueryClient } from "@/lib/query";

/** Holds the per-test mock backend so `vi.mock("@/lib/api")` can point every service at it. */
export const apiHolder: { api: PKonekApi } = { api: null as unknown as PKonekApi };

/** The factory body for `vi.mock("@/lib/api", ...)`. */
export async function mockApiModule(importOriginal: () => Promise<typeof import("@/lib/api")>) {
  const actual = await importOriginal();
  const services = {
    api: () => apiHolder.api,
    authService: () => apiHolder.api.auth,
    complaintService: () => apiHolder.api.complaints,
    categoryService: () => apiHolder.api.categories,
    mediaService: () => apiHolder.api.media,
    mapService: () => apiHolder.api.map,
    publicReportService: () => apiHolder.api.publicReport,
    notificationService: () => apiHolder.api.notifications,
    userService: () => apiHolder.api.users,
    logService: () => apiHolder.api.logs,
  };
  const mocked: Record<string, unknown> = { ...actual };
  for (const [name, get] of Object.entries(services)) Object.defineProperty(mocked, name, { get, enumerable: true });
  return mocked;
}

/** Fresh in-memory backend, optionally signed in, with the app providers. */
export async function renderWithMockApi(ui: ReactNode, email?: string) {
  sessionStorage.clear();
  apiHolder.api = createMockApi({ deps: { getToken, onUnauthorized: notifyUnauthorized }, persistence: memoryPersistence(), delayMs: 0 });
  if (email) saveSession(await apiHolder.api.auth.login(email, DEMO_PASSWORD));
  const utils = render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthProvider api={apiHolder.api}>
        <ToastProvider>{ui}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { ...utils, user: userEvent.setup({ applyAccept: false }), api: apiHolder.api };
}
