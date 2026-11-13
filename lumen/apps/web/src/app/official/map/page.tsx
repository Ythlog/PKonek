import type { Metadata } from "next";
import { MapMonitoring } from "@/components/map/MapMonitoring";

export const metadata: Metadata = { title: "Map monitoring" };

export default function OfficialMapPage() {
  return <MapMonitoring role="official" />;
}
