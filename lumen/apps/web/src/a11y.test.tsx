import axe from "axe-core";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { MyReports } from "@/components/citizen/MyReports";
import { AccountabilityReport } from "@/components/public/AccountabilityReport";
import { ReportWizard } from "@/components/report/ReportWizard";
import { ComplaintsWorkspace } from "@/components/staff/ComplaintsWorkspace";
import { renderWithMockApi } from "@/test/renderWithMockApi";
import LandingPage from "./app/page";

vi.mock("@/lib/api", async (importOriginal) => (await import("@/test/renderWithMockApi")).mockApiModule(importOriginal as never));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/map/PinMap", () => ({ PinMap: () => <div /> }));

/** Runs axe on the rendered DOM. jsdom can't compute colors, so contrast lives in contrast.test.ts. */
async function violations(container: HTMLElement) {
  const result = await axe.run(container, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

const cases: Array<[string, () => ReactNode, string | undefined, RegExp]> = [
  ["landing page", () => <LandingPage />, undefined, /report it\. track it/i],
  ["report wizard", () => <ReportWizard />, "citizen@pkonek.demo", /roads and potholes/i],
  ["my reports", () => <MyReports />, "citizen@pkonek.demo", /waiting for your confirmation/i],
  ["complaints workspace", () => <ComplaintsWorkspace role="official" />, "official@pkonek.demo", /complaints matching/i],
  ["accountability report", () => <AccountabilityReport />, undefined, /recently fixed/i],
];

describe("accessibility (axe)", () => {
  it.each(cases)("%s has no violations", async (_name, ui, email, ready) => {
    const { container } = await renderWithMockApi(ui(), email);
    await screen.findAllByText(ready);
    expect(await violations(container)).toEqual([]);
  });
});
