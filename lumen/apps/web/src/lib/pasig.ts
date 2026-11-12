/**
 * The 30 barangays of Pasig City with approximate center points.
 * Centers are for map defaults and demo data only, not official boundaries.
 */
export const PASIG_BARANGAYS = [
  { name: "Bagong Ilog", lat: 14.5665, lng: 121.07 },
  { name: "Bagong Katipunan", lat: 14.561, lng: 121.076 },
  { name: "Bambang", lat: 14.556, lng: 121.079 },
  { name: "Buting", lat: 14.5545, lng: 121.0705 },
  { name: "Caniogan", lat: 14.572, lng: 121.079 },
  { name: "Dela Paz", lat: 14.611, lng: 121.096 },
  { name: "Kalawaan", lat: 14.5525, lng: 121.084 },
  { name: "Kapasigan", lat: 14.5605, lng: 121.0805 },
  { name: "Kapitolyo", lat: 14.573, lng: 121.061 },
  { name: "Malinao", lat: 14.5625, lng: 121.08 },
  { name: "Manggahan", lat: 14.601, lng: 121.0935 },
  { name: "Maybunga", lat: 14.577, lng: 121.088 },
  { name: "Oranbo", lat: 14.569, lng: 121.066 },
  { name: "Palatiw", lat: 14.564, lng: 121.093 },
  { name: "Pinagbuhatan", lat: 14.5555, lng: 121.0965 },
  { name: "Pineda", lat: 14.564, lng: 121.072 },
  { name: "Rosario", lat: 14.5895, lng: 121.0905 },
  { name: "Sagad", lat: 14.563, lng: 121.0855 },
  { name: "San Antonio", lat: 14.582, lng: 121.0615 },
  { name: "San Joaquin", lat: 14.5555, lng: 121.089 },
  { name: "San Jose", lat: 14.5605, lng: 121.085 },
  { name: "San Miguel", lat: 14.5595, lng: 121.083 },
  { name: "San Nicolas", lat: 14.564, lng: 121.082 },
  { name: "Santa Cruz", lat: 14.566, lng: 121.079 },
  { name: "Santa Lucia", lat: 14.58, lng: 121.098 },
  { name: "Santa Rosa", lat: 14.56, lng: 121.0795 },
  { name: "Santo Tomas", lat: 14.565, lng: 121.08 },
  { name: "Santolan", lat: 14.612, lng: 121.088 },
  { name: "Sumilang", lat: 14.568, lng: 121.0805 },
  { name: "Ugong", lat: 14.5845, lng: 121.076 },
] as const;

export type BarangayName = (typeof PASIG_BARANGAYS)[number]["name"];

export const BARANGAY_NAMES: string[] = PASIG_BARANGAYS.map((b) => b.name);

/** Pasig City Hall area, used as the default map center. */
export const PASIG_CENTER = { lat: 14.5764, lng: 121.0851 } as const;
