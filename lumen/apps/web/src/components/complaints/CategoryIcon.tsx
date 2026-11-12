import { createElement } from "react";
import type { LucideProps } from "lucide-react";
import { categoryIcon } from "./categoryIcons";

/** Icon for a category code. Picks from a fixed map, so no component is created during render. */
export function CategoryIcon({ code, ...props }: LucideProps & { code: string | undefined }) {
  return createElement(categoryIcon(code), { "aria-hidden": true, strokeWidth: 1.75, ...props });
}
