import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToastProvider } from "@/components/ui";
import { colorGroups, statusTokens } from "@/lib/design-tokens";
import { galleryComponents } from "./ComponentGallery";
import StyleguidePage from "./page";

function renderPage() {
  return render(
    <ToastProvider>
      <StyleguidePage />
    </ToastProvider>,
  );
}

describe("/styleguide", () => {
  it("renders a page heading and every color token with its value", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: /design system/i })).toBeInTheDocument();
    for (const group of colorGroups) {
      for (const token of group.tokens) {
        expect(screen.getByText(token.value)).toBeInTheDocument();
      }
    }
  });

  it("shows every status with a text label, not color alone", () => {
    renderPage();
    const items = within(screen.getByRole("list", { name: /status examples/i })).getAllByRole("listitem");
    expect(items).toHaveLength(statusTokens.length);
    statusTokens.forEach((s, i) => expect(items[i]).toHaveTextContent(s.label));
  });

  it("shows a demo for every shared component", () => {
    renderPage();
    const section = screen.getByRole("region", { name: "Components" });
    for (const name of galleryComponents) {
      expect(within(section).getByRole("heading", { level: 3, name })).toBeInTheDocument();
    }
  });
});
