import type { Metadata } from "next";
import { MapMonitoring } from "@/components/map/MapMonitoring";

export const metadata: Metadata = { title: "Map Monitoring" };

export default function AdminMapPage() {
  return <MapMonitoring role="pasig_admin" />;
}
