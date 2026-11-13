import { describe, expect, it } from "vitest";
import { parseUseMocks } from "./env";

describe("parseUseMocks", () => {
  it("defaults to mock mode when the variable is missing", () => {
    expect(parseUseMocks(undefined)).toBe(true);
    expect(parseUseMocks("")).toBe(true);
  });

  it("turns mock mode off only for an explicit false value", () => {
    expect(parseUseMocks("false")).toBe(false);
    expect(parseUseMocks("FALSE")).toBe(false);
    expect(parseUseMocks("0")).toBe(false);
    expect(parseUseMocks("true")).toBe(true);
  });
});
