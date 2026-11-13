"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Complaint } from "@/lib/api/types";
import type { Hotspot } from "@/lib/hotspots";

export type MapFocus = { latitude: number; longitude: number; zoom?: number; key: number };

export type ComplaintMapProps = {
  /** Pins mode: one marker per complaint. */
  points?: Complaint[];
  /** Hotspot mode: one circle per grid cell. */
  hotspots?: Hotspot[];
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  /** Popup body for a selected complaint. */
  renderPopup?: (complaint: Complaint) => ReactNode;
  onSelectHotspot?: (hotspot: Hotspot) => void;
  focus?: MapFocus | null;
  /** The resident's own position, when they shared it. */
  me?: { latitude: number; longitude: number } | null;
  label: string;
};

// Leaflet needs `window`, so the map only loads in the browser.
const Canvas = dynamic(() => import("./ComplaintMapCanvas"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

export function ComplaintMap(props: ComplaintMapProps) {
  return <Canvas {...props} />;
}
