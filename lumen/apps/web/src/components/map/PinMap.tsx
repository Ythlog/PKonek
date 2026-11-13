"use client";

import dynamic from "next/dynamic";
import type { Pin } from "@/lib/api/types";
import { Skeleton } from "@/components/ui/Skeleton";

export type NearbyMarker = Pin & { id: number; title: string };

export type PinMapProps = {
  value: Pin | null;
  onChange: (pin: Pin) => void;
  /** Existing reports to show around the pin (duplicate candidates). */
  nearby?: NearbyMarker[];
  /** Increment to fly the map to the current pin. */
  focusKey?: number;
  /** Receives a function that returns the map center, for "pin the center" with the keyboard. */
  registerCenterPin?: (fn: () => Pin) => void;
  label: string;
};

// Leaflet touches `window`, so it only loads in the browser.
const PinMapCanvas = dynamic(() => import("./PinMapCanvas"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

export function PinMap(props: PinMapProps) {
  return <PinMapCanvas {...props} />;
}
