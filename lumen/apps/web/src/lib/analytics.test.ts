import { describe, expect, it } from "vitest";
import { createSeed } from "@/lib/api/mock/seed";
import {
  byBarangay,
  byCategory,
  countByStatus,
  dailyTrend,
  formatDuration,
  median,
  percent,
  resolutionHours,
  summarizeComplaints,
} from "./analytics";
import { buildHotspots, levelFor } from "./hotspots";

const NOW = Date.parse("2026-11-13T04:00:00Z");
const seed = createSeed(NOW);
const items = seed.complaints;
const categories = new Map(seed.categories.map((c) => [c.id, c]));

describe("analytics", () => {
  it("counts every complaint once by status", () => {
    expect(countByStatus(items).reduce((s, r) => s + r.count, 0)).toBe(items.length);
  });

  it("groups by category and barangay with resolution rates", () => {
    const cats = byCategory(items, categories);
    expect(cats.reduce((s, r) => s + r.total, 0)).toBe(items.length);
    expect(cats[0].total).toBeGreaterThanOrEqual(cats[1].total);
    const flooding = cats.find((c) => c.label === "Flooding and Drainage")!;
    expect(flooding.resolutionRate).toBeCloseTo(flooding.resolved / flooding.total);
    const kapitolyo = byBarangay(items).find((b) => b.key === "Kapitolyo")!;
    expect(kapitolyo.total).toBe(items.filter((c) => c.barangay === "Kapitolyo").length);
  });

  it("measures resolution time from report to fix", () => {
    const hours = resolutionHours(items);
    expect(hours).toHaveLength(items.filter((c) => c.status === "resolved").length);
    expect(Math.min(...hours)).toBeGreaterThan(0);
    expect(median([1, 3, 10])).toBe(3);
    expect(median([1, 3])).toBe(2);
    expect(median([])).toBeNull();
  });

  it("builds a daily trend in Manila days", () => {
    const trend = dailyTrend(items, 30, NOW);
    expect(trend).toHaveLength(30);
    expect(trend[29].date).toBe("2026-11-13");
    const inWindow = items.filter((c) => Date.parse(`${c.created_at}Z`) > NOW - 29.5 * 86_400_000).length;
    expect(trend.reduce((s, d) => s + d.reported, 0)).toBeGreaterThanOrEqual(inWindow - 1);
  });

  it("summarizes and formats", () => {
    const s = summarizeComplaints(items);
    expect(s.active + s.resolved + s.rejected).toBe(s.total);
    expect(formatDuration(5)).toBe("5h");
    expect(formatDuration(36)).toBe("1.5 days");
    expect(formatDuration(48)).toBe("2 days");
    expect(formatDuration(null)).toBe("—");
    expect(percent(0.456)).toBe("46%");
  });
});

describe("hotspots", () => {
  it("clusters active complaints and ranks by resident weight", () => {
    const spots = buildHotspots(items);
    const active = items.filter((c) => c.status === "open" || c.status === "in_progress");
    expect(spots.reduce((s, h) => s + h.complaints.length, 0)).toBe(active.length);
    expect(spots[0].level).toBe("high");
    expect(spots[0].weight).toBe(Math.max(...spots.map((s) => s.weight)));
  });

  it("merges reports that are close together", () => {
    const a = { ...items[0], id: 900, status: "open" as const, report_count: 2 };
    const b = { ...a, id: 901, latitude: a.latitude + 0.0002, report_count: 3 };
    const spots = buildHotspots([a, b]);
    expect(spots).toHaveLength(1);
    expect(spots[0].weight).toBe(5);
  });

  it("scales levels against the busiest cell", () => {
    expect(levelFor(10, 10)).toBe("high");
    expect(levelFor(4, 10)).toBe("medium");
    expect(levelFor(1, 10)).toBe("low");
  });
});
