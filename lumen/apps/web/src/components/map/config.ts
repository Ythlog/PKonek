import { PASIG_BOUNDS } from "@/lib/api/types";
import { PASIG_CENTER } from "@/lib/pasig";

export type Basemap = {
  provider: "carto" | "osm";
  url: string;
  attribution: string;
  /** Highest zoom the provider has real tiles for; Leaflet scales them up beyond it. */
  maxNativeZoom: number;
};

const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * CARTO Voyager is the calm, branded basemap. CARTO requires an API key: without one every
 * tile carries an "API key required" watermark. Get a free key (by e-mail, no account) at
 * https://carto.com/basemaps/apikey and set NEXT_PUBLIC_CARTO_BASEMAP_KEY.
 * Without a key we fall back to the standard OpenStreetMap tiles, which need no key.
 */
export function basemapFor(key: string | undefined): Basemap {
  const trimmed = key?.trim();
  if (trimmed) {
    return {
      provider: "carto",
      url: `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(trimmed)}`,
      attribution: `${OSM_ATTRIBUTION}, &copy; <a href="https://carto.com/attribution/">CARTO</a>`,
      maxNativeZoom: 18,
    };
  }
  return {
    provider: "osm",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: OSM_ATTRIBUTION,
    maxNativeZoom: 19,
  };
}

// Inlined by Next.js at build time, so restart `npm run dev` after changing it.
export const BASEMAP = basemapFor(process.env.NEXT_PUBLIC_CARTO_BASEMAP_KEY);

export const MAP_CENTER: [number, number] = [PASIG_CENTER.lat, PASIG_CENTER.lng];
export const DEFAULT_ZOOM = 14;
export const PIN_ZOOM = 17;
export const MAX_ZOOM = 20;

/** Panning stops a little outside Pasig; pins outside the bounds are rejected separately. */
export const MAX_BOUNDS: [[number, number], [number, number]] = [
  [PASIG_BOUNDS.minLat - 0.02, PASIG_BOUNDS.minLng - 0.02],
  [PASIG_BOUNDS.maxLat + 0.02, PASIG_BOUNDS.maxLng + 0.02],
];
