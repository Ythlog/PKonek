import type { ReactNode } from "react";
import Link from "next/link";
import { BellRing, Building2, ChartColumn, ClipboardCheck, MapPin, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { DemoModePill } from "@/components/DemoModePill";
import { titleCase } from "@/lib/text";

type Audience = "citizen" | "staff";

const panelCopy: Record<Audience, { eyebrow: string; headline: string; points: Array<{ icon: typeof MapPin; text: string }> }> = {
  citizen: {
    eyebrow: "For Pasig City residents",
    headline: "Report It. Track It. See It Fixed.",
    points: [
      { icon: MapPin, text: "Pin the exact spot and add a photo in under a minute." },
      { icon: BellRing, text: "Get updates as your barangay works on it." },
      { icon: ClipboardCheck, text: "Confirm the fix yourself before it is closed." },
    ],
  },
  staff: {
    eyebrow: "For barangay and city staff",
    headline: "Every Report, One Clear Workspace.",
    points: [
      { icon: Building2, text: "See and act on the complaints in your barangay." },
      { icon: ChartColumn, text: "Spot hotspots and trends before they grow." },
      { icon: ShieldCheck, text: "Every status change is logged for accountability." },
    ],
  },
};

type AuthLayoutProps = {
  audience: Audience;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Links under the card, e.g. "No account yet? Create one". */
  footer?: ReactNode;
};

/**
 * Split screen for every sign-in and sign-up page. The brand panel is brand-700 because
 * the cream logo only works on it. On small screens the panel becomes a compact header.
 */
export function AuthLayout({ audience, title, description, children, footer }: AuthLayoutProps) {
  const copy = panelCopy[audience];
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Brand panel (desktop) / header (mobile) */}
      <aside className="relative isolate overflow-hidden bg-brand-700 text-white">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-brand-600/60 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 -z-10 hidden size-96 rounded-full bg-accent/15 blur-3xl lg:block" />

        <div className="flex h-full flex-col gap-6 px-6 py-5 sm:px-10 lg:px-14 lg:py-12">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" aria-label="PKonek home" className="rounded-control">
              <Logo size="md" />
            </Link>
            <DemoModePill className="bg-accent text-ink" />
          </div>

          <div className="hidden flex-1 flex-col justify-center lg:flex">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{copy.eyebrow}</p>
            <p className="mt-4 max-w-md text-4xl font-bold leading-tight tracking-heading text-white">{copy.headline}</p>
            <ul className="mt-10 grid max-w-md gap-5">
              {copy.points.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-4">
                  <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-control bg-white/10 text-accent">
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <span className="pt-2 text-brand-50">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="hidden text-sm text-brand-50/80 lg:block">PKonek · A civic reporting platform for Pasig City</p>
        </div>
      </aside>

      {/* Form side */}
      <main id="main" className="flex flex-col items-center px-4 py-8 sm:px-6 sm:py-12 lg:justify-center lg:py-16">
        <div className="w-full max-w-md">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-brand-600 lg:hidden">{copy.eyebrow}</p>
          <h1 className="mt-1 text-2xl sm:text-3xl">{titleCase(title)}</h1>
          {description && <p className="mt-2 text-muted">{description}</p>}

          <div className="mt-6 rounded-panel border border-border bg-surface p-5 shadow-card sm:p-8">{children}</div>

          {footer && <div className="mt-6 flex flex-col items-center gap-2 text-center text-sm text-muted">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-brand-600 underline-offset-4 hover:text-brand-700 hover:underline">
      {children}
    </Link>
  );
}
