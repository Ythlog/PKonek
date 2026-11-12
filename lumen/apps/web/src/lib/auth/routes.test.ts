import { describe, expect, it } from "vitest";
import { homePathFor, isStaffRole, loginPathFor, safeNextPath } from "./routes";

describe("auth routes", () => {
  it("sends each role to its own area", () => {
    expect(homePathFor("citizen")).toBe("/app");
    expect(homePathFor("official")).toBe("/official");
    expect(homePathFor("pasig_admin")).toBe("/admin");
  });

  it("knows which roles are staff", () => {
    expect(isStaffRole("official")).toBe(true);
    expect(isStaffRole("pasig_admin")).toBe(true);
    expect(isStaffRole("citizen")).toBe(false);
    expect(isStaffRole(null)).toBe(false);
  });

  it("picks the right login page for a protected path", () => {
    expect(loginPathFor("/admin/users")).toBe("/staff/login?next=%2Fadmin%2Fusers");
    expect(loginPathFor("/official")).toBe("/staff/login?next=%2Fofficial");
    expect(loginPathFor("/app/reports")).toBe("/login?next=%2Fapp%2Freports");
  });

  it("only follows ?next= to a same-site page inside the user's own area", () => {
    expect(safeNextPath("/admin/users?page=2", "pasig_admin")).toBe("/admin/users?page=2");
    expect(safeNextPath("/official/complaints", "official")).toBe("/official/complaints");
    expect(safeNextPath("/app/reports/4", "citizen")).toBe("/app/reports/4");
    // other areas, other sites, and tricks
    expect(safeNextPath("/admin", "official")).toBeNull();
    expect(safeNextPath("/official", "citizen")).toBeNull();
    expect(safeNextPath("/administrator", "pasig_admin")).toBeNull();
    expect(safeNextPath("https://evil.example/admin", "pasig_admin")).toBeNull();
    expect(safeNextPath("//evil.example/admin", "pasig_admin")).toBeNull();
    expect(safeNextPath("/\\evil.example", "citizen")).toBeNull();
    expect(safeNextPath(null, "citizen")).toBeNull();
  });
});
