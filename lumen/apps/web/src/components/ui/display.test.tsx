import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Alert } from "./Alert";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { Card } from "./Card";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "./Skeleton";
import { Spinner } from "./Spinner";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it.each([
    ["open", "Open", "text-status-open"],
    ["in_progress", "In Progress", "text-status-in-progress"],
    ["resolved", "Resolved", "text-status-resolved"],
    ["rejected", "Rejected", "text-status-rejected"],
  ] as const)("maps backend status %s to a labelled pill", (status, label, cls) => {
    render(<StatusBadge status={status} />);
    const badge = screen.getByText(label).closest("span[data-status]");
    expect(badge).toHaveAttribute("data-status", status);
    expect(badge).toHaveClass(cls);
  });
});

describe("Badge", () => {
  it("renders a tone", () => {
    render(<Badge tone="accent">12 Me Too</Badge>);
    expect(screen.getByText("12 Me Too")).toHaveClass("bg-accent");
  });
});

describe("Alert", () => {
  it("uses role=alert for errors and role=status otherwise", () => {
    render(
      <>
        <Alert tone="danger" title="Could not sign in">Check your password.</Alert>
        <Alert tone="success" title="Saved" />
      </>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Could not sign in");
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });

  it("can be dismissed", async () => {
    const onDismiss = vi.fn();
    render(<Alert tone="info" title="Heads up" onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

describe("Card", () => {
  it("adds a hover shadow only when interactive", () => {
    render(
      <>
        <Card data-testid="plain">A</Card>
        <Card data-testid="hover" interactive>
          B
        </Card>
      </>,
    );
    expect(screen.getByTestId("plain")).not.toHaveClass("hover:shadow-card-hover");
    expect(screen.getByTestId("hover")).toHaveClass("hover:shadow-card-hover");
  });
});

describe("EmptyState", () => {
  it("suggests the next action", () => {
    render(<EmptyState title="No reports yet" description="Your reports appear here." action={<button>Report an issue</button>} />);
    expect(screen.getByRole("heading", { name: /^No reports yet$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Report an issue$/i })).toBeInTheDocument();
  });
});

describe("Avatar", () => {
  it("shows initials with the full name as the accessible label", () => {
    render(<Avatar name="Juan dela Cruz" />);
    expect(screen.getByRole("img", { name: /^Juan dela Cruz$/i })).toHaveTextContent("JC");
  });
});

describe("Spinner and Skeleton", () => {
  it("announces loading and hides skeletons from screen readers", () => {
    const { container } = render(
      <>
        <Spinner label="Loading complaints" />
        <Skeleton className="h-4" />
      </>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Loading complaints");
    expect(container.querySelector("[aria-hidden='true'].animate-pulse")).not.toBeNull();
  });
});
