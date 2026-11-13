import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuditLogs, describeChange } from "@/components/admin/AuditLogs";
import { CategoryManagement, codeFromName } from "@/components/admin/CategoryManagement";
import { UserManagement, generatePassword } from "@/components/admin/UserManagement";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { notificationHref } from "@/components/notifications/notifications";
import { AccountabilityReport } from "@/components/public/AccountabilityReport";
import { createSeed } from "@/lib/api/mock/seed";
import { renderWithMockApi } from "@/test/renderWithMockApi";

vi.mock("@/lib/api", async (importOriginal) => (await import("@/test/renderWithMockApi")).mockApiModule(importOriginal as never));
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/admin", useSearchParams: () => new URLSearchParams() }));
// Charts need real layout; the text summaries above each chart are what we check.
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return { ...actual, ResponsiveContainer: () => null };
});

const seed = createSeed();

describe("AnalyticsView", () => {
  it("summarizes all complaints and narrows to a barangay", async () => {
    const { user } = await renderWithMockApi(<AnalyticsView />, "admin@pkonek.demo");
    await user.selectOptions(screen.getByLabelText("Time range"), "0");
    await waitFor(() => expect(screen.getByText("Complaints").parentElement).toHaveTextContent(String(seed.complaints.length)));
    expect(screen.getByRole("table", { name: "By barangay" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "By category" })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Barangay"), "Kapitolyo");
    const kapitolyo = seed.complaints.filter((c) => c.barangay === "Kapitolyo").length;
    await waitFor(() => expect(screen.getByText("Complaints").parentElement).toHaveTextContent(String(kapitolyo)));
    expect(screen.queryByRole("table", { name: "By barangay" })).not.toBeInTheDocument();
  });
});

describe("AccountabilityReport", () => {
  it("shows city totals, sortable tables and recent fixes without signing in", async () => {
    const { user } = await renderWithMockApi(<AccountabilityReport />);
    const table = await screen.findByRole("table", { name: /by barangay/i });
    expect(within(table).getAllByRole("row")).toHaveLength(new Set(seed.complaints.map((c) => c.barangay)).size + 1);
    await user.click(within(table).getByRole("button", { name: /resolved/i }));
    expect(within(table).getAllByRole("columnheader")[2]).toHaveAttribute("aria-sort", "descending");
    expect(screen.getByRole("heading", { name: "Recently fixed" })).toBeInTheDocument();
    expect(screen.getAllByText(/^Fixed in /).length).toBeGreaterThan(0);
  });
});

describe("UserManagement", () => {
  it("lists staff accounts and creates an official with a generated password", async () => {
    const { user, api } = await renderWithMockApi(<UserManagement />, "admin@pkonek.demo");
    const table = await screen.findByRole("table", { name: "Staff accounts" });
    expect(within(table).getByText("Ramon Aquino")).toBeInTheDocument();
    expect(within(table).queryByText("Juan dela Cruz")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add a staff account" }));
    const dialog = screen.getByRole("dialog", { name: "Add a staff account" });
    await user.click(within(dialog).getByRole("button", { name: "Create account" }));
    expect(within(dialog).getByLabelText(/full name/i)).toHaveAccessibleDescription(/enter their full name/i);
    expect(within(dialog).getByLabelText(/^barangay/i)).toHaveAccessibleDescription(/officials need a barangay/i);

    await user.type(within(dialog).getByLabelText(/full name/i), "Liza Ramos");
    await user.type(within(dialog).getByLabelText(/work email/i), "liza@pasig.gov.ph");
    await user.selectOptions(within(dialog).getByLabelText(/^barangay/i), "Ugong");
    const password = (within(dialog).getByLabelText(/temporary password/i) as HTMLInputElement).value;
    expect(password).toHaveLength(12);
    await user.click(within(dialog).getByRole("button", { name: "Create account" }));
    expect(await screen.findByText(/account created for liza ramos/i)).toBeInTheDocument();
    await expect(api.auth.login("liza@pasig.gov.ph", password)).resolves.toMatchObject({ role: "official" });
  });

  it("deactivates an account and protects the admin's own", async () => {
    const { user } = await renderWithMockApi(<UserManagement />, "admin@pkonek.demo");
    await user.click(await screen.findByRole("button", { name: "Edit Ana Reyes" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Deactivate" }));
    expect(await screen.findByText("Ana Reyes deactivated")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit Patricia Lopez" }));
    const self = screen.getByRole("dialog");
    expect(within(self).getByRole("button", { name: "Deactivate" })).toBeDisabled();
    expect(within(self).getByLabelText(/^role/i)).toBeDisabled();
  });

  it("generates passwords from a safe alphabet", () => {
    expect(generatePassword(() => 0)).toBe("AAAAAAAAAAAA");
    expect(generatePassword()).toMatch(/^[A-HJ-NP-Za-km-z2-9]{12}$/);
  });
});

describe("CategoryManagement", () => {
  it("adds a category with a code made from its name and hides another", async () => {
    const { user, api } = await renderWithMockApi(<CategoryManagement />, "admin@pkonek.demo");
    await user.click(await screen.findByRole("button", { name: "Add a category" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/^name/i), "Fallen Trees & Debris");
    expect(within(dialog).getByLabelText(/^code/i)).toHaveValue("fallen_trees_debris");
    await user.click(within(dialog).getByRole("button", { name: "Add category" }));
    expect(await screen.findByText("Fallen Trees & Debris added")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hide Noise" }));
    expect(await screen.findByText("Noise is hidden from residents")).toBeInTheDocument();
    expect((await api.categories.list()).map((c) => c.name)).not.toContain("Noise");
  });

  it("builds codes like the backend expects", () => {
    expect(codeFromName("  Ñoño Street Lamps! ")).toBe("nono_street_lamps");
  });
});

describe("AuditLogs", () => {
  it("shows sign-ins and the audit trail with readable changes", async () => {
    const { user } = await renderWithMockApi(<AuditLogs />, "admin@pkonek.demo");
    const activity = await screen.findByRole("table", { name: "Account activity" });
    expect(within(activity).getAllByText("Signed in").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("tab", { name: "Audit trail" }));
    const audit = await screen.findByRole("table", { name: "Audit trail" });
    expect(within(audit).getAllByText(/status: open → /).length).toBeGreaterThan(0);
  });

  it("describes only what changed", () => {
    expect(describeChange({ status: "open", note: null }, { status: "resolved", note: null })).toBe("status: open → resolved");
    expect(describeChange(null, { role: "official" })).toBe("role: official");
  });
});

describe("notifications", () => {
  it("shows the unread count and opens the related report", async () => {
    router.push.mockReset();
    const { user, api } = await renderWithMockApi(<NotificationBell />, "citizen@pkonek.demo");
    const unread = (await api.notifications.unreadCount());
    const bell = await screen.findByRole("button", { name: `Notifications, ${unread} unread` });
    await user.click(bell);
    const first = (await api.notifications.list({ page_size: 1 })).items[0];
    await user.click(await screen.findByRole("button", { name: new RegExp(first.title) }));
    expect(router.push).toHaveBeenCalledWith(`/app/reports/${first.complaint_id}`);
    await waitFor(async () => expect(await api.notifications.unreadCount()).toBe(first.read_at ? unread : unread - 1));
  });

  it("marks everything read from the notification center", async () => {
    const { user, api } = await renderWithMockApi(<NotificationCenter />, "official@pkonek.demo");
    await user.click(await screen.findByRole("button", { name: "Mark all as read" }));
    await waitFor(async () => expect(await api.notifications.unreadCount()).toBe(0));
    await user.click(screen.getByRole("tab", { name: /unread/i }));
    expect(await screen.findByText("No unread notifications")).toBeInTheDocument();
  });

  it("links staff to the complaint drawer", () => {
    expect(notificationHref({ complaint_id: 7 }, "official")).toBe("/official/complaints?selected=7");
    expect(notificationHref({ complaint_id: null }, "pasig_admin")).toBe("/admin/notifications");
  });
});
