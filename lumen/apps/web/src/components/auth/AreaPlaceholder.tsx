"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import type { Role } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { CITIZEN_LOGIN, STAFF_LOGIN } from "@/lib/auth/routes";

const roleLabel: Record<Role, string> = { citizen: "Resident", official: "Barangay official", pasig_admin: "Pasig administrator" };

/**
 * Temporary landing page for each role area so sign-in can be tried end to end.
 * Task 5 replaces it with the real shells, navigation and route guards.
 */
export function AreaPlaceholder({ area, title }: { area: Role; title: string }) {
  const { status, user, logout } = useAuth();
  const loginHref = area === "citizen" ? CITIZEN_LOGIN : STAFF_LOGIN;

  return (
    <div className="min-h-dvh">
      <header className="bg-brand-700">
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
          <Logo size="sm" />
          <Badge tone="accent">{roleLabel[area]}</Badge>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-content px-6 py-12">
        <Card padding="lg" className="max-w-xl">
          {status === "loading" && <Spinner label="Checking your session" />}
          {status === "anonymous" && (
            <>
              <h1 className="text-2xl">{title}</h1>
              <p className="mt-2 text-muted">You&rsquo;re signed out.</p>
              <Link href={loginHref} className={buttonClasses({ className: "mt-6" })}>
                Sign in
              </Link>
            </>
          )}
          {status === "authenticated" && user && (
            <>
              <p className="text-sm font-semibold text-brand-600">Signed in</p>
              <h1 className="mt-1 text-2xl">{title}</h1>
              <p className="mt-2 text-muted">
                {user.full_name} · {user.email} · {roleLabel[user.role]}
                {user.barangay ? ` · ${user.barangay}` : ""}
              </p>
              <p className="mt-4 text-sm text-muted">The full workspace for this role is built in the next task.</p>
              <Button variant="secondary" className="mt-6" leadingIcon={<LogOut aria-hidden size={18} strokeWidth={1.75} />} onClick={() => logout()}>
                Sign out
              </Button>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
