"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { ComplaintStatus } from "@/lib/api/types";
import type { HotspotLevel } from "@/lib/hotspots";
import type { ComplaintMapProps, MapFocus } from "./ComplaintMap";
import { BASEMAP, DEFAULT_ZOOM, MAP_CENTER, MAX_BOUNDS, MAX_ZOOM } from "./config";

/** Token classes on SVG paths; CSS wins over Leaflet's presentation attributes. */
const statusClass: Record<ComplaintStatus, string> = {
  open: "fill-status-open stroke-white",
  in_progress: "fill-status-in-progress stroke-white",
  resolved: "fill-status-resolved stroke-white",
  rejected: "fill-status-rejected stroke-white",
};

const hotspotClass: Record<HotspotLevel, string> = {
  low: "fill-brand-600 stroke-brand-600",
  medium: "fill-accent stroke-accent",
  high: "fill-danger stroke-danger",
};

function FocusOn({ focus }: { focus?: MapFocus | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo([focus.latitude, focus.longitude], focus.zoom ?? 17, { duration: 0.6 });
    // React to explicit focus requests only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key]);
  return null;
}

export default function ComplaintMapCanvas({ points = [], hotspots = [], selectedId, onSelect, renderPopup, onSelectHotspot, focus, me, label }: ComplaintMapProps) {
  return (
    <MapContainer center={MAP_CENTER} zoom={DEFAULT_ZOOM} minZoom={12}
      maxZoom={MAX_ZOOM} maxBounds={MAX_BOUNDS} maxBoundsViscosity={0.8} scrollWheelZoom className="size-full" aria-label={label}>
      <TileLayer url={BASEMAP.url} attribution={BASEMAP.attribution} maxNativeZoom={BASEMAP.maxNativeZoom} maxZoom={MAX_ZOOM} />
      <FocusOn focus={focus} />

      {hotspots.map((h) => (
        <Circle
          key={h.key}
          center={[h.latitude, h.longitude]}
          radius={Math.min(90 + h.weight * 12, 420)}
          pathOptions={{ className: hotspotClass[h.level], fillOpacity: 0.35, weight: 2 }}
          eventHandlers={{ click: () => onSelectHotspot?.(h) }}
        >
          <Tooltip direction="top">
            {h.complaints.length} {h.complaints.length === 1 ? "report" : "reports"} · {h.weight} residents
          </Tooltip>
        </Circle>
      ))}

      {points.map((c) => (
        <CircleMarker
          key={c.id}
          center={[c.latitude, c.longitude]}
          radius={Math.min(7 + Math.sqrt(c.report_count) * 2.2, 16)}
          pathOptions={{ className: statusClass[c.status], fillOpacity: selectedId === c.id ? 1 : 0.85, weight: selectedId === c.id ? 4 : 2 }}
          eventHandlers={{ click: () => onSelect?.(c.id) }}
        >
          {renderPopup && (
            <Popup minWidth={240} maxWidth={300}>
              {renderPopup(c)}
            </Popup>
          )}
        </CircleMarker>
      ))}

      {me && (
        <CircleMarker center={[me.latitude, me.longitude]} radius={8} pathOptions={{ className: "fill-brand-700 stroke-white", fillOpacity: 1, weight: 3 }}>
          <Tooltip permanent direction="top" offset={[0, -8]}>
            You
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
