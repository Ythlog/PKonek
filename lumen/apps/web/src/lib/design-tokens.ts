/**
 * Documentation mirror of the design tokens in src/app/globals.css (@theme).
 * Components must use the Tailwind utilities (bg-brand-600, rounded-card, ...),
 * never these hex values. design-tokens.test.ts keeps this file in sync with the CSS.
 */

export type ColorToken = {
  name: string;
  value: string;
  /** Full class name so Tailwind can detect it when scanning sources. */
  swatch: string;
  /** Text color that is readable on the swatch. */
  onSwatch: string;
  usage: string;
};

export type ColorGroup = { title: string; description: string; tokens: ColorToken[] };

export const colorGroups: ColorGroup[] = [
  {
    title: "Brand",
    description: "Deep teal. Trust, civic authority, calm.",
    tokens: [
      { name: "brand-700", value: "#0F4C5C", swatch: "bg-brand-700", onSwatch: "text-white", usage: "Sidebar, logo surface, headings" },
      { name: "brand-600", value: "#136A72", swatch: "bg-brand-600", onSwatch: "text-white", usage: "Primary buttons, links, focus ring" },
      { name: "brand-50", value: "#E8F4F3", swatch: "bg-brand-50", onSwatch: "text-ink", usage: "Selected and subtle backgrounds" },
    ],
  },
  {
    title: "Surfaces",
    description: "Warm neutrals taken from the logo cream.",
    tokens: [
      { name: "cream", value: "#F3EADF", swatch: "bg-cream", onSwatch: "text-ink", usage: "Secondary surfaces, hero panels" },
      { name: "page", value: "#FAF7F2", swatch: "bg-page", onSwatch: "text-ink", usage: "Page background" },
      { name: "surface", value: "#FFFFFF", swatch: "bg-surface", onSwatch: "text-ink", usage: "Cards, inputs, menus" },
      { name: "border", value: "#E7E1D8", swatch: "bg-border", onSwatch: "text-ink", usage: "Card and input borders, dividers" },
    ],
  },
  {
    title: "Text",
    description: "Body and secondary text. Both pass WCAG AA on every surface.",
    tokens: [
      { name: "ink", value: "#1C2321", swatch: "bg-ink", onSwatch: "text-white", usage: "Body text" },
      { name: "muted", value: "#5B6461", swatch: "bg-muted", onSwatch: "text-white", usage: "Secondary text, helper text" },
    ],
  },
  {
    title: "Accent",
    description: "Marigold. Always paired with dark text. Use sparingly.",
    tokens: [
      { name: "accent", value: "#F2A93B", swatch: "bg-accent", onSwatch: "text-ink", usage: '"Me Too" and key highlights' },
    ],
  },
];

export type StatusSlug =
  | "open"
  | "in-progress"
  | "resolved"
  | "rejected"
  | "pending-verification"
  | "reopened";

export type StatusToken = {
  status: string;
  slug: StatusSlug;
  label: string;
  fg: string;
  bg: string;
  pill: string;
  dot: string;
  planned?: boolean;
};

export const statusTokens: StatusToken[] = [
  { status: "open", slug: "open", label: "Open", fg: "#1D4ED8", bg: "#DBEAFE", pill: "bg-status-open-bg text-status-open", dot: "bg-status-open" },
  { status: "in_progress", slug: "in-progress", label: "In progress", fg: "#B45309", bg: "#FEF3C7", pill: "bg-status-in-progress-bg text-status-in-progress", dot: "bg-status-in-progress" },
  { status: "resolved", slug: "resolved", label: "Resolved", fg: "#15803D", bg: "#DCFCE7", pill: "bg-status-resolved-bg text-status-resolved", dot: "bg-status-resolved" },
  { status: "rejected", slug: "rejected", label: "Rejected", fg: "#B91C1C", bg: "#FEE2E2", pill: "bg-status-rejected-bg text-status-rejected", dot: "bg-status-rejected" },
  { status: "pending_verification", slug: "pending-verification", label: "Awaiting verification", fg: "#6D28D9", bg: "#EDE9FE", pill: "bg-status-pending-verification-bg text-status-pending-verification", dot: "bg-status-pending-verification", planned: true },
  { status: "reopened", slug: "reopened", label: "Reopened", fg: "#C2410C", bg: "#FFEDD5", pill: "bg-status-reopened-bg text-status-reopened", dot: "bg-status-reopened", planned: true },
];

export const typeScale = [
  { name: "xs", px: 12, className: "text-xs", usage: "Captions, badges" },
  { name: "sm", px: 14, className: "text-sm", usage: "Helper text, table cells" },
  { name: "base", px: 16, className: "text-base", usage: "Body, inputs" },
  { name: "lg", px: 18, className: "text-lg", usage: "Lead text, card titles" },
  { name: "xl", px: 20, className: "text-xl", usage: "Section titles" },
  { name: "2xl", px: 24, className: "text-2xl", usage: "Page titles (mobile)" },
  { name: "3xl", px: 30, className: "text-3xl", usage: "Page titles" },
  { name: "4xl", px: 36, className: "text-4xl", usage: "Hero, big numbers" },
] as const;

export const radii = [
  { name: "chip", px: 8, className: "rounded-chip", usage: "Chips, tags" },
  { name: "control", px: 12, className: "rounded-control", usage: "Inputs, buttons" },
  { name: "card", px: 16, className: "rounded-card", usage: "Cards" },
  { name: "panel", px: 24, className: "rounded-panel", usage: "Login card, hero panels" },
] as const;

export const shadows = [
  { name: "card", className: "shadow-card", usage: "Resting cards (with a 1px border)" },
  { name: "card-hover", className: "shadow-card-hover", usage: "Hovered cards. No movement." },
  { name: "popover", className: "shadow-popover", usage: "Menus, popovers, modals" },
] as const;

export const spacingSteps = [
  { px: 8, className: "w-2" },
  { px: 12, className: "w-3" },
  { px: 16, className: "w-4" },
  { px: 24, className: "w-6" },
  { px: 32, className: "w-8" },
  { px: 48, className: "w-12" },
] as const;
