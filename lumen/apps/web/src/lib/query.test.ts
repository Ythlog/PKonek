import { describe, expect, it } from "vitest";
import { apiErrorFromResponse, networkError } from "@/lib/api/errors";
import { shouldRetry } from "./query";

describe("shouldRetry", () => {
  it("never retries client errors", () => {
    for (const status of [400, 401, 403, 404, 409, 422, 429]) {
      expect(shouldRetry(0, apiErrorFromResponse(status, {}))).toBe(false);
    }
  });

  it("retries network and server errors twice", () => {
    expect(shouldRetry(0, networkError())).toBe(true);
    expect(shouldRetry(1, apiErrorFromResponse(503, {}))).toBe(true);
    expect(shouldRetry(2, apiErrorFromResponse(500, {}))).toBe(false);
  });
});
