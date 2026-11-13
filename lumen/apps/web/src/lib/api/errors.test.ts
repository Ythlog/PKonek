import { describe, expect, it } from "vitest";
import { ApiError, apiErrorFromResponse, networkError } from "./errors";

describe("apiErrorFromResponse", () => {
  it("gives one message for every failed login so emails cannot be probed", () => {
    const err = apiErrorFromResponse(401, { detail: "Invalid email or password" }, { endpoint: "login" });
    expect(err).toBeInstanceOf(ApiError);
    expect(err.kind).toBe("unauthorized");
    expect(err.message).toBe("Incorrect email or password.");
  });

  it("treats a 401 elsewhere as an ended session", () => {
    expect(apiErrorFromResponse(401, { detail: "Invalid or expired token" }).message).toMatch(/session has ended/i);
  });

  it("keeps duplicate candidates from a 409", () => {
    const candidates = [
      { id: 4, reference_no: "PSG-2026-000004", title: "Clogged drain", status: "open", report_count: 3, distance_m: 21.4, created_at: "2026-11-10T03:00:00" },
    ];
    const err = apiErrorFromResponse(409, {
      detail: { message: "A similar report already exists near this location.", radius_m: 50, window_days: 7, candidates },
    });
    expect(err.kind).toBe("duplicate");
    expect(err.duplicate?.candidates).toEqual(candidates);
    expect(err.duplicate?.radius_m).toBe(50);
  });

  it("uses the backend sentence for other 409s", () => {
    const err = apiErrorFromResponse(409, { detail: "You have already reported or supported this complaint." });
    expect(err.kind).toBe("conflict");
    expect(err.message).toBe("You have already reported or supported this complaint.");
  });

  it("maps pydantic 422 errors to field errors", () => {
    const err = apiErrorFromResponse(422, {
      detail: [
        { loc: ["body", "title"], msg: "String should have at least 3 characters", type: "string_too_short" },
        { loc: ["body", "latitude"], msg: "Input should be less than or equal to 90", type: "less_than_equal" },
      ],
    });
    expect(err.kind).toBe("validation");
    expect(err.fieldErrors).toEqual({
      title: "String should have at least 3 characters",
      latitude: "Input should be less than or equal to 90",
    });
    expect(err.message).toMatch(/check the highlighted fields/i);
  });

  it("keeps a field that is itself named body", () => {
    const err = apiErrorFromResponse(422, { detail: [{ loc: ["body", "body"], msg: "Field required" }] });
    expect(err.fieldErrors).toEqual({ body: "Field required" });
  });

  it("passes plain 422 sentences through, e.g. a pin outside Pasig", () => {
    const err = apiErrorFromResponse(422, { detail: "The pinned location is outside Pasig City. Please move the pin." });
    expect(err.kind).toBe("validation");
    expect(err.message).toBe("The pinned location is outside Pasig City. Please move the pin.");
    expect(err.fieldErrors).toEqual({});
  });

  it.each([
    [403, "forbidden", /permission/i],
    [404, "not_found", /couldn't find/i],
    [429, "rate_limited", /wait a minute/i],
    [500, "server", /on our side/i],
  ] as const)("maps %i to %s", (status, kind, message) => {
    const err = apiErrorFromResponse(status, {});
    expect(err.kind).toBe(kind);
    expect(err.message).toMatch(message);
  });

  it("has a friendly network error", () => {
    const err = networkError();
    expect(err.status).toBe(0);
    expect(err.kind).toBe("network");
    expect(err.message).toMatch(/can't reach PKonek/i);
  });
});
