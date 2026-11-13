"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { Spinner } from "@/components/ui/Spinner";
import type { Role } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { loginPathFor } from "@/lib/auth/routes";
import { Forbidden } from "./Forbidden";

export function FullPageStatus({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-page">
      <Logo variant="badge" size="sm" />
      <span className="text-brand-600">
        <Spinner size="lg" label={label} />
      </span>
    </div>
  );
}

/**
 * Client-side access check for a role area. The token lives in sessionStorage, so the
 * server can't see it; the backend still enforces every role on its own endpoints.
 */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { status, role } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") router.replace(loginPathFor(pathname));
  }, [status, pathname, router]);

  if (status === "loading") return <FullPageStatus label="Checking your session" />;
  if (status === "anonymous") return <FullPageStatus label="Taking you to sign in" />;
  if (!role || !roles.includes(role)) return <Forbidden allowed={roles} />;
  return <>{children}</>;
}
