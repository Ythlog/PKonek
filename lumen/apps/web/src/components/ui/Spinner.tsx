import { cn } from "@/lib/cn";

type SpinnerProps = {
  /** Announced to screen readers. Omit when the spinner sits inside a labelled button. */
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = { sm: "size-4", md: "size-5", lg: "size-8" } as const;

export function Spinner({ label, size = "md", className }: SpinnerProps) {
  const svg = (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      className={cn("animate-spin motion-reduce:animate-none", sizes[size], className)}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
  if (!label) return svg;
  return (
    <span role="status" className="inline-flex items-center gap-2">
      {svg}
      <span className="sr-only">{label}</span>
    </span>
  );
}
