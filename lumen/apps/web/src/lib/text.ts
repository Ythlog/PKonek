import { Children, type ReactNode } from "react";

/**
 * Words kept lowercase inside a title (AP style), unless first or last.
 * "Report an Issue", "Map of Reports in Pasig City".
 */
const SMALL_WORDS = new Set(["a", "an", "the", "and", "but", "or", "nor", "for", "as", "at", "by", "in", "of", "on", "per", "to", "via", "vs"]);

function capitalize(word: string): string {
  // Skip leading punctuation such as "(" or a quote.
  const i = word.search(/\p{L}/u);
  if (i < 0) return word;
  return word.slice(0, i) + word[i].toLocaleUpperCase("en-PH") + word.slice(i + 1);
}

/**
 * Title Case for headings, buttons and labels. Only ever raises the first letter of a word,
 * so codes keep their casing ("PSG-2026-000123"). Write phrasal verbs explicitly ("Sign In").
 * Don't pass people's names or user-written text: "Juan dela Cruz" would become "Juan Dela Cruz".
 */
export function titleCase(text: string): string {
  const parts = text.split(/(\s+)/);
  const words = parts.filter((p) => p.trim()).length;
  let index = 0;
  let afterColon = false;
  return parts
    .map((part) => {
      if (!part.trim()) return part;
      const first = index === 0;
      const last = index === words - 1;
      index += 1;
      const forceCap = first || last || afterColon;
      afterColon = /[:—–]$/.test(part);
      if (!forceCap && SMALL_WORDS.has(part)) return part;
      // Hyphenated words: "Follow-up" -> "Follow-Up", but leave codes like "PSG-2026" alone.
      return part
        .split("-")
        .map((piece, i) => (i === 0 || /^\p{Ll}/u.test(piece) ? capitalize(piece) : piece))
        .join("-");
    })
    .join("");
}

/** Applies titleCase to the plain-text children of a component, leaving elements alone. */
export function titleCaseChildren(children: ReactNode): ReactNode {
  if (typeof children === "string") return titleCase(children);
  if (!Array.isArray(children)) return children;
  return Children.map(children, (child) => (typeof child === "string" ? titleCase(child) : child));
}
