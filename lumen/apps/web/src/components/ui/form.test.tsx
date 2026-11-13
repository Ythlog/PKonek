import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button, buttonClasses } from "./Button";
import { Checkbox } from "./Checkbox";
import { Field } from "./Field";
import { Input } from "./Input";
import { Select } from "./Select";
import { Textarea } from "./Textarea";

describe("Button", () => {
  it.each([
    ["primary", "bg-brand-600"],
    ["accent", "bg-accent"],
    ["secondary", "border-border"],
    ["ghost", "bg-transparent"],
    ["danger", "bg-danger"],
  ] as const)("applies the %s variant", (variant, cls) => {
    render(<Button variant={variant}>Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveClass(cls);
  });

  it("is a 44px touch target by default", () => {
    expect(buttonClasses()).toContain("min-h-touch");
  });

  it("disables itself and announces progress while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Submit
      </Button>,
    );
    const button = screen.getByRole("button", { name: /submit/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Plain</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});

describe("Field", () => {
  it("links the label, helper text and error to the input", () => {
    render(
      <Field label="Email" helper="We never share it." error="Enter a valid email." required>
        <Input type="email" />
      </Field>,
    );
    const input = screen.getByLabelText(/email/i);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription("We never share it. Enter a valid email.");
  });

  it("marks the field as valid when there is no error", () => {
    render(
      <Field label="Title">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText("Title")).not.toHaveAttribute("aria-invalid");
  });

  it("works with Select and Textarea", () => {
    render(
      <>
        <Field label="Category">
          <Select placeholder="Choose one">
            <option value="1">Roads</option>
          </Select>
        </Field>
        <Field label="Description" helper="Be specific.">
          <Textarea maxLength={100} showCount defaultValue="Hello" />
        </Field>
      </>,
    );
    expect(screen.getByLabelText("Category")).toHaveDisplayValue("Choose one");
    expect(screen.getByLabelText("Description")).toHaveAccessibleDescription(/be specific/i);
    expect(screen.getByText("5 / 100")).toBeInTheDocument();
  });
});

describe("Textarea count", () => {
  it("updates while typing", async () => {
    render(<Textarea aria-label="Notes" maxLength={20} showCount />);
    await userEvent.type(screen.getByLabelText("Notes"), "Flooded");
    expect(screen.getByText("7 / 20")).toBeInTheDocument();
  });
});

describe("Checkbox", () => {
  it("has a clickable label and a description", async () => {
    render(<Checkbox label="Keep me signed in" description="On this device only" />);
    const box = screen.getByRole("checkbox", { name: "Keep me signed in" });
    expect(box).toHaveAccessibleDescription("On this device only");
    await userEvent.click(screen.getByText("Keep me signed in"));
    expect(box).toBeChecked();
  });
});
