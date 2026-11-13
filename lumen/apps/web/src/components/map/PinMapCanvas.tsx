"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { Pin } from "@/lib/api/types";
import { DEFAULT_ZOOM, MAP_CENTER, MAX_BOUNDS, PIN_ZOOM, TILE_ATTRIBUTION, TILE_URL } from "./config";
import type { PinMapProps } from "./PinMap";

/** Brand-colored pin drawn with HTML, so no image assets are needed. */
const pinIcon = L.divIcon({
  className: "",
  html: '<span class="block size-9 -translate-y-1 rounded-full rounded-br-none rotate-45 border-3 border-white bg-brand-600 shadow-popover"><span class="m-auto mt-2.5 block size-2.5 rounded-full bg-accent"></span></span>',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

const nearbyIcon = L.divIcon({
  className: "",
  html: '<span class="flex size-6 items-center justify-center rounded-full border-2 border-white bg-accent shadow-card"><span class="size-2 rounded-full bg-ink"></span></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function ClickToPin({ onChange }: { onChange: (pin: Pin) => void }) {
  useMapEvents({
    click(event) {
      onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

/** Follows the pin when it is set from outside the map ("Use my location"). */
function FlyToPin({ pin, focusKey }: { pin: Pin | null; focusKey: number }) {
  const map = useMap();
  useEffect(() => {
    if (pin && focusKey > 0) map.flyTo([pin.latitude, pin.longitude], Math.max(map.getZoom(), PIN_ZOOM), { duration: 0.6 });
    // Only react to explicit focus requests, not every drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);
  return null;
}

/** Exposes "drop the pin at the map center" for keyboard users. */
function CenterPinBridge({ register }: { register?: (fn: () => Pin) => void }) {
  const map = useMap();
  useEffect(() => {
    register?.(() => {
      const c = map.getCenter();
      return { latitude: c.lat, longitude: c.lng };
    });
  }, [map, register]);
  return null;
}

export default function PinMapCanvas({ value, onChange, nearby = [], focusKey = 0, registerCenterPin, label }: PinMapProps) {
  const center = useMemo<[number, number]>(() => (value ? [value.latitude, value.longitude] : MAP_CENTER), [value]);

  return (
    <MapContainer
      center={center}
      zoom={value ? PIN_ZOOM : DEFAULT_ZOOM}
      minZoom={12}
      maxBounds={MAX_BOUNDS}
      maxBoundsViscosity={0.8}
      scrollWheelZoom={false}
      className="size-full"
      attributionControl
      aria-label={label}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <ClickToPin onChange={onChange} />
      <FlyToPin pin={value} focusKey={focusKey} />
      <CenterPinBridge register={registerCenterPin} />
      {nearby.map((n) => (
        <Marker key={n.id} position={[n.latitude, n.longitude]} icon={nearbyIcon} keyboard={false}>
          <Tooltip direction="top" offset={[0, -10]}>
            {n.title}
          </Tooltip>
        </Marker>
      ))}
      {value && (
        <Marker
          position={[value.latitude, value.longitude]}
          icon={pinIcon}
          draggable
          title="Your pin. Drag to adjust."
          eventHandlers={{
            dragend(event) {
              const ll = (event.target as L.Marker).getLatLng();
              onChange({ latitude: ll.lat, longitude: ll.lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
