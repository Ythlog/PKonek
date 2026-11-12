import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { colorGroups, radii, shadows, statusTokens, typeScale } from "./design-tokens";

const css = fs.readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf8").toLowerCase();

function cssVar(name: string): string | undefined {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  return match?.[1].trim();
}

describe("design tokens", () => {
  it("documents every color exactly as defined in globals.css", () => {
    for (const group of colorGroups) {
      for (const token of group.tokens) {
        expect(cssVar(`color-${token.name}`), token.name).toBe(token.value.toLowerCase());
      }
    }
  });

  it("covers all four backend statuses plus the two planned ones", () => {
    expect(statusTokens.map((s) => s.status)).toEqual([
      "open",
      "in_progress",
      "resolved",
      "rejected",
      "pending_verification",
      "reopened",
    ]);
    for (const s of statusTokens) {
      expect(cssVar(`color-status-${s.slug}`)).toBe(s.fg.toLowerCase());
      expect(cssVar(`color-status-${s.slug}-bg`)).toBe(s.bg.toLowerCase());
    }
  });

  it("uses the 12-36px type scale", () => {
    expect(typeScale.map((t) => t.px)).toEqual([12, 14, 16, 18, 20, 24, 30, 36]);
    for (const t of typeScale) {
      expect(cssVar(`text-${t.name}`)).toBe(`${t.px / 16}rem`);
    }
  });

  it("defines radius and shadow tokens", () => {
    expect(radii.map((r) => r.px)).toEqual([8, 12, 16, 24]);
    for (const r of radii) expect(cssVar(`radius-${r.name}`)).toBe(`${r.px / 16}rem`);
    for (const s of shadows) expect(cssVar(`shadow-${s.name}`)).toBeDefined();
  });

  it("uses a 4px spacing grid", () => {
    expect(cssVar("spacing")).toBe("0.25rem");
  });
});
