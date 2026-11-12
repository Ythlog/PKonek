import { PASIG_BOUNDS } from "@/lib/api/types";
import { PASIG_CENTER } from "@/lib/pasig";

/** CARTO Voyager: a calm basemap that lets status colors stand out. */
export const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const MAP_CENTER: [number, number] = [PASIG_CENTER.lat, PASIG_CENTER.lng];
export const DEFAULT_ZOOM = 14;
export const PIN_ZOOM = 17;

/** Panning stops a little outside Pasig; pins outside the bounds are rejected separately. */
export const MAX_BOUNDS: [[number, number], [number, number]] = [
  [PASIG_BOUNDS.minLat - 0.02, PASIG_BOUNDS.minLng - 0.02],
  [PASIG_BOUNDS.maxLat + 0.02, PASIG_BOUNDS.maxLng + 0.02],
];
