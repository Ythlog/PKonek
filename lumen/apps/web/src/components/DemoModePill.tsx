import { FlaskConical } from "lucide-react";
import { USE_MOCKS } from "@/lib/env";
import { cn } from "@/lib/cn";

/** Tells people the screens show built-in demo data. Renders nothing when the real API is used. */
export function DemoModePill({ enabled = USE_MOCKS, className }: { enabled?: boolean; className?: string }) {
  if (!enabled) return null;
  return (
    <span
      title="This build uses built-in demo data and demo accounts. Nothing is sent to Pasig City."
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-accent/60 bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-ink",
        className,
      )}
    >
      <FlaskConical aria-hidden size={12} strokeWidth={2} />
      Demo data
    </span>
  );
}
