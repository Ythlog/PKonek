import { describe, expect, it } from "vitest";
import { colorGroups, statusTokens } from "./design-tokens";

/** WCAG 2.1 relative luminance and contrast ratio. */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const token = Object.fromEntries(colorGroups.flatMap((g) => g.tokens).map((t) => [t.name, t.value]));
const WHITE = "#FFFFFF";

/** Text/background pairs the components actually use. 4.5:1 is WCAG AA for body text. */
const pairs: Array<[string, string, string]> = [
  ["ink on page", token.ink, token.page],
  ["ink on cream", token.ink, token.cream],
  ["muted on surface", token.muted, token.surface],
  ["muted on page", token.muted, token.page],
  ["muted on cream", token.muted, token.cream],
  ["brand-700 headings on page", token["brand-700"], token.page],
  ["brand-600 links on surface", token["brand-600"], token.surface],
  ["brand-700 on brand-50 (selected nav)", token["brand-700"], token["brand-50"]],
  ["white on brand-600 (primary button)", WHITE, token["brand-600"]],
  ["white on brand-700 (sidebar)", WHITE, token["brand-700"]],
  ["brand-50 text on brand-700 (hero copy)", token["brand-50"], token["brand-700"]],
  ["accent eyebrow on brand-700", token.accent, token["brand-700"]],
  ["ink on accent (Me Too button)", token.ink, token.accent],
];

describe("color contrast (WCAG AA)", () => {
  it.each(pairs)("%s is at least 4.5:1", (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(statusTokens.map((s) => [s.label, s.fg, s.bg] as const))("status %s pill text is at least 4.5:1", (_l, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
