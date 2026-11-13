"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HandHeart, LocateFixed, MapPin } from "lucide-react";
import { CategoryIcon } from "@/components/complaints/CategoryIcon";
import { PageHeader } from "@/components/shell/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { errorMessage } from "@/lib/api/errors";
import type { Complaint, ComplaintStatus, Pin } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";
import { useCategories, useCategoryMap, useComplaints, useMapPoints } from "@/lib/queries";
import { isInsidePasig } from "@/lib/report";
import { ComplaintMap, type MapFocus } from "./ComplaintMap";
import { MapLegend } from "./MapLegend";
import { MeTooModal } from "./MeTooModal";

const ACTIVE: ComplaintStatus[] = ["open", "in_progress"];

function distanceM(a: Pin, b: Pin) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

function formatDistance(m: number) {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

export function CommunityMap() {
  const categoryList = useCategories();
  const categories = useCategoryMap();
  const [category, setCategory] = useState<number | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [me, setMe] = useState<Pin | null>(null);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [meToo, setMeToo] = useState<Complaint | null>(null);

  const points = useMapPoints({ status: showClosed ? undefined : ACTIVE, category_id: category ? [category] : undefined });
  const mine = useComplaints({ mine: true, page_size: 100 });
  const mineIds = useMemo(() => new Set((mine.data?.items ?? []).map((c) => c.id)), [mine.data]);

  const sorted = useMemo(() => {
    const list = [...(points.data ?? [])];
    return me
      ? list.sort((a, b) => distanceM(me, a) - distanceM(me, b))
      : list.sort((a, b) => b.report_count - a.report_count || b.created_at.localeCompare(a.created_at));
  }, [points.data, me]);

  function select(c: Complaint) {
    setSelectedId(c.id);
    setFocus((prev) => ({ latitude: c.latitude, longitude: c.longitude, key: (prev?.key ?? 0) + 1 }));
  }

  function locate() {
    setLocateError(null);
    if (!("geolocation" in navigator)) return setLocateError("Your browser can't share your location.");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pin = { latitude: p.coords.latitude, longitude: p.coords.longitude };
        if (!isInsidePasig(pin)) return setLocateError("You seem to be outside Pasig City, so the list stays sorted by Me Too.");
        setMe(pin);
        setFocus((prev) => ({ ...pin, zoom: 16, key: (prev?.key ?? 0) + 1 }));
      },
      () => setLocateError("Location access is blocked. Allow it in your browser to sort by distance."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function action(c: Complaint, size: "sm" | "md" = "sm") {
    if (mineIds.has(c.id)) return <span className="text-sm font-semibold text-muted">You reported this</span>;
    if (!ACTIVE.includes(c.status)) return <span className="text-sm text-muted">Closed reports can&rsquo;t get Me Too</span>;
    return (
      <Button variant="accent" size={size} leadingIcon={<HandHeart aria-hidden size={16} strokeWidth={1.75} />} onClick={() => setMeToo(c)} aria-label={`Me Too on ${c.reference_no}: ${c.title}`}>
        Me Too
      </Button>
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Community map"
        description="See what your neighbors reported. If you've seen the same problem, add your Me Too instead of a new report."
        actions={
          <Button variant="secondary" leadingIcon={<LocateFixed aria-hidden size={18} strokeWidth={1.75} />} onClick={locate}>
            Near me
          </Button>
        }
      />
      {locateError && <Alert tone="warning" title={locateError} onDismiss={() => setLocateError(null)} />}

      <div className="flex flex-wrap items-center gap-4">
        <div className="w-full sm:w-64">
          <label htmlFor="map-category" className="sr-only">
            Category
          </label>
          <Select id="map-category" value={category ?? ""} onChange={(e) => setCategory(e.target.value ? Number(e.target.value) : null)}>
            <option value="">All categories</option>
            {(categoryList.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <Checkbox label="Show resolved and closed reports" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
      </div>

      {points.isError && <Alert tone="danger" title="The map couldn't load reports">{errorMessage(points.error)}</Alert>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-3">
          <div className="relative h-96 overflow-hidden rounded-card border border-border bg-cream shadow-card sm:h-128">
            <ComplaintMap
              points={sorted}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id)}
              focus={focus}
              me={me}
              label="Map of reports in Pasig City"
              renderPopup={(c) => (
                <div className="grid gap-2 font-sans">
                  <StatusBadge status={c.status} size="sm" className="w-fit" />
                  <p className="font-semibold leading-snug text-ink">{c.title}</p>
                  <p className="text-xs text-muted">
                    {c.report_count} {c.report_count === 1 ? "report" : "reports"} · {timeAgo(c.created_at)}
                  </p>
                  <div className="flex items-center gap-3">
                    {action(c)}
                    <Link href={`/app/reports/${c.id}`} className="text-sm font-semibold text-brand-600">
                      Details
                    </Link>
                  </div>
                </div>
              )}
            />
          </div>
          <MapLegend mode="pins" />
        </div>

        <Card padding="none" className="flex max-h-128 flex-col overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-lg">{me ? "Closest to You" : "Most Reported"}</h2>
            <p className="text-sm text-muted" aria-live="polite">
              {points.data ? `${points.data.length} ${points.data.length === 1 ? "report" : "reports"} on the map` : "Loading…"}
            </p>
          </div>
          {points.isPending && (
            <div aria-busy="true" className="grid gap-3 p-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}
          {points.data && sorted.length === 0 && <EmptyState icon={<MapPin size={24} strokeWidth={1.75} />} title="Nothing reported here" description="Try another category, or include closed reports." />}
          {sorted.length > 0 && (
            <ul aria-label="Reports on the map" className="flex-1 divide-y divide-border overflow-y-auto">
              {sorted.map((c) => (
                <li key={c.id} className={cn(selectedId === c.id && "bg-brand-50")}>
                  <button type="button" onClick={() => select(c)} aria-pressed={selectedId === c.id} className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-page">
                    <span aria-hidden className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600">
                      <CategoryIcon code={categories.get(c.category_id)?.code} size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-snug text-ink">{c.title}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                        <StatusBadge status={c.status} size="sm" />
                        <span className="tabular">{c.report_count} reports</span>
                        {me && <span className="tabular">{formatDistance(distanceM(me, c))}</span>}
                        {!me && c.barangay && <span>{c.barangay}</span>}
                      </span>
                    </span>
                  </button>
                  {selectedId === c.id && (
                    <div className="flex flex-wrap items-center gap-3 px-4 pb-4 pl-15">
                      {action(c)}
                      <Link href={`/app/reports/${c.id}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>
                        Details
                      </Link>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {meToo && <MeTooModal complaint={meToo} onClose={() => setMeToo(null)} />}
    </div>
  );
}
