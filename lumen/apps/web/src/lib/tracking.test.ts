import { describe, expect, it } from "vitest";
import type { Complaint, Verification } from "@/lib/api/types";
import { displayStatus, groupFor, idFromReference, progressSteps } from "./tracking";

const base: Complaint = {
  id: 2,
  reference_no: "PSG-2026-000002",
  category_id: 4,
  title: "Streetlights out",
  description: "Dark",
  status: "resolved",
  latitude: 14.57,
  longitude: 121.06,
  address_text: null,
  barangay: "Kapitolyo",
  photo_url: null,
  report_count: 4,
  created_at: "2026-11-01T00:00:00",
  updated_at: "2026-11-04T00:00:00",
  resolved_at: "2026-11-04T00:00:00",
};
const v = (verdict: Verification["verdict"], created_at: string): Verification => ({ id: 1, complaint_id: 2, citizen_id: 5, verdict, note: null, created_at });

describe("displayStatus", () => {
  it("asks the resident to confirm a fresh fix", () => {
    expect(displayStatus(base, [])).toBe("pending_verification");
    expect(displayStatus(base, [v("confirmed", "2026-11-05T00:00:00")])).toBe("resolved");
  });

  it("asks again when an older confirmation predates a new fix", () => {
    expect(displayStatus(base, [v("confirmed", "2026-11-02T00:00:00")])).toBe("pending_verification");
  });

  it("shows reopened reports", () => {
    expect(displayStatus({ ...base, status: "open", resolved_at: null }, [v("rejected", "2026-11-05T00:00:00")])).toBe("reopened");
  });

  it("falls back to the backend status when verification is off", () => {
    expect(displayStatus(base, [], false)).toBe("resolved");
  });

  it("groups reports for the tabs", () => {
    expect(groupFor("pending_verification")).toBe("needs_you");
    expect(groupFor("reopened")).toBe("active");
    expect(groupFor("rejected")).toBe("closed");
  });
});

describe("progressSteps", () => {
  const states = (s: Parameters<typeof progressSteps>[0]) => progressSteps(s).map((p) => p.state);
  it("marks where the report is", () => {
    expect(states("open")).toEqual(["current", "upcoming", "upcoming", "upcoming"]);
    expect(states("in_progress")).toEqual(["done", "current", "upcoming", "upcoming"]);
    expect(states("pending_verification")).toEqual(["done", "done", "current", "upcoming"]);
    expect(states("resolved")).toEqual(["done", "done", "done", "done"]);
    expect(progressSteps("reopened")[0].label).toBe("Reopened");
  });
});

describe("idFromReference", () => {
  it("reads the id from a reference number", () => {
    expect(idFromReference("PSG-2026-000123")).toBe(123);
    expect(idFromReference("  psg-2026-000007 ")).toBe(7);
    expect(idFromReference("PSG 2026 000007")).toBeNull();
    expect(idFromReference("PSG-2026-000000")).toBeNull();
    expect(idFromReference("123")).toBeNull();
  });
});
