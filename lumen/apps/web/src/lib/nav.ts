import {
  Bell,
  ChartColumn,
  ClipboardList,
  FolderTree,
  House,
  LayoutDashboard,
  Map as MapIcon,
  Megaphone,
  ScrollText,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/api/types";
import { homePathFor } from "@/lib/auth/routes";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shorter label for the mobile tab bar. */
  short?: string;
  /** Only highlight on an exact match (for the area home). */
  exact?: boolean;
};

export type NavGroup = { label?: string; items: NavItem[] };

export const roleLabel: Record<Role, string> = {
  citizen: "Resident",
  official: "Barangay Official",
  pasig_admin: "Pasig Administrator",
};

/** Citizen navigation: top bar on desktop, bottom tab bar on mobile. */
export const citizenNav: NavItem[] = [
  { href: "/app", label: "Home", icon: House, exact: true },
  { href: "/app/report", label: "Report an Issue", short: "Report", icon: Megaphone },
  { href: "/app/reports", label: "My Reports", icon: ClipboardList },
  { href: "/app/map", label: "Community Map", short: "Map", icon: MapIcon },
];

/** Staff navigation for the sidebar. Officials and admins share one shell; admins get more items. */
export function staffNav(role: "official" | "pasig_admin"): NavGroup[] {
  const base = homePathFor(role);
  const work: NavGroup = {
    items: [
      { href: base, label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: `${base}/complaints`, label: "Complaints", icon: ClipboardList },
      { href: `${base}/map`, label: "Map Monitoring", icon: MapIcon },
      { href: `${base}/notifications`, label: "Notifications", icon: Bell },
    ],
  };
  if (role === "official") return [work];
  return [
    work,
    { label: "Insights", items: [{ href: `${base}/analytics`, label: "Analytics", icon: ChartColumn }] },
    {
      label: "Administration",
      items: [
        { href: `${base}/users`, label: "Users", icon: Users },
        { href: `${base}/categories`, label: "Categories", icon: FolderTree },
        { href: `${base}/logs`, label: "Activity and Audit Logs", icon: ScrollText },
      ],
    },
  ];
}

export function navFor(role: Role): NavItem[] {
  return role === "citizen" ? citizenNav : staffNav(role).flatMap((g) => g.items);
}

export function isActive(item: Pick<NavItem, "href" | "exact">, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
