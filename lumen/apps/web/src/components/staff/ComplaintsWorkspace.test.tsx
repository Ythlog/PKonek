import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSyncExternalStore } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import type { PKonekApi } from "@/lib/api/contract";
import { DEMO_PASSWORD, createSeed } from "@/lib/api/mock/seed";
import { saveSession } from "@/lib/api/session";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { createQueryClient } from "@/lib/query";
import { ComplaintsWorkspace } from "./ComplaintsWorkspace";

const holder = vi.hoisted(() => ({ api: null as unknown as PKonekApi }));

// A tiny URL store so router.replace really changes useSearchParams.
const url = vi.hoisted(() => {
  let search = "";
  const listeners = new Set<() => void>();
  return {
    get: () => search,
    set: (next: string) => {
      search = next;
      listeners.forEach((l) => l());
    },
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/official/complaints",
  useRouter: () => ({
    replace: (href: string) => url.set(href.split("?")[1] ?? ""),
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(useSyncExternalStore(url.subscribe, url.get, url.get)),
}));

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
    get mediaService() {
      return holder.api.media;
    },
  };
});

const seed = createSeed();
const kapitolyo = seed.complaints.filter((c) => c.barangay === "Kapitolyo");

async function setup(email = "official@pkonek.demo", search = "") {
  sessionStorage.clear();
  url.set(search);
  const { createMockApi } = await import("@/lib/api/mock");
  const { memoryPersistence } = await import("@/lib/api/mock/persistence");
  const { getToken, notifyUnauthorized } = await import("@/lib/api/session");
  holder.api = createMockApi({ deps: { getToken, onUnauthorized: notifyUnauthorized }, persistence: memoryPersistence(), delayMs: 0 });
  saveSession(await holder.api.auth.login(email, DEMO_PASSWORD));
  const role = email.startsWith("admin") ? "pasig_admin" : "official";
  render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthProvider api={holder.api}>
        <ToastProvider>
          <ComplaintsWorkspace role={role} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

const table = () => screen.getByRole("table", { name: /complaints matching/i });
const rowTitles = () => within(table()).getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("button")[0].textContent);

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

describe("ComplaintsWorkspace", () => {
  it("scopes an official to their barangay by default", async () => {
    await setup();
    await waitFor(() => expect(within(table()).getAllByRole("row")).toHaveLength(kapitolyo.length + 1));
    expect(screen.getByText(/^Barangay Kapitolyo$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Barangay$/i)).toHaveValue("Kapitolyo");
  });

  it("filters by status and keeps it in the URL", async () => {
    const u = await setup();
    await waitFor(() => table());
    await u.click(screen.getByRole("button", { name: /^Open$/i, pressed: false }));
    expect(url.get()).toBe("status=open");
    const open = kapitolyo.filter((c) => c.status === "open");
    await waitFor(() => expect(rowTitles()).toHaveLength(open.length));
    expect(screen.getByRole("button", { name: /clear filters \(1\)/i })).toBeInTheDocument();
  });

  it("shows every barangay when the official switches to all", async () => {
    const u = await setup();
    await waitFor(() => table());
    await u.selectOptions(screen.getByLabelText(/^Barangay$/i), "");
    expect(url.get()).toBe("barangay=all");
    await waitFor(() => expect(screen.getByText(/showing 1–20 of 30/i)).toBeInTheDocument());
    await u.click(screen.getByRole("button", { name: /^Next$/i }));
    expect(url.get()).toBe("barangay=all&page=2");
    await waitFor(() => expect(screen.getByText(/showing 21–30 of 30/i)).toBeInTheDocument());
  });

  it("searches after typing pauses", async () => {
    const u = await setup("admin@pkonek.demo");
    await waitFor(() => table());
    await u.type(screen.getByRole("searchbox", { name: /^Search complaints$/i }), "streetlight");
    await waitFor(() => expect(url.get()).toBe("q=streetlight"), { timeout: 2000 });
    await waitFor(() => expect(rowTitles().every((t) => /streetlight|lamp|light/i.test(t ?? ""))).toBe(true));
  });

  it("shows an empty state with a way out", async () => {
    const u = await setup("official@pkonek.demo", "q=zzzzzz");
    expect(await screen.findByRole("heading", { name: /no complaints match/i })).toBeInTheDocument();
    await u.click(screen.getAllByRole("button", { name: /clear filters/i })[0]);
    expect(url.get()).toBe("");
  });

  it("opens a complaint, changes its status with a note and posts an update", async () => {
    const target = kapitolyo.find((c) => c.status === "open")!;
    const u = await setup("official@pkonek.demo", `selected=${target.id}`);
    const drawer = await screen.findByRole("dialog");
    expect(await within(drawer).findByText(target.title)).toBeInTheDocument();
    expect(within(drawer).getByText(target.reporter_name!)).toBeInTheDocument();

    const statusSelect = within(drawer).getByLabelText(/new status/i);
    expect(within(statusSelect).getAllByRole("option").map((o) => o.textContent)).toEqual(["In Progress", "Resolved", "Rejected"]);
    await u.type(within(drawer).getByLabelText(/note for the record/i), "Crew assigned");
    await u.click(within(drawer).getByRole("button", { name: /mark as in progress/i }));
    expect(await screen.findByText(/status changed to in progress/i)).toBeInTheDocument();
    await waitFor(() => expect(within(drawer).getAllByText(/^Crew assigned$/i).length).toBeGreaterThan(0));
    expect(within(within(drawer).getByLabelText(/new status/i)).getAllByRole("option").map((o) => o.textContent)).toEqual(["Resolved", "Rejected"]);

    await u.click(within(drawer).getByRole("button", { name: /^Post update$/i }));
    expect(within(drawer).getByLabelText(/^update/i)).toHaveAccessibleDescription(/write the update first/i);
    await u.type(within(drawer).getByLabelText(/^update/i), "We'll be there Wednesday.");
    await u.click(within(drawer).getByRole("button", { name: /^Post update$/i }));
    expect(await within(drawer).findByText(/^We'll be there Wednesday\.$/i)).toBeInTheDocument();

    const timeline = await holder.api.complaints.timeline(target.id);
    expect(timeline[0]).toMatchObject({ type: "response", detail: "We'll be there Wednesday.", is_public: true });
  });

  it("saves internal notes as staff only", async () => {
    const target = kapitolyo.find((c) => c.status === "open")!;
    const u = await setup("official@pkonek.demo", `selected=${target.id}`);
    const drawer = await screen.findByRole("dialog");
    await within(drawer).findByText(target.title);
    await u.click(within(drawer).getByRole("checkbox", { name: /visible to residents/i }));
    await u.type(within(drawer).getByLabelText(/^update/i), "Check with the hauler first.");
    await u.click(within(drawer).getByRole("button", { name: /^Save note$/i }));
    expect(await within(drawer).findByText(/^Staff only$/i)).toBeInTheDocument();
  });

  it("explains that closed complaints can't change", async () => {
    const closed = kapitolyo.find((c) => c.status === "resolved")!;
    await setup("official@pkonek.demo", `selected=${closed.id}`);
    const drawer = await screen.findByRole("dialog");
    expect(await within(drawer).findByText(/closed complaints can.t change status/i)).toBeInTheDocument();
  });

  it("closes the drawer and clears it from the URL", async () => {
    const u = await setup("official@pkonek.demo", `selected=${kapitolyo[0].id}`);
    const drawer = await screen.findByRole("dialog");
    await u.click(within(drawer).getByRole("button", { name: /^Close$/i }));
    expect(url.get()).toBe("");
    await act(async () => {});
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("uploads a progress photo", async () => {
    const target = kapitolyo.find((c) => c.status === "in_progress")!;
    const u = await setup("official@pkonek.demo", `selected=${target.id}`);
    const drawer = await screen.findByRole("dialog");
    await within(drawer).findByText(target.title);
    await u.upload(within(drawer).getByLabelText(/choose a progress photo/i), new File([new Uint8Array(64)], "crew.png", { type: "image/png" }));
    expect(await screen.findByText(/^Progress photo added$/i)).toBeInTheDocument();
    expect((await holder.api.complaints.timeline(target.id))[0].type).toBe("media");
  });
});
