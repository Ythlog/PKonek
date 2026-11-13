import { describe, expect, it } from "vitest";
import { createSeed } from "@/lib/api/mock/seed";
import { summarize } from "./StaffHome";

describe("summarize", () => {
  const complaints = createSeed(Date.parse("2026-11-13T04:00:00Z")).complaints;

  it("counts complaints by status", () => {
    const s = summarize(complaints);
    expect(s.open + s.inProgress + s.resolved).toBe(complaints.filter((c) => c.status !== "rejected").length);
  });

  it("counts Me Too supports beyond the first report", () => {
    const expected = complaints.reduce((sum, c) => sum + c.report_count - 1, 0);
    expect(summarize(complaints).supports).toBe(expected);
  });

  it("lists active complaints with the most support first", () => {
    const top = summarize(complaints).needsAttention;
    expect(top).toHaveLength(5);
    expect(top.every((c) => c.status === "open" || c.status === "in_progress")).toBe(true);
    for (let i = 1; i < top.length; i++) expect(top[i - 1].report_count).toBeGreaterThanOrEqual(top[i].report_count);
  });
});
