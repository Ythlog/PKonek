import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import type { PKonekApi } from "@/lib/api/contract";
import { createMockApi } from "@/lib/api/mock";
import { memoryPersistence } from "@/lib/api/mock/persistence";
import { DEMO_PASSWORD } from "@/lib/api/mock/seed";
import { getToken, notifyUnauthorized, readSession, saveSession } from "@/lib/api/session";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { createQueryClient } from "@/lib/query";
import { CitizenShell } from "./CitizenShell";
import { RequireRole } from "./RequireRole";
import { StaffShell } from "./StaffShell";

const router = { replace: vi.fn(), push: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() };
let pathname = "/app";

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
}));

let api: PKonekApi;

function renderApp(ui: ReactNode) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthProvider api={api}>
        <ToastProvider>{ui}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

async function signInAs(email: string) {
  saveSession(await api.auth.login(email, DEMO_PASSWORD));
}

beforeEach(() => {
  sessionStorage.clear();
  pathname = "/app";
  Object.values(router).forEach((fn) => fn.mockReset());
  api = createMockApi({ deps: { getToken, onUnauthorized: notifyUnauthorized }, persistence: memoryPersistence(), delayMs: 0 });
});

describe("RequireRole", () => {
  it("sends signed-out visitors to the right sign-in page with ?next=", async () => {
    pathname = "/admin/users";
    renderApp(
      <RequireRole roles={["pasig_admin"]}>
        <p>secret</p>
      </RequireRole>,
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/staff/login?next=%2Fadmin%2Fusers"));
    expect(screen.getByRole("status")).toHaveTextContent(/taking you to sign in/i);
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("shows a 403 page for the wrong role, with a way home", async () => {
    await signInAs("official@pkonek.demo");
    pathname = "/admin";
    renderApp(
      <RequireRole roles={["pasig_admin"]}>
        <p>secret</p>
      </RequireRole>,
    );
    expect(await screen.findByRole("heading", { name: /don.t have access/i })).toBeInTheDocument();
    expect(screen.getByText(/pasig administrators/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Go to my home$/i })).toHaveAttribute("href", "/official");
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("lets the 403 page switch accounts", async () => {
    await signInAs("citizen@pkonek.demo");
    pathname = "/official";
    renderApp(
      <RequireRole roles={["official"]}>
        <p>secret</p>
      </RequireRole>,
    );
    await userEvent.click(await screen.findByRole("button", { name: /^Switch account$/i }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/staff/login?next=%2Fofficial"));
    expect(readSession()).toBeNull();
  });

  it("renders the page for the right role", async () => {
    await signInAs("citizen@pkonek.demo");
    renderApp(
      <RequireRole roles={["citizen"]}>
        <p>my reports</p>
      </RequireRole>,
    );
    expect(await screen.findByText(/^my reports$/i)).toBeInTheDocument();
  });
});

describe("CitizenShell", () => {
  it("has a skip link, a main landmark and marks the current page", async () => {
    await signInAs("citizen@pkonek.demo");
    pathname = "/app/reports";
    renderApp(<CitizenShell>content</CitizenShell>);
    expect(screen.getByRole("link", { name: /^Skip to main content$/i })).toHaveAttribute("href", "#main");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
    const navs = screen.getAllByRole("navigation", { name: /^Main$/i });
    expect(navs).toHaveLength(2); // desktop top bar + mobile tab bar
    for (const nav of navs) {
      expect(within(nav).getByRole("link", { name: /my reports/i })).toHaveAttribute("aria-current", "page");
    }
  });

  it("offers the four destinations in the mobile tab bar", async () => {
    await signInAs("citizen@pkonek.demo");
    renderApp(<CitizenShell>content</CitizenShell>);
    const tabBar = screen.getAllByRole("navigation", { name: /^Main$/i })[1];
    expect(within(tabBar).getAllByRole("link").map((l) => l.textContent)).toEqual(["Home", "Report", "My Reports", "Map"]);
  });

  it("signs out from the account menu", async () => {
    await signInAs("citizen@pkonek.demo");
    renderApp(<CitizenShell>content</CitizenShell>);
    await userEvent.click(await screen.findByRole("button", { name: /account menu for juan dela cruz/i }));
    expect(screen.getByText("citizen@pkonek.demo")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Sign out$/i }));
    await waitFor(() => expect(readSession()).toBeNull());
  });

  it("closes the account menu with Escape", async () => {
    await signInAs("citizen@pkonek.demo");
    renderApp(<CitizenShell>content</CitizenShell>);
    const button = await screen.findByRole("button", { name: /account menu/i });
    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{Escape}");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
  });
});

describe("StaffShell", () => {
  it("shows administration links to admins only", async () => {
    await signInAs("admin@pkonek.demo");
    pathname = "/admin/users";
    renderApp(<StaffShell role="pasig_admin">content</StaffShell>);
    const nav = screen.getByRole("navigation", { name: /^Workspace$/i });
    expect(within(nav).getByRole("link", { name: /^Users$/i })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByText(/^Administration$/i)).toBeInTheDocument();
    expect(screen.getByText(/^City administration$/i)).toBeInTheDocument();
  });

  it("scopes officials to their barangay and hides admin tools", async () => {
    await signInAs("official@pkonek.demo");
    pathname = "/official";
    renderApp(<StaffShell role="official">content</StaffShell>);
    expect(await screen.findByText(/^Barangay Kapitolyo$/i)).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: /^Workspace$/i });
    expect(within(nav).getByRole("link", { name: /^Dashboard$/i })).toHaveAttribute("aria-current", "page");
    expect(within(nav).queryByRole("link", { name: /^Users$/i })).not.toBeInTheDocument();
  });

  it("searches complaints from the top bar", async () => {
    await signInAs("official@pkonek.demo");
    renderApp(<StaffShell role="official">content</StaffShell>);
    const search = screen.getByRole("search");
    expect(search).toHaveAttribute("action", "/official/complaints");
    expect(within(search).getByLabelText(/^Search complaints$/i)).toHaveAttribute("name", "q");
  });

  it("opens the navigation drawer on small screens", async () => {
    await signInAs("official@pkonek.demo");
    renderApp(<StaffShell role="official">content</StaffShell>);
    await userEvent.click(screen.getByRole("button", { name: /^Open navigation$/i }));
    const drawer = screen.getByRole("dialog", { name: /^PKonek workspace$/i });
    expect(within(drawer).getByRole("link", { name: /^Complaints$/i })).toHaveAttribute("href", "/official/complaints");
  });
});
