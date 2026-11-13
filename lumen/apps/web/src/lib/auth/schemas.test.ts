import { describe, expect, it } from "vitest";
import { fieldErrors, loginSchema, registerSchema } from "./schemas";

describe("loginSchema", () => {
  it("requires an email and a password", () => {
    expect(fieldErrors(loginSchema, { email: "", password: "" })).toEqual({
      email: "Enter your email address.",
      password: "Enter your password.",
    });
  });

  it("checks the email format and trims spaces", () => {
    expect(fieldErrors(loginSchema, { email: "juan@", password: "x" })).toEqual({ email: "Enter a valid email, like juan@example.com." });
    const parsed = loginSchema.parse({ email: "  juan@example.com ", password: "x" });
    expect(parsed.email).toBe("juan@example.com");
  });
});

describe("registerSchema", () => {
  const valid = {
    full_name: "Juan dela Cruz",
    email: "juan@example.com",
    barangay: "",
    contact_number: "",
    password: "longenough1",
    confirm_password: "longenough1",
    accept_terms: true,
  };

  it("accepts a complete form and turns empty optional fields into null", () => {
    const parsed = registerSchema.parse(valid);
    expect(parsed.barangay).toBeNull();
    expect(parsed.contact_number).toBeNull();
  });

  it("explains each problem", () => {
    expect(
      fieldErrors(registerSchema, {
        ...valid,
        full_name: " ",
        password: "short",
        confirm_password: "different",
        contact_number: "12",
        accept_terms: false,
      }),
    ).toEqual({
      full_name: "Enter your full name.",
      password: "Use at least 8 characters.",
      confirm_password: "The passwords don't match.",
      contact_number: "Enter a mobile number like 0917 123 4567.",
      accept_terms: "Please agree to continue.",
    });
  });

  it("limits passwords to 72 bytes like the backend", () => {
    expect(fieldErrors(registerSchema, { ...valid, password: "é".repeat(40), confirm_password: "é".repeat(40) })).toEqual({
      password: "That password is too long.",
    });
  });
});
