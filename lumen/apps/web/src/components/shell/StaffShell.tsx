"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ExternalLink, Menu, Search } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { DemoModePill } from "@/components/DemoModePill";
import { Drawer } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth/AuthProvider";
import { homePathFor } from "@/lib/auth/routes";
import { isActive, staffNav, type NavGroup } from "@/lib/nav";
import { SkipLink } from "./SkipLink";
import { UserMenu } from "./UserMenu";

type StaffRole = "official" | "pasig_admin";

function scopeLabel(role: StaffRole, barangay: string | null) {
  if (role === "pasig_admin") return "City administration";
  return barangay ? `Barangay ${barangay}` : "Barangay official";
}

function SidebarNav({ groups, pathname, tone, onNavigate }: {
  groups: NavGroup[];
  pathname: string;
  tone: "dark" | "light";
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Workspace" className="grid gap-6">
      {groups.map((group, index) => (
        <div key={group.label ?? index}>
          {group.label && (
            <p className={cn("mb-2 px-3 text-xs font-semibold uppercase tracking-eyebrow", tone === "dark" ? "text-brand-50/60" : "text-muted")}>
              {group.label}
            </p>
          )}
          <ul className="grid gap-1">
            {group.items.map((item) => {
              const active = isActive(item, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex min-h-touch items-center gap-3 rounded-control px-3 text-sm font-semibold transition-colors",
                      tone === "dark"
                        ? active
                          ? "bg-white/12 text-white"
                          : "text-brand-50/80 hover:bg-white/8 hover:text-white"
                        : active
                          ? "bg-brand-50 text-brand-700"
                          : "text-muted hover:bg-page hover:text-ink",
                    )}
                  >
                    {active && <span aria-hidden className="absolute inset-y-2 left-0 w-1 rounded-full bg-accent" />}
                    <item.icon aria-hidden size={20} strokeWidth={1.75} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * Official and admin layout: teal sidebar on desktop, drawer on smaller screens,
 * and a top bar with complaint search, notifications and the account menu.
 */
export function StaffShell({ role, children }: { role: StaffRole; children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const groups = staffNav(role);
  const base = homePathFor(role);
  const scope = scopeLabel(role, user?.barangay ?? null);

  // Close the drawer after navigating.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to a route change
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-dvh lg:pl-sidebar">
      <SkipLink />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-sidebar flex-col bg-brand-700 lg:flex">
        <div className="px-5 pb-6 pt-6">
          <Link href={base} aria-label="PKonek workspace home" className="inline-flex rounded-control">
            <Logo size="md" />
          </Link>
          <p className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-accent">{scope}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6">
          <SidebarNav groups={groups} pathname={pathname} tone="dark" />
        </div>
        <div className="border-t border-white/10 px-3 py-4">
          <Link
            href="/"
            className="flex min-h-touch items-center gap-3 rounded-control px-3 text-sm font-medium text-brand-50/80 transition-colors hover:bg-white/8 hover:text-white"
          >
            <ExternalLink aria-hidden size={18} strokeWidth={1.75} />
            Public site
          </Link>
        </div>
      </aside>

      {/* Mobile drawer */}
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} side="left" title="PKonek workspace" description={scope}>
        <SidebarNav groups={groups} pathname={pathname} tone="light" onNavigate={() => setMenuOpen(false)} />
      </Drawer>

      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
        <div className="flex h-header items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation"
            aria-expanded={menuOpen}
            className="-ml-2 flex size-touch items-center justify-center rounded-control text-ink transition-colors hover:bg-page lg:hidden"
          >
            <Menu aria-hidden size={22} strokeWidth={1.75} />
          </button>
          <Link href={base} aria-label="PKonek workspace home" className="rounded-control lg:hidden">
            <Logo variant="badge" size="sm" />
          </Link>

          <form role="search" action={`${base}/complaints`} className="relative hidden max-w-md flex-1 md:block">
            <label htmlFor="staff-search" className="sr-only">
              Search complaints
            </label>
            <Search aria-hidden size={18} strokeWidth={1.75} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              id="staff-search"
              name="q"
              type="search"
              minLength={2}
              placeholder="Search complaints, e.g. drainage"
              className="h-10 w-full rounded-full border border-border bg-page pl-10 pr-4 text-sm text-ink placeholder:text-muted/80 focus-visible:border-brand-600 focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-600/20"
            />
          </form>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <DemoModePill className="hidden sm:inline-flex" />
            <Link
              href={`${base}/notifications`}
              aria-label="Notifications"
              aria-current={isActive({ href: `${base}/notifications` }, pathname) ? "page" : undefined}
              className="flex size-touch items-center justify-center rounded-full text-muted transition-colors hover:bg-page hover:text-ink"
            >
              <Bell aria-hidden size={20} strokeWidth={1.75} />
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="px-4 py-6 outline-none sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
