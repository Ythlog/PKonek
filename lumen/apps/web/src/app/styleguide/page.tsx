import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Bell,
  Building2,
  Camera,
  ChartColumn,
  CircleCheck,
  ClipboardList,
  HandHeart,
  MapPin,
  Megaphone,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { titleCase } from "@/lib/text";
import { Logo } from "@/components/brand/Logo";
import { ComponentGallery } from "./ComponentGallery";
import { colorGroups, radii, shadows, spacingSteps, statusTokens, typeScale } from "@/lib/design-tokens";


export const metadata: Metadata = { title: "Design System" };

const icons = [
  { Icon: Megaphone, name: "Report" },
  { Icon: MapPin, name: "Location" },
  { Icon: Camera, name: "Photo" },
  { Icon: HandHeart, name: "Me Too" },
  { Icon: ClipboardList, name: "Complaints" },
  { Icon: CircleCheck, name: "Resolved" },
  { Icon: Bell, name: "Notifications" },
  { Icon: Search, name: "Search" },
  { Icon: ChartColumn, name: "Analytics" },
  { Icon: Users, name: "Users" },
  { Icon: Building2, name: "Barangay" },
  { Icon: ShieldCheck, name: "Admin" },
];

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-border py-12 first:border-t-0">
      <h2 id={id} className="text-2xl">
        {titleCase(title)}
      </h2>
      <p className="mt-1 max-w-2xl text-muted">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <div className="min-h-dvh">
      <header className="bg-brand-700">
        <div className="mx-auto flex max-w-content flex-col gap-6 px-6 py-12">
          <Logo size="md" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">PKonek</p>
            <h1 className="mt-2 text-3xl text-white sm:text-4xl">Design System</h1>
            <p className="mt-3 max-w-2xl text-lg text-brand-50">
              One set of tokens for citizens, officials and administrators. Components use these tokens
              only, so every screen stays consistent.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-content px-6 pb-16">
        <Section id="colors" title="Color" description="Teal for trust, cream from the logo for warmth, marigold for the actions that matter most.">
          <div className="grid gap-10">
            {colorGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-lg">{group.title}</h3>
                <p className="text-sm text-muted">{group.description}</p>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {group.tokens.map((token) => (
                    <li key={token.name} className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
                      <div className={`flex h-24 items-end p-3 ${token.swatch} ${token.onSwatch}`}>
                        <span className="text-sm font-semibold">{token.name}</span>
                      </div>
                      <div className="p-3">
                        <p className="font-mono text-sm tabular">{token.value}</p>
                        <p className="mt-1 text-sm text-muted">{token.usage}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section id="status" title="Complaint status" description="Always a pill with a dot and a label, so status never depends on color alone. The last two are planned and not in the backend yet.">
          <ul aria-label="Status examples" className="flex flex-wrap gap-3">
            {statusTokens.map((s) => (
              <li key={s.status} className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${s.pill}`}>
                <span aria-hidden className={`size-2 rounded-full ${s.dot}`} />
                <span>{s.label}</span>
                {s.planned && <span className="text-xs font-medium opacity-80">(planned)</span>}
              </li>
            ))}
          </ul>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <p className="rounded-control bg-info-bg p-3 text-sm font-medium text-info">Info uses the open hue</p>
            <p className="rounded-control bg-success-bg p-3 text-sm font-medium text-success">Success uses the resolved hue</p>
            <p className="rounded-control bg-warning-bg p-3 text-sm font-medium text-warning">Warning uses the in-progress hue</p>
            <p className="rounded-control bg-danger-bg p-3 text-sm font-medium text-danger">Danger uses the rejected hue</p>
          </div>
        </Section>

        <Section id="type" title="Typography" description="Plus Jakarta Sans. Rounded shapes that echo the logo, still professional. Body text is 16px.">
          <ul className="divide-y divide-border rounded-card border border-border bg-surface shadow-card">
            {typeScale.map((t) => (
              <li key={t.name} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-6">
                <span className="w-28 shrink-0 font-mono text-xs text-muted tabular">
                  {t.className} · {t.px}px
                </span>
                <span className={`${t.className} ${t.px >= 20 ? "font-bold tracking-heading text-brand-700" : "text-ink"}`}>
                  Kapitolyo drainage is clogged
                </span>
                <span className="text-sm text-muted sm:ml-auto">{t.usage}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">
            Numbers use tabular figures: <span className="font-semibold text-ink tabular">PSG-2026-000123 · 1,284 reports</span>
          </p>
        </Section>

        <Section id="spacing" title="Spacing and layout" description="4px grid. Citizen pages are at most 1200px wide, the staff sidebar is 264px, and touch targets are at least 44px.">
          <ul className="flex flex-wrap items-end gap-6">
            {spacingSteps.map((s) => (
              <li key={s.px} className="flex flex-col items-center gap-2">
                <span aria-hidden className={`${s.className} h-12 rounded-chip bg-brand-600`} />
                <span className="text-sm text-muted tabular">{s.px}px</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="shape" title="Radius and elevation" description="Soft corners and quiet shadows. Hover strengthens the shadow and never moves the card.">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {radii.map((r) => (
              <li key={r.name} className={`border border-border bg-surface p-4 shadow-card ${r.className}`}>
                <p className="font-semibold">{r.name}</p>
                <p className="text-sm text-muted tabular">{r.px}px · {r.usage}</p>
              </li>
            ))}
          </ul>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {shadows.map((s) => (
              <li key={s.name} className={`rounded-card border border-border bg-surface p-6 ${s.className}`}>
                <p className="font-semibold">{s.name}</p>
                <p className="text-sm text-muted">{s.usage}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="icons" title="Icons" description="lucide-react with a 1.75 stroke. No emoji as icons.">
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {icons.map(({ Icon, name }) => (
              <li key={name} className="flex flex-col items-center gap-2 rounded-card border border-border bg-surface p-4 shadow-card">
                <Icon aria-hidden size={24} strokeWidth={1.75} className="text-brand-600" />
                <span className="text-sm text-muted">{name}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="components" title="Components" description="Shared building blocks in src/components/ui. Every screen for every role is built from these.">
          <ComponentGallery />
        </Section>

        <Section id="logo" title="Logo" description="The logo is cream, so it only sits on brand-700. On light headers, use the badge.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex h-32 items-center justify-center rounded-card bg-brand-700">
              <Logo size="lg" />
            </div>
            <div className="flex h-32 items-center justify-center rounded-card border border-border bg-surface">
              <Logo variant="badge" size="sm" />
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}
