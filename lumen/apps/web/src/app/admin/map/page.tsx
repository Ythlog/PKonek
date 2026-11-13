import type { Metadata } from "next";
import { MapMonitoring } from "@/components/map/MapMonitoring";

export const metadata: Metadata = { title: "Map monitoring" };

export default function AdminMapPage() {
  return <MapMonitoring role="pasig_admin" />;
}
