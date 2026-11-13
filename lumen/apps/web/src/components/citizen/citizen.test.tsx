import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import type { PKonekApi } from "@/lib/api/contract";
import { DEMO_PASSWORD, createSeed } from "@/lib/api/mock/seed";
import { saveSession } from "@/lib/api/session";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { createQueryClient } from "@/lib/query";
import { MyReports } from "./MyReports";
import { ReportDetail } from "./ReportDetail";

const holder = vi.hoisted(() => ({ api: null as unknown as PKonekApi }));
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/app/reports", useSearchParams: () => new URLSearchParams() }));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    get api() {
      return holder.api;
    },
    get complaintService() {
      return holder.api.complaints;
    },
    get categoryService() {
      return holder.api.categories;
    },
  };
});

const seed = createSeed();
const mine = seed.complaints.filter((c) => c.created_by_user_id === 5);
const streetlights = mine.find((c) => c.status === "resolved")!;
const drain = mine.find((c) => c.status === "in_progress")!;
const neighbors = seed.complaints.find((c) => c.created_by_user_id !== 5 && c.status === "open")!;

async function renderAs(ui: ReactNode, email = "citizen@pkonek.demo") {
  sessionStorage.clear();
  const { createMockApi } = await import("@/lib/api/mock");
  const { memoryPersistence } = await import("@/lib/api/mock/persistence");
  const { getToken, notifyUnauthorized } = await import("@/lib/api/session");
  holder.api = createMockApi({ deps: { getToken, onUnauthorized: notifyUnauthorized }, persistence: memoryPersistence(), delayMs: 0 });
  saveSession(await holder.api.auth.login(email, DEMO_PASSWORD));
  render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthProvider api={holder.api}>
        <ToastProvider>{ui}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  Object.values(router).forEach((fn) => fn.mockReset());
});

describe("MyReports", () => {
  it("lists the resident's reports and calls out the one awaiting confirmation", async () => {
    const u = await renderAs(<MyReports />);
    expect(await screen.findByText(/1 report is waiting for your confirmation/i)).toBeInTheDocument();
    const allTab = screen.getByRole("tab", { name: /all/i });
    expect(allTab).toHaveTextContent(String(mine.length));
    await u.click(screen.getByRole("tab", { name: /needs you/i }));
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText(streetlights.title)).toBeInTheDocument();
    expect(within(panel).getByText(/^Awaiting verification$/i)).toBeInTheDocument();
    expect(within(panel).getByRole("link")).toHaveAttribute("href", `/app/reports/${streetlights.id}`);
  });

  it("finds a report by reference number", async () => {
    const u = await renderAs(<MyReports />);
    const lookup = await screen.findByRole("search", { name: /reference number/i });
    await u.type(within(lookup).getByLabelText(/^Reference number$/i), "nope");
    await u.click(within(lookup).getByRole("button", { name: /^Find report$/i }));
    expect(within(lookup).getByLabelText(/^Reference number$/i)).toHaveAccessibleDescription(/PSG-2026-000123/);

    await u.clear(within(lookup).getByLabelText(/^Reference number$/i));
    await u.type(within(lookup).getByLabelText(/^Reference number$/i), neighbors.reference_no.toLowerCase());
    await u.click(within(lookup).getByRole("button", { name: /^Find report$/i }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/app/reports/${neighbors.id}`));
  });

  it("says when a reference doesn't exist", async () => {
    const u = await renderAs(<MyReports />);
    const lookup = await screen.findByRole("search", { name: /reference number/i });
    await u.type(within(lookup).getByLabelText(/^Reference number$/i), "PSG-2026-000999");
    await u.click(within(lookup).getByRole("button", { name: /^Find report$/i }));
    await waitFor(() => expect(within(lookup).getByLabelText(/^Reference number$/i)).toHaveAccessibleDescription(/couldn't find PSG-2026-000999/i));
  });
});

describe("ReportDetail", () => {
  it("shows progress, the official's updates and the Me Too count", async () => {
    await renderAs(<ReportDetail id={drain.id} />);
    expect(await screen.findByRole("heading", { level: 1, name: drain.title })).toBeInTheDocument();
    const progress = screen.getByRole("list", { name: /^Progress$/i });
    expect(within(progress).getByText(/^Being worked on$/i).closest("li")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText(`${drain.report_count} people reported this`)).toBeInTheDocument();
    expect(await screen.findByText(/crew is scheduled/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /is it really fixed/i })).not.toBeInTheDocument();
  });

  it("confirms a fix", async () => {
    const u = await renderAs(<ReportDetail id={streetlights.id} />);
    const card = await screen.findByRole("region", { name: /is it really fixed/i });
    await u.click(within(card).getByRole("button", { name: /yes, it.s fixed/i }));
    await u.type(within(card).getByLabelText(/anything to add/i), "Bright again.");
    await u.click(within(card).getByRole("button", { name: /^Confirm the fix$/i }));
    expect(await screen.findByText(/thanks for confirming the fix/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("region", { name: /is it really fixed/i })).not.toBeInTheDocument());
    expect(await screen.findByText(/^Fix confirmed by the resident$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Confirmed by you$/i).closest("li")).not.toHaveAttribute("aria-current");
  });

  it("reopens a fix that didn't hold and requires a reason", async () => {
    const u = await renderAs(<ReportDetail id={streetlights.id} />);
    const card = await screen.findByRole("region", { name: /is it really fixed/i });
    await u.click(within(card).getByRole("button", { name: /no, reopen it/i }));
    await u.click(within(card).getByRole("button", { name: /^Reopen the report$/i }));
    expect(within(card).getByLabelText(/what's still wrong/i)).toHaveAccessibleDescription(/tell the barangay/i);
    await u.type(within(card).getByLabelText(/what's still wrong/i), "Two lights are still out.");
    await u.click(within(card).getByRole("button", { name: /^Reopen the report$/i }));
    expect(await screen.findByText(/^Report reopened$/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText(/^Reopened$/i).length).toBeGreaterThan(0));
    expect(await screen.findByText(/^Two lights are still out\.$/i)).toBeInTheDocument();
  });

  it("shows a neighbor's report without verification or private details", async () => {
    await renderAs(<ReportDetail id={neighbors.id} />);
    expect(await screen.findByText(/^Reported by a neighbor$/i)).toBeInTheDocument();
    expect(screen.queryByText(neighbors.reporter_name!)).not.toBeInTheDocument();
  });

  it("explains a missing report", async () => {
    await renderAs(<ReportDetail id={999} />);
    expect(await screen.findByText(/couldn't find this report/i)).toBeInTheDocument();
  });
});
