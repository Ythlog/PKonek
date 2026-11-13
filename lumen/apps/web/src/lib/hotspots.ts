import type { Complaint } from "@/lib/api/types";

/**
 * Groups complaints into map grid cells for the hotspot view. Weight counts every resident
 * who reported or supported, so one report with 12 Me Too counts as more than one with none.
 */

export type Hotspot = {
  key: string;
  latitude: number;
  longitude: number;
  complaints: Complaint[];
  weight: number;
  level: HotspotLevel;
};

export type HotspotLevel = "low" | "medium" | "high";

const METERS_PER_DEG_LAT = 111_320;

export function cellKey(lat: number, lng: number, cellM: number): string {
  const dLat = cellM / METERS_PER_DEG_LAT;
  const dLng = cellM / (METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
  return `${Math.floor(lat / dLat)}:${Math.floor(lng / dLng)}`;
}

export function levelFor(weight: number, max: number): HotspotLevel {
  if (max <= 0) return "low";
  const ratio = weight / max;
  if (ratio >= 0.6) return "high";
  if (ratio >= 0.3) return "medium";
  return "low";
}

/** Active complaints only: closed ones aren't hotspots anymore. */
export function buildHotspots(items: Complaint[], cellM = 250): Hotspot[] {
  const cells = new Map<string, Complaint[]>();
  for (const c of items) {
    if (c.status !== "open" && c.status !== "in_progress") continue;
    const key = cellKey(c.latitude, c.longitude, cellM);
    cells.set(key, [...(cells.get(key) ?? []), c]);
  }
  const spots = [...cells.entries()].map(([key, list]) => {
    const weight = list.reduce((s, c) => s + c.report_count, 0);
    return {
      key,
      // Weighted center so the circle sits where most residents reported.
      latitude: list.reduce((s, c) => s + c.latitude * c.report_count, 0) / weight,
      longitude: list.reduce((s, c) => s + c.longitude * c.report_count, 0) / weight,
      complaints: [...list].sort((a, b) => b.report_count - a.report_count),
      weight,
    };
  });
  const max = Math.max(0, ...spots.map((s) => s.weight));
  return spots.map((s) => ({ ...s, level: levelFor(s.weight, max) })).sort((a, b) => b.weight - a.weight);
}
