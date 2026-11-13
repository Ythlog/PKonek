import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DemoModePill } from "./DemoModePill";

describe("DemoModePill", () => {
  it("shows when mock mode is on", () => {
    render(<DemoModePill enabled />);
    expect(screen.getByText("Demo data")).toBeInTheDocument();
  });

  it("renders nothing against the real API", () => {
    const { container } = render(<DemoModePill enabled={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
