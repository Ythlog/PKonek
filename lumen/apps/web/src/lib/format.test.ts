import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, greeting, parseApiDate, timeAgo } from "./format";

const NOW = Date.parse("2026-11-13T04:00:00Z"); // 12:00 PM in Manila

describe("parseApiDate", () => {
  it("reads naive backend datetimes as UTC", () => {
    expect(parseApiDate("2026-11-13T04:00:00").toISOString()).toBe("2026-11-13T04:00:00.000Z");
    expect(parseApiDate("2026-11-13T04:00:00Z").toISOString()).toBe("2026-11-13T04:00:00.000Z");
    expect(parseApiDate("2026-11-13T12:00:00+08:00").toISOString()).toBe("2026-11-13T04:00:00.000Z");
  });
});

describe("timeAgo", () => {
  it.each([
    ["2026-11-13T03:59:40", "just now"],
    ["2026-11-13T03:55:00", "5 minutes ago"],
    ["2026-11-13T01:00:00", "3 hours ago"],
    ["2026-11-12T04:00:00", "yesterday"],
    ["2026-11-10T04:00:00", "3 days ago"],
  ])("%s -> %s", (value, expected) => {
    expect(timeAgo(value, NOW)).toBe(expected);
  });

  it("falls back to a date after a week", () => {
    expect(timeAgo("2026-10-01T04:00:00", NOW)).toBe(formatDate("2026-10-01T04:00:00"));
  });
});

describe("Manila time formatting", () => {
  it("shows dates and times in Philippine time", () => {
    expect(formatDate("2026-11-12T20:00:00")).toMatch(/Nov 13, 2026/);
    expect(formatDateTime("2026-11-13T04:00:00")).toMatch(/12:00\s?PM/i);
  });

  it("greets by Manila time of day", () => {
    expect(greeting(new Date("2026-11-13T00:00:00Z"))).toBe("Good morning");
    expect(greeting(new Date(NOW))).toBe("Good afternoon");
    expect(greeting(new Date("2026-11-13T12:00:00Z"))).toBe("Good evening");
  });
});
