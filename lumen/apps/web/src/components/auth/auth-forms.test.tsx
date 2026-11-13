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
import { LoginForm } from "./LoginForm";
import { PasswordInput } from "./PasswordInput";
import { RegisterForm } from "./RegisterForm";
import { Field } from "@/components/ui/Field";

const router = { replace: vi.fn(), push: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() };
let search = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => search,
  usePathname: () => "/login",
}));

let api: PKonekApi;

function renderWithAuth(ui: ReactNode) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthProvider api={api}>
        <ToastProvider>{ui}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  sessionStorage.clear();
  search = new URLSearchParams();
  Object.values(router).forEach((fn) => fn.mockReset());
  api = createMockApi({ deps: { getToken, onUnauthorized: notifyUnauthorized }, persistence: memoryPersistence(), delayMs: 0 });
});

const form = (name: RegExp) => screen.getByRole("form", { name });

describe("LoginForm (staff)", () => {
  it("shows inline errors and focuses the first problem", async () => {
    renderWithAuth(<LoginForm area="staff" />);
    await userEvent.click(screen.getByRole("button", { name: /^Sign in$/i }));
    const email = screen.getByLabelText(/work email/i);
    expect(email).toHaveAccessibleDescription(/enter your email address/i);
    expect(email).toHaveFocus();
    expect(screen.getByLabelText(/^password/i)).toHaveAccessibleDescription(/enter your password/i);
  });

  it.each([
    ["official@pkonek.demo", "/official"],
    ["admin@pkonek.demo", "/admin"],
  ])("signs in %s and redirects to %s", async (email, path) => {
    renderWithAuth(<LoginForm area="staff" />);
    await userEvent.type(screen.getByLabelText(/work email/i), email);
    await userEvent.type(screen.getByLabelText(/^password/i), DEMO_PASSWORD);
    await userEvent.click(within(form(/staff sign in/i)).getByRole("button", { name: /^Sign in$/i }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(path));
    expect(await screen.findByText(/welcome back/i)).toBeInTheDocument();
  });

  it("follows a safe ?next= link inside the user's own area", async () => {
    search = new URLSearchParams({ next: "/admin/users" });
    renderWithAuth(<LoginForm area="staff" />);
    await userEvent.click(screen.getByRole("button", { name: /pasig administrator/i }));
    await userEvent.click(within(form(/staff sign in/i)).getByRole("button", { name: /^Sign in$/i }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/admin/users"));
  });

  it("ignores ?next= links outside the user's area", async () => {
    search = new URLSearchParams({ next: "https://evil.example" });
    renderWithAuth(<LoginForm area="staff" />);
    await userEvent.click(screen.getByRole("button", { name: /barangay official/i }));
    await userEvent.click(within(form(/staff sign in/i)).getByRole("button", { name: /^Sign in$/i }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/official"));
  });

  it("shows one message for a wrong password and clears the password field", async () => {
    renderWithAuth(<LoginForm area="staff" />);
    await userEvent.type(screen.getByLabelText(/work email/i), "official@pkonek.demo");
    await userEvent.type(screen.getByLabelText(/^password/i), "wrong-password");
    await userEvent.click(within(form(/staff sign in/i)).getByRole("button", { name: /^Sign in$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
    expect(screen.getByLabelText(/^password/i)).toHaveValue("");
    expect(screen.getByLabelText(/^password/i)).toHaveFocus();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("turns away resident accounts and points them to the resident sign-in", async () => {
    renderWithAuth(<LoginForm area="staff" />);
    await userEvent.type(screen.getByLabelText(/work email/i), "citizen@pkonek.demo");
    await userEvent.type(screen.getByLabelText(/^password/i), DEMO_PASSWORD);
    await userEvent.click(within(form(/staff sign in/i)).getByRole("button", { name: /^Sign in$/i }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/for barangay and city staff/i);
    expect(within(alert).getByRole("link", { name: /resident sign-in/i })).toHaveAttribute("href", "/login");
    await waitFor(() => expect(readSession()).toBeNull());
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("offers only staff demo accounts", () => {
    renderWithAuth(<LoginForm area="staff" />);
    const demo = screen.getByRole("region", { name: /demo accounts/i });
    expect(within(demo).getAllByRole("button")).toHaveLength(2);
    expect(within(demo).queryByText("citizen@pkonek.demo")).not.toBeInTheDocument();
  });

  it("redirects right away when already signed in", async () => {
    saveSession(await api.auth.login("admin@pkonek.demo", DEMO_PASSWORD));
    renderWithAuth(<LoginForm area="staff" />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/admin"));
  });
});

describe("LoginForm (citizen)", () => {
  it("signs a resident in and goes to the resident area", async () => {
    renderWithAuth(<LoginForm area="citizen" />);
    await userEvent.click(screen.getByRole("button", { name: /citizen/i }));
    expect(screen.getByLabelText(/email address/i)).toHaveValue("citizen@pkonek.demo");
    await userEvent.click(within(form(/resident sign in/i)).getByRole("button", { name: /^Sign in$/i }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/app"));
  });
});

describe("RegisterForm", () => {
  async function fill(overrides: Partial<Record<string, string>> = {}) {
    const v = { name: "Maria Clara", email: "maria@example.com", password: "longenough1", confirm: "longenough1", ...overrides };
    if (v.name) await userEvent.type(screen.getByLabelText(/full name/i), v.name);
    if (v.email) await userEvent.type(screen.getByLabelText(/email address/i), v.email);
    await userEvent.selectOptions(screen.getByLabelText(/barangay/i), "Ugong");
    if (v.password) await userEvent.type(screen.getByLabelText(/^password/i), v.password);
    if (v.confirm) await userEvent.type(screen.getByLabelText(/confirm password/i), v.confirm);
  }

  it("creates a citizen account and opens the resident area", async () => {
    renderWithAuth(<RegisterForm />);
    await fill();
    await userEvent.click(screen.getByRole("checkbox", { name: /shown publicly/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Create account$/i }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/app"));
    expect(readSession()?.role).toBe("citizen");
    await expect(api.auth.me()).resolves.toMatchObject({ email: "maria@example.com", barangay: "Ugong" });
  });

  it("explains every invalid field and focuses the first one", async () => {
    renderWithAuth(<RegisterForm />);
    await fill({ name: "", password: "short", confirm: "other" });
    await userEvent.click(screen.getByRole("button", { name: /^Create account$/i }));
    expect(screen.getByLabelText(/full name/i)).toHaveFocus();
    expect(screen.getByLabelText(/full name/i)).toHaveAccessibleDescription(/enter your full name/i);
    expect(screen.getByLabelText(/^password/i)).toHaveAccessibleDescription(/at least 8 characters/i);
    expect(screen.getByLabelText(/confirm password/i)).toHaveAccessibleDescription(/don't match/i);
    expect(screen.getByRole("checkbox", { name: /shown publicly/i })).toHaveAccessibleDescription(/please agree/i);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("points to sign-in when the email is taken", async () => {
    renderWithAuth(<RegisterForm />);
    await fill({ email: "citizen@pkonek.demo" });
    await userEvent.click(screen.getByRole("checkbox", { name: /shown publicly/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Create account$/i }));
    await waitFor(() => expect(screen.getByLabelText(/email address/i)).toHaveAccessibleDescription(/already exists/i));
    expect(screen.getByLabelText(/email address/i)).toHaveFocus();
  });
});

describe("PasswordInput", () => {
  it("toggles visibility with an accessible button", async () => {
    render(
      <Field label="Password">
        <PasswordInput />
      </Field>,
    );
    const input = screen.getByLabelText(/^Password$/i);
    expect(input).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: /^Show password$/i }));
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: /^Hide password$/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("warns when Caps Lock is on", async () => {
    render(
      <Field label="Password">
        <PasswordInput />
      </Field>,
    );
    await userEvent.click(screen.getByLabelText(/^Password$/i));
    await userEvent.keyboard("{CapsLock}A");
    expect(screen.getByText(/^Caps Lock is on$/i)).toBeInTheDocument();
  });
});
