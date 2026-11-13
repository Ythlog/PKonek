import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Complaint, Pin } from "@/lib/api/types";
import { createSeed } from "@/lib/api/mock/seed";
import type { Hotspot } from "@/lib/hotspots";
import { renderWithMockApi } from "@/test/renderWithMockApi";
import { CommunityMap } from "./CommunityMap";
import { MapMonitoring } from "./MapMonitoring";

vi.mock("@/lib/api", async (importOriginal) => (await import("@/test/renderWithMockApi")).mockApiModule(importOriginal as never));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/app/map", useSearchParams: () => new URLSearchParams() }));

// Leaflet can't draw in jsdom; these stand-ins expose what the map receives.
vi.mock("./ComplaintMap", () => ({
  ComplaintMap: ({ points = [], hotspots = [] }: { points?: Complaint[]; hotspots?: Hotspot[] }) => (
    <div data-testid="map" data-points={points.length} data-hotspots={hotspots.length} />
  ),
}));
vi.mock("@/components/map/PinMap", () => ({
  PinMap: ({ onChange }: { onChange: (p: Pin) => void }) => (
    <button type="button" onClick={() => onChange({ latitude: 14.6, longitude: 121.1 })}>
      move pin far away
    </button>
  ),
}));

const seed = createSeed();
const active = seed.complaints.filter((c) => c.status === "open" || c.status === "in_progress");
const neighbors = active.filter((c) => c.created_by_user_id !== 5).sort((a, b) => b.report_count - a.report_count)[0];

describe("CommunityMap", () => {
  it("shows active reports, most reported first", async () => {
    await renderWithMockApi(<CommunityMap />, "citizen@pkonek.demo");
    const list = await screen.findByRole("list", { name: /^Reports on the map$/i });
    expect(within(list).getAllByRole("listitem")).toHaveLength(active.length);
    expect(within(list).getAllByRole("button")[0]).toHaveTextContent(neighbors.title);
    expect(screen.getByTestId("map")).toHaveAttribute("data-points", String(active.length));
  });

  it("includes closed reports when asked and filters by category", async () => {
    const { user } = await renderWithMockApi(<CommunityMap />, "citizen@pkonek.demo");
    await screen.findByRole("list", { name: /^Reports on the map$/i });
    await user.click(screen.getByRole("checkbox", { name: /show resolved/i }));
    await waitFor(() => expect(screen.getByTestId("map")).toHaveAttribute("data-points", String(seed.complaints.length)));
    await user.selectOptions(screen.getByLabelText(/^Category$/i), "Streetlights");
    const lights = seed.complaints.filter((c) => c.category_id === 4).length;
    await waitFor(() => expect(screen.getByTestId("map")).toHaveAttribute("data-points", String(lights)));
  });

  it("adds a Me Too from the list", async () => {
    const { user, api } = await renderWithMockApi(<CommunityMap />, "citizen@pkonek.demo");
    const list = await screen.findByRole("list", { name: /^Reports on the map$/i });
    await user.click(within(list).getByRole("button", { name: new RegExp(neighbors.title) }));
    await user.click(within(list).getByRole("button", { name: new RegExp(`Me Too on ${neighbors.reference_no}`) }));
    const dialog = screen.getByRole("dialog", { name: /^Add your Me Too$/i });
    await user.type(within(dialog).getByLabelText(/anything to add/i), "Still there today.");
    await user.click(within(dialog).getByRole("button", { name: /^Me Too$/i }));
    expect(await screen.findByText(/^Your Me Too was added$/i)).toBeInTheDocument();
    expect((await api.complaints.get(neighbors.id)).report_count).toBe(neighbors.report_count + 1);
  });

  it("explains when the pin is too far from the report", async () => {
    const { user } = await renderWithMockApi(<CommunityMap />, "citizen@pkonek.demo");
    const list = await screen.findByRole("list", { name: /^Reports on the map$/i });
    await user.click(within(list).getByRole("button", { name: new RegExp(neighbors.title) }));
    await user.click(within(list).getByRole("button", { name: new RegExp(`Me Too on ${neighbors.reference_no}`) }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "move pin far away" }));
    await user.click(within(dialog).getByRole("button", { name: /^Me Too$/i }));
    expect(await within(dialog).findByText(/supports must be within 50 m/)).toBeInTheDocument();
  });

  it("doesn't offer Me Too on the resident's own report", async () => {
    const own = active.find((c) => c.created_by_user_id === 5)!;
    const { user } = await renderWithMockApi(<CommunityMap />, "citizen@pkonek.demo");
    const list = await screen.findByRole("list", { name: /^Reports on the map$/i });
    await user.click(within(list).getByRole("button", { name: new RegExp(own.title) }));
    await waitFor(() => expect(within(list).getByText(/^You reported this$/i)).toBeInTheDocument());
  });
});

describe("MapMonitoring", () => {
  it("ranks hotspots for the official's barangay and opens their complaints", async () => {
    const { user } = await renderWithMockApi(<MapMonitoring role="official" />, "official@pkonek.demo");
    const ranking = await screen.findByRole("list", { name: /hotspots ranked/i });
    expect(screen.getByLabelText(/^Barangay$/i)).toHaveValue("Kapitolyo");
    const first = within(ranking).getAllByRole("button")[0];
    await user.click(first);
    expect(first).toHaveAttribute("aria-pressed", "true");
    expect(within(ranking).getAllByRole("link")[0]).toHaveAttribute("href", expect.stringMatching(/^\/official\/complaints\?selected=\d+$/));
  });

  it("shows city-wide hotspots to admins and switches to pins", async () => {
    const { user } = await renderWithMockApi(<MapMonitoring role="pasig_admin" />, "admin@pkonek.demo");
    await screen.findByRole("list", { name: /hotspots ranked/i });
    expect(Number(screen.getByTestId("map").getAttribute("data-hotspots"))).toBeGreaterThan(5);
    await user.click(screen.getByRole("tab", { name: /all pins/i }));
    await waitFor(() => expect(screen.getByTestId("map")).toHaveAttribute("data-points", String(active.length)));
    await user.click(screen.getByRole("button", { name: /^Resolved$/i, pressed: false }));
    const withResolved = seed.complaints.filter((c) => c.status !== "rejected").length;
    await waitFor(() => expect(screen.getByTestId("map")).toHaveAttribute("data-points", String(withResolved)));
  });
});
