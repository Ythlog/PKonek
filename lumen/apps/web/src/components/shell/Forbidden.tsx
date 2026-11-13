"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import type { Role } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { homePathFor } from "@/lib/auth/routes";
import { roleLabel } from "@/lib/nav";

/** 403: signed in, but this area belongs to another role. */
export function Forbidden({ allowed }: { allowed: Role[] }) {
  const { user, logout } = useAuth();
  const areaFor = allowed.map((r) => roleLabel[r].toLowerCase() + "s").join(" and ");
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-page px-4 py-12">
      <div className="w-full max-w-md rounded-panel border border-border bg-surface p-8 text-center shadow-card">
        <span aria-hidden className="mx-auto flex size-14 items-center justify-center rounded-full bg-danger-bg text-danger">
          <ShieldAlert size={28} strokeWidth={1.75} />
        </span>
        <p className="mt-6 text-sm font-semibold text-muted tabular">Error 403</p>
        <h1 className="mt-1 text-2xl">You Don&rsquo;t Have Access to This Page</h1>
        <p className="mt-3 text-muted">
          This area is for {areaFor}.
          {user && (
            <>
              {" "}
              You&rsquo;re signed in as <span className="font-semibold text-ink">{user.full_name}</span> ({roleLabel[user.role]}).
            </>
          )}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {user && (
            <Link href={homePathFor(user.role)} className={buttonClasses()}>
              Go to My Home
            </Link>
          )}
          <Button variant="secondary" onClick={() => logout()}>
            Switch account
          </Button>
        </div>
      </div>
    </main>
  );
}
