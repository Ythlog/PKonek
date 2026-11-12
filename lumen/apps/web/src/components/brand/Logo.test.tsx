import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Logo, LOGO_SRC } from "./Logo";

describe("Logo", () => {
  it("renders the logo image with alt text", () => {
    render(<Logo />);
    expect(screen.getByRole("img", { name: "PKonek" })).toHaveAttribute("src", LOGO_SRC);
  });

  it("falls back to a text wordmark when the image fails to load", () => {
    render(<Logo />);
    fireEvent.error(screen.getByRole("img", { name: "PKonek" }));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("PKonek")).toBeInTheDocument();
  });

  it("wraps the logo in a brand badge for light backgrounds", () => {
    const { container } = render(<Logo variant="badge" />);
    expect(container.firstChild).toHaveClass("bg-brand-700");
  });
});
