import { describe, expect, it } from "vitest";
import { citizenNav, isActive, navFor, staffNav } from "./nav";

const hrefs = (role: Parameters<typeof navFor>[0]) => navFor(role).map((i) => i.href);

describe("navigation by role", () => {
  it("gives residents the four tab-bar destinations", () => {
    expect(citizenNav.map((i) => i.short ?? i.label)).toEqual(["Home", "Report", "My Reports", "Map"]);
    expect(hrefs("citizen").every((h) => h.startsWith("/app"))).toBe(true);
  });

  it("keeps officials to their work tools", () => {
    expect(hrefs("official")).toEqual(["/official", "/official/complaints", "/official/map", "/official/notifications"]);
  });

  it("adds analytics and administration for Pasig admins only", () => {
    expect(hrefs("pasig_admin")).toEqual([
      "/admin",
      "/admin/complaints",
      "/admin/map",
      "/admin/notifications",
      "/admin/analytics",
      "/admin/users",
      "/admin/categories",
      "/admin/logs",
    ]);
    expect(staffNav("pasig_admin").map((g) => g.label)).toEqual([undefined, "Insights", "Administration"]);
    expect(hrefs("official").some((h) => h.includes("users"))).toBe(false);
  });
});

describe("isActive", () => {
  it("matches the area home exactly and sections by prefix", () => {
    const home = { href: "/official", exact: true };
    const complaints = { href: "/official/complaints" };
    expect(isActive(home, "/official")).toBe(true);
    expect(isActive(home, "/official/complaints")).toBe(false);
    expect(isActive(complaints, "/official/complaints/12")).toBe(true);
    expect(isActive(complaints, "/official/complaintsx")).toBe(false);
  });
});
