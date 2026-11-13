import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Drawer, Modal } from "./Modal";
import { Tabs } from "./Tabs";
import { ToastProvider, useToast } from "./Toast";

describe("Modal", () => {
  it("is a labelled dialog that closes with the close button and Escape", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Change status" description="Pick the new status.">
        <p>Body</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Change status" });
    expect(dialog).toHaveAccessibleDescription("Pick the new status.");
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("renders nothing visible when closed", () => {
    render(
      <Modal open={false} onClose={() => {}} title="Hidden">
        x
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Drawer", () => {
  it("is a labelled dialog anchored to a side", () => {
    render(
      <Drawer open onClose={() => {}} title="Complaint PSG-2026-000123" side="right">
        details
      </Drawer>,
    );
    expect(screen.getByRole("dialog", { name: "Complaint PSG-2026-000123" })).toHaveAttribute("data-side", "right");
  });
});

describe("Tabs", () => {
  const items = [
    { id: "list", label: "List", content: <p>List view</p> },
    { id: "map", label: "Map", content: <p>Map view</p>, count: 4 },
    { id: "stats", label: "Stats", content: <p>Stats view</p> },
  ];

  it("shows the selected panel and moves with arrow keys", async () => {
    render(<Tabs label="Views" items={items} />);
    expect(screen.getByRole("tab", { name: "List" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("List view");

    screen.getByRole("tab", { name: "List" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /map/i })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Map view");

    await userEvent.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Stats" })).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "List" })).toHaveAttribute("aria-selected", "true");
  });
});

describe("Toast", () => {
  afterEach(() => vi.useRealTimers());

  function Trigger() {
    const toast = useToast();
    return <button onClick={() => toast.show({ tone: "success", title: "Report sent" })}>Send</button>;
  }

  it("announces toasts in a live region and dismisses them", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    const region = screen.getByRole("region", { name: /notifications/i });
    expect(region).toHaveTextContent("Report sent");
    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(region).not.toHaveTextContent("Report sent");
  });

  it("auto-dismisses after a few seconds", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByText("Report sent")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.queryByText("Report sent")).not.toBeInTheDocument();
  });
});
