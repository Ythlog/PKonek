import { cn } from "@/lib/cn";

/** Loading placeholder. Pair the loading region with a Spinner label or aria-busy for screen readers. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-chip bg-cream", className)} />;
}
