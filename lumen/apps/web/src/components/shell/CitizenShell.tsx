"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { DemoModePill } from "@/components/DemoModePill";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { citizenNav, isActive } from "@/lib/nav";
import { SkipLink } from "./SkipLink";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";

const report = citizenNav.find((i) => i.href === "/app/report")!;
const desktopLinks = citizenNav.filter((i) => i !== report);

/**
 * Resident layout. Desktop: light top bar with the main destinations and a primary
 * "Report an issue" button. Mobile: compact top bar plus a bottom tab bar within thumb reach.
 */
export function CitizenShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
        <div className="mx-auto flex h-header max-w-content items-center gap-4 px-4 sm:px-6">
          <Link href="/app" aria-label="PKonek home" className="shrink-0 rounded-control">
            <Logo variant="badge" size="sm" />
          </Link>

          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {desktopLinks.map((item) => {
                const active = isActive(item, pathname);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-touch items-center gap-2 rounded-control px-3 text-sm font-semibold transition-colors",
                        active ? "bg-brand-50 text-brand-700" : "text-muted hover:bg-page hover:text-ink",
                      )}
                    >
                      <item.icon aria-hidden size={18} strokeWidth={1.75} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <DemoModePill className="hidden sm:inline-flex" />
            <Link
              href={report.href}
              aria-current={isActive(report, pathname) ? "page" : undefined}
              className={buttonClasses({ size: "sm", className: "hidden md:inline-flex" })}
            >
              <Plus aria-hidden size={18} strokeWidth={2} />
              {report.label}
            </Link>
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-content flex-1 px-4 pb-28 pt-6 outline-none sm:px-6 sm:pt-8 md:pb-12">
        {children}
      </main>

      {/* Mobile tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {citizenNav.map((item) => {
            const active = isActive(item, pathname);
            const isReport = item === report;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors",
                    active ? "text-brand-700" : "text-muted hover:text-ink",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                      isReport ? "bg-accent text-ink" : active ? "bg-brand-50" : "",
                    )}
                  >
                    <item.icon size={20} strokeWidth={active || isReport ? 2 : 1.75} />
                  </span>
                  {item.short ?? item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
