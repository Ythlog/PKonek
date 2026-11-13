import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import type { PKonekApi } from "@/lib/api/contract";
import { DEMO_PASSWORD, createSeed } from "@/lib/api/mock/seed";
import type { Pin } from "@/lib/api/types";
import { saveSession } from "@/lib/api/session";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { createQueryClient } from "@/lib/query";
import { ReportWizard } from "./ReportWizard";

// One fresh mock backend per test, used by both the wizard and the auth provider.
const holder = vi.hoisted(() => ({ api: null as unknown as PKonekApi }));

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

const drain = createSeed().complaints[4]; // open flooding report in Bagong Ilog, filed by someone else
const NEAR_DRAIN: Pin = { latitude: drain.latitude + 0.0001, longitude: drain.longitude };
const CLEAR_SPOT: Pin = { latitude: 14.6, longitude: 121.1 };
const OUTSIDE: Pin = { latitude: 14.65, longitude: 121.03 };

// Leaflet can't render in jsdom; this stand-in exposes the same callbacks.
vi.mock("@/components/map/PinMap", () => ({
  PinMap: ({ onChange, value }: { onChange: (p: Pin) => void; value: Pin | null }) => (
    <div data-testid="map" data-pin={value ? `${value.latitude},${value.longitude}` : ""}>
      <button type="button" onClick={() => onChange(NEAR_DRAIN)}>map: near drain</button>
      <button type="button" onClick={() => onChange(CLEAR_SPOT)}>map: clear spot</button>
      <button type="button" onClick={() => onChange(OUTSIDE)}>map: outside Pasig</button>
    </div>
  ),
}));

beforeEach(async () => {
  sessionStorage.clear();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  const { createMockApi } = await import("@/lib/api/mock");
  const { memoryPersistence } = await import("@/lib/api/mock/persistence");
  const { getToken, notifyUnauthorized } = await import("@/lib/api/session");
  holder.api = createMockApi({ deps: { getToken, onUnauthorized: notifyUnauthorized }, persistence: memoryPersistence(), delayMs: 0 });
  saveSession(await holder.api.auth.login("citizen@pkonek.demo", DEMO_PASSWORD));
});

function renderWizard() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthProvider api={holder.api}>
        <ToastProvider>
          <ReportWizard />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

const user = () => userEvent.setup({ applyAccept: false });
const continueButton = () => screen.getByRole("button", { name: /^(continue|skip photo)$/i });

async function chooseCategory(u: ReturnType<typeof user>, name: RegExp) {
  await u.click(await screen.findByRole("radio", { name }));
  await u.click(continueButton());
}

describe("ReportWizard", () => {
  it("requires a category before moving on", async () => {
    const u = user();
    renderWizard();
    await screen.findByRole("radio", { name: /roads and potholes/i });
    await u.click(continueButton());
    expect(screen.getByRole("heading", { name: /what kind of problem/i })).toBeInTheDocument();
    expect(screen.getByText("Choose a category to continue.")).toBeInTheDocument();
  });

  it("files a complete report and shows the reference number", async () => {
    const u = user();
    renderWizard();
    await chooseCategory(u, /roads and potholes/i);

    expect(screen.getByRole("heading", { name: /where is it/i })).toHaveFocus();
    await u.click(continueButton());
    expect(screen.getByText("Place a pin on the map to continue.")).toBeInTheDocument();

    await u.click(screen.getByRole("button", { name: "map: clear spot" }));
    expect(screen.getByText("Pin placed")).toBeInTheDocument();
    expect(screen.getByLabelText("Barangay")).not.toHaveValue("");
    await u.type(screen.getByLabelText(/street or landmark/i), "Near the overpass");
    await u.click(continueButton());

    await u.click(continueButton());
    expect(screen.getByLabelText(/short title/i)).toHaveAccessibleDescription(/at least 3 characters/i);
    await u.type(screen.getByLabelText(/short title/i), "Deep pothole on Marcos Highway");
    await u.type(screen.getByLabelText(/what's happening/i), "A deep pothole in the outer lane. Motorcycles swerve to avoid it.");
    await u.click(continueButton());

    expect(screen.getByRole("heading", { name: /add a photo/i })).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Skip photo" }));

    const review = screen.getByRole("heading", { name: /check and send/i }).closest("div")!.parentElement!;
    expect(within(review).getByText("Roads and Potholes")).toBeInTheDocument();
    expect(within(review).getByText("Deep pothole on Marcos Highway")).toBeInTheDocument();
    expect(within(review).getByText("No photo")).toBeInTheDocument();

    await u.click(screen.getByRole("button", { name: "Send report" }));
    expect(await screen.findByRole("heading", { name: /report sent/i })).toBeInTheDocument();
    const reference = screen.getByText(/^PSG-\d{4}-000031$/);
    expect(reference).toBeInTheDocument();

    const saved = await holder.api.complaints.get(31);
    expect(saved).toMatchObject({ title: "Deep pothole on Marcos Highway", address_text: "Near the overpass", status: "open" });
    expect(saved.barangay).toBeTruthy();
  });

  it("warns about a similar report nearby and adds a Me Too instead", async () => {
    const u = user();
    renderWizard();
    await chooseCategory(u, /flooding and drainage/i);
    await u.click(screen.getByRole("button", { name: "map: near drain" }));

    const panel = await screen.findByRole("region", { name: /already reported this nearby/i });
    expect(within(panel).getByText(drain.reference_no)).toBeInTheDocument();

    await u.click(continueButton());
    expect(screen.getByText(/a matching report is already open here/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /where is it/i })).toBeInTheDocument();

    await u.click(within(panel).getByRole("button", { name: new RegExp(`Me Too on ${drain.reference_no}`) }));
    expect(await screen.findByRole("heading", { name: /your me too was added/i })).toBeInTheDocument();
    expect((await holder.api.complaints.get(drain.id)).report_count).toBe(drain.report_count + 1);
  });

  it("lets residents switch category from the duplicate panel", async () => {
    const u = user();
    renderWizard();
    await chooseCategory(u, /flooding and drainage/i);
    await u.click(screen.getByRole("button", { name: "map: near drain" }));
    await u.click(await screen.findByRole("button", { name: /choose a different category/i }));
    expect(screen.getByRole("heading", { name: /what kind of problem/i })).toBeInTheDocument();
  });

  it("rejects a pin outside Pasig", async () => {
    const u = user();
    renderWizard();
    await chooseCategory(u, /streetlights/i);
    await u.click(screen.getByRole("button", { name: "map: outside Pasig" }));
    expect(screen.getByText(/outside Pasig City/i)).toBeInTheDocument();
    await u.click(continueButton());
    expect(screen.getByRole("heading", { name: /where is it/i })).toBeInTheDocument();
  });

  it("checks the photo and uploads it with the report", async () => {
    const u = user();
    renderWizard();
    await chooseCategory(u, /garbage and waste/i);
    await u.click(screen.getByRole("button", { name: "map: clear spot" }));
    await u.click(continueButton());
    await u.type(screen.getByLabelText(/short title/i), "Illegal dumping by the creek");
    await u.type(screen.getByLabelText(/what's happening/i), "Construction debris dumped every night.");
    await u.click(continueButton());

    const input = screen.getByLabelText(/take or choose a photo/i);
    await u.upload(input, new File(["gif"], "anim.gif", { type: "image/gif" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/JPG, PNG or WebP/);

    await u.upload(input, new File([new Uint8Array(2048)], "dumping.jpg", { type: "image/jpeg" }));
    expect(screen.getByText("dumping.jpg")).toBeInTheDocument();
    expect(screen.getByText("2 KB")).toBeInTheDocument();
    await u.click(continueButton());

    expect(screen.getByText("dumping.jpg")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Send report" }));
    await screen.findByRole("heading", { name: /report sent/i });
    await waitFor(async () => expect((await holder.api.complaints.get(31)).photo_url).toMatch(/^data:image\/jpeg/));
  });

  it("goes back to edit a step from the review", async () => {
    const u = user();
    renderWizard();
    await chooseCategory(u, /noise/i);
    await u.click(screen.getByRole("button", { name: "map: clear spot" }));
    await u.click(continueButton());
    await u.type(screen.getByLabelText(/short title/i), "Loud karaoke");
    await u.type(screen.getByLabelText(/what's happening/i), "Every night until 2 AM.");
    await u.click(continueButton());
    await u.click(continueButton());
    await u.click(screen.getByRole("button", { name: /edit description/i }));
    expect(screen.getByLabelText(/short title/i)).toHaveValue("Loud karaoke");
  });
});
