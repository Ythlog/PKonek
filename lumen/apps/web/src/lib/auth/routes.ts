import type { Role } from "@/lib/api/types";

/** Each role has its own area of the app. */
const HOME: Record<Role, string> = {
  citizen: "/app",
  official: "/official",
  pasig_admin: "/admin",
};

export const CITIZEN_LOGIN = "/login";
export const CITIZEN_REGISTER = "/register";
export const STAFF_LOGIN = "/staff/login";

export function homePathFor(role: Role): string {
  return HOME[role];
}

export function isStaffRole(role: Role | null | undefined): role is "official" | "pasig_admin" {
  return role === "official" || role === "pasig_admin";
}

function inArea(path: string, area: string) {
  return path === area || path.startsWith(`${area}/`) || path.startsWith(`${area}?`);
}

/** The sign-in page to send someone to when they open a protected page while signed out. */
export function loginPathFor(path: string): string {
  const staff = inArea(path, HOME.official) || inArea(path, HOME.pasig_admin);
  return `${staff ? STAFF_LOGIN : CITIZEN_LOGIN}?next=${encodeURIComponent(path)}`;
}

/**
 * Validates a ?next= value before redirecting to it. Only same-site paths inside the
 * signed-in role's own area are allowed, so the parameter can't be used as an open redirect.
 */
export function safeNextPath(next: string | null | undefined, role: Role): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  return inArea(next, HOME[role]) ? next : null;
}
