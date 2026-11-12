import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LandingPage from "./page";

describe("public landing page", () => {
  it("leads with the value proposition and the main call to action", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Report it. Track it. See it fixed." })).toBeInTheDocument();
    const reportLinks = screen.getAllByRole("link", { name: /report an issue/i });
    expect(reportLinks.length).toBeGreaterThan(1);
    reportLinks.forEach((l) => expect(l).toHaveAttribute("href", "/app/report"));
  });

  it("routes each audience to its sign-in", () => {
    render(<LandingPage />);
    const header = screen.getAllByRole("navigation", { name: "Main" })[0];
    expect(within(header).getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(within(header).getByRole("link", { name: "For officials" })).toHaveAttribute("href", "/staff/login");
    expect(screen.getByRole("link", { name: "Administrator sign in" })).toHaveAttribute("href", "/staff/login");
  });

  it("explains the three steps", () => {
    render(<LandingPage />);
    const steps = within(screen.getByRole("region", { name: /three steps/i })).getAllByRole("heading", { level: 3 });
    expect(steps.map((h) => h.textContent)).toEqual(["Report", "Track", "Verify"]);
  });
});
