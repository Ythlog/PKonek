import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { colorGroups, statusTokens } from "@/lib/design-tokens";
import StyleguidePage from "./page";

describe("/styleguide", () => {
  it("renders a page heading and every color token with its value", () => {
    render(<StyleguidePage />);
    expect(screen.getByRole("heading", { level: 1, name: /design system/i })).toBeInTheDocument();
    for (const group of colorGroups) {
      for (const token of group.tokens) {
        expect(screen.getByText(token.value)).toBeInTheDocument();
      }
    }
  });

  it("shows every status with a text label, not color alone", () => {
    render(<StyleguidePage />);
    const items = within(screen.getByRole("list", { name: /status examples/i })).getAllByRole("listitem");
    expect(items).toHaveLength(statusTokens.length);
    statusTokens.forEach((s, i) => expect(items[i]).toHaveTextContent(s.label));
  });
});
