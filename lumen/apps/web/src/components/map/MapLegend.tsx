import { cn } from "@/lib/cn";

const statusItems = [
  { label: "Open", dot: "bg-status-open" },
  { label: "In progress", dot: "bg-status-in-progress" },
  { label: "Resolved", dot: "bg-status-resolved" },
  { label: "Rejected", dot: "bg-status-rejected" },
];

const hotspotItems = [
  { label: "Few residents", dot: "bg-brand-600" },
  { label: "Growing", dot: "bg-accent" },
  { label: "Hotspot", dot: "bg-danger" },
];

/** Explains marker colors. Rendered outside the map so screen readers can find it. */
export function MapLegend({ mode, className }: { mode: "pins" | "hotspots"; className?: string }) {
  const items = mode === "pins" ? statusItems : hotspotItems;
  return (
    <div className={cn("rounded-card border border-border bg-surface p-3 text-sm shadow-card", className)}>
      <p className="font-semibold text-ink">{mode === "pins" ? "Status" : "Residents affected"}</p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-2 text-muted">
            <span aria-hidden className={cn("size-3 rounded-full ring-2 ring-white", i.dot)} />
            {i.label}
          </li>
        ))}
      </ul>
      {mode === "pins" && <p className="mt-2 text-xs text-muted">Bigger pins have more Me Too.</p>}
      {mode === "hotspots" && <p className="mt-2 text-xs text-muted">Open and in-progress reports within about 250 m are grouped.</p>}
    </div>
  );
}
