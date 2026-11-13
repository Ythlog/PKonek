"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Flame, MapPin } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge, statusLabel } from "@/components/ui/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { errorMessage } from "@/lib/api/errors";
import { COMPLAINT_STATUSES, type ComplaintStatus } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { homePathFor } from "@/lib/auth/routes";
import { cn } from "@/lib/cn";
import { statusTokens } from "@/lib/design-tokens";
import { buildHotspots, type Hotspot } from "@/lib/hotspots";
import { BARANGAY_NAMES } from "@/lib/pasig";
import { useCategories, useMapPoints } from "@/lib/queries";
import { ComplaintMap, type MapFocus } from "./ComplaintMap";
import { MapLegend } from "./MapLegend";

const dots = Object.fromEntries(statusTokens.map((s) => [s.status, s.dot]));
const levelBadge = { high: "bg-danger-bg text-danger", medium: "bg-accent/25 text-ink", low: "bg-brand-50 text-brand-700" } as const;
const levelLabel = { high: "Hotspot", medium: "Growing", low: "Few residents" } as const;

/** Staff map: hotspots (density of active reports) or every pin, with the same filters as the list. */
export function MapMonitoring({ role }: { role: "official" | "pasig_admin" }) {
  const { user } = useAuth();
  const base = homePathFor(role);
  const categories = useCategories();
  const [mode, setMode] = useState<"hotspots" | "pins">("hotspots");
  // null = not chosen yet: officials start on their own barangay once the user has loaded.
  const [chosenBarangay, setBarangay] = useState<string | null>(null);
  const barangay = chosenBarangay ?? (role === "official" ? (user?.barangay ?? "") : "");
  const [category, setCategory] = useState<number | null>(null);
  const [status, setStatus] = useState<ComplaintStatus[]>(["open", "in_progress"]);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);

  const points = useMapPoints({
    barangay: barangay || undefined,
    category_id: category ? [category] : undefined,
    status: mode === "pins" && status.length ? status : mode === "hotspots" ? ["open", "in_progress"] : undefined,
  });
  const hotspots = useMemo(() => buildHotspots(points.data ?? []), [points.data]);

  function focusSpot(h: Hotspot) {
    setSelectedSpot(h.key);
    setFocus((prev) => ({ latitude: h.latitude, longitude: h.longitude, zoom: 17, key: (prev?.key ?? 0) + 1 }));
  }

  const filters = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-full sm:w-48">
        <label htmlFor="mon-barangay" className="sr-only">Barangay</label>
        <Select id="mon-barangay" value={barangay} onChange={(e) => setBarangay(e.target.value)}>
          <option value="">All barangays</option>
          {BARANGAY_NAMES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-full sm:w-56">
        <label htmlFor="mon-category" className="sr-only">Category</label>
        <Select id="mon-category" value={category ?? ""} onChange={(e) => setCategory(e.target.value ? Number(e.target.value) : null)}>
          <option value="">All categories</option>
          {(categories.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      {mode === "pins" && (
        <div role="group" aria-label="Status" className="flex flex-wrap gap-2">
          {COMPLAINT_STATUSES.map((s) => {
            const on = status.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => setStatus(on ? status.filter((x) => x !== s) : [...status, s])}
                className={cn(
                  "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors",
                  on ? "border-brand-600 bg-brand-50 text-brand-700" : "border-border bg-surface text-muted hover:text-ink",
                )}
              >
                <span aria-hidden className={cn("size-2 rounded-full", dots[s])} />
                {statusLabel(s)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const map = (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid gap-3">
        <div className="relative h-96 overflow-hidden rounded-card border border-border bg-cream shadow-card sm:h-128">
          <ComplaintMap
            hotspots={mode === "hotspots" ? hotspots : []}
            points={mode === "pins" ? (points.data ?? []) : []}
            onSelectHotspot={focusSpot}
            focus={focus}
            label={mode === "hotspots" ? "Hotspot map of active complaints" : "Map of complaints"}
            renderPopup={(c) => (
              <div className="grid gap-2 font-sans">
                <StatusBadge status={c.status} size="sm" className="w-fit" />
                <p className="font-semibold leading-snug text-ink">{c.title}</p>
                <p className="text-xs text-muted">
                  {c.reference_no} · {c.report_count} reports
                </p>
                <Link href={`${base}/complaints?selected=${c.id}`} className="text-sm font-semibold text-brand-600">
                  Open Complaint
                </Link>
              </div>
            )}
          />
        </div>
        <MapLegend mode={mode} />
      </div>

      <Card padding="none" className="flex max-h-128 flex-col overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-lg">{mode === "hotspots" ? "Top Hotspots" : "Complaints on the Map"}</h2>
          <p className="text-sm text-muted" aria-live="polite">
            {points.data
              ? mode === "hotspots"
                ? `${hotspots.length} ${hotspots.length === 1 ? "area" : "areas"} with active reports`
                : `${points.data.length} complaints`
              : "Loading…"}
          </p>
        </div>
        {points.isPending && (
          <div aria-busy="true" className="grid gap-3 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}
        {points.data && (mode === "hotspots" ? hotspots.length === 0 : points.data.length === 0) && (
          <EmptyState icon={<MapPin size={24} strokeWidth={1.75} />} title="Nothing to show" description="No complaints match these filters." />
        )}
        {mode === "hotspots" && hotspots.length > 0 && (
          <ol aria-label="Hotspots ranked by residents affected" className="flex-1 divide-y divide-border overflow-y-auto">
            {hotspots.slice(0, 15).map((h, i) => (
              <li key={h.key}>
                <button
                  type="button"
                  onClick={() => focusSpot(h)}
                  aria-pressed={selectedSpot === h.key}
                  className={cn("flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-page", selectedSpot === h.key && "bg-brand-50")}
                >
                  <span className="mt-0.5 w-6 shrink-0 text-sm font-bold text-muted tabular">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold leading-snug text-ink">{h.complaints[0].title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className={cn("rounded-full px-2 py-0.5 font-semibold", levelBadge[h.level])}>{levelLabel[h.level]}</span>
                      <span className="tabular">{h.weight} residents</span>
                      <span className="tabular">
                        {h.complaints.length} {h.complaints.length === 1 ? "report" : "reports"}
                      </span>
                      {h.complaints[0].barangay && <span>{h.complaints[0].barangay}</span>}
                    </span>
                  </span>
                </button>
                {selectedSpot === h.key && (
                  <ul className="grid gap-1 px-4 pb-4 pl-13">
                    {h.complaints.map((c) => (
                      <li key={c.id}>
                        <Link href={`${base}/complaints?selected=${c.id}`} className="flex items-center gap-2 rounded-chip py-1 text-sm text-brand-600 hover:text-brand-700">
                          <span className="font-mono text-xs tabular">{c.reference_no}</span>
                          <span className="truncate">{c.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
        {mode === "pins" && points.data && points.data.length > 0 && (
          <ul aria-label="Complaints on the map" className="flex-1 divide-y divide-border overflow-y-auto">
            {[...points.data]
              .sort((a, b) => b.report_count - a.report_count)
              .map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setFocus((prev) => ({ latitude: c.latitude, longitude: c.longitude, key: (prev?.key ?? 0) + 1 }))}
                    className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-page"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-snug text-ink">{c.title}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <StatusBadge status={c.status} size="sm" />
                        <span className="tabular">{c.report_count} reports</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        )}
      </Card>
    </div>
  );

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={barangay ? `Barangay ${barangay}` : "All of Pasig City"}
        title="Map monitoring"
        description="Find where reports cluster, so crews go where the most residents are affected."
      />
      {filters}
      {points.isError && <Alert tone="danger" title="The map couldn't load complaints">{errorMessage(points.error)}</Alert>}
      <Tabs
        label="Map view"
        value={mode}
        onValueChange={(id) => setMode(id as "hotspots" | "pins")}
        items={[
          { id: "hotspots", label: (<span className="inline-flex items-center gap-1.5"><Flame aria-hidden size={16} strokeWidth={1.75} /> Hotspots</span>), content: map },
          { id: "pins", label: (<span className="inline-flex items-center gap-1.5"><MapPin aria-hidden size={16} strokeWidth={1.75} /> All pins</span>), content: map },
        ]}
      />
    </div>
  );
}
