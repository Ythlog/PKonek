import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Camera,
  ChartColumn,
  CircleCheck,
  ClipboardCheck,
  HandHeart,
  Landmark,
  MapPin,
  Megaphone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { DemoModePill } from "@/components/DemoModePill";
import { SkipLink } from "@/components/shell/SkipLink";
import { buttonClasses } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CITIZEN_LOGIN, CITIZEN_REGISTER, STAFF_LOGIN } from "@/lib/auth/routes";

const icon = { size: 22, strokeWidth: 1.75, "aria-hidden": true } as const;

const steps = [
  { icon: Megaphone, title: "Report", text: "Pick a category, drop a pin on the map, describe the problem and add a photo." },
  { icon: ClipboardCheck, title: "Track", text: "Your barangay updates the status. You see every step, with dates and notes." },
  { icon: CircleCheck, title: "Verify", text: "When it's marked fixed, you confirm it, or reopen it if the problem is still there." },
];

const features = [
  { icon: HandHeart, title: "Me Too, not duplicates", text: "If someone already reported it nearby, add your support instead. Officials see what matters most." },
  { icon: MapPin, title: "Hotspot maps", text: "Clusters of reports show where the city needs to act first." },
  { icon: ChartColumn, title: "Public accountability", text: "Resolution rates by barangay and category are open for everyone to see." },
];

const audiences = [
  { icon: UserRound, title: "Residents", text: "Report issues, follow progress and confirm fixes.", href: CITIZEN_REGISTER, cta: "Create a free account" },
  { icon: Building2, title: "Barangay officials", text: "Review complaints in your barangay and post updates.", href: STAFF_LOGIN, cta: "Staff sign in" },
  { icon: Landmark, title: "Pasig City Hall", text: "Monitor the whole city, manage accounts and track performance.", href: STAFF_LOGIN, cta: "Administrator sign in" },
];

const timeline = [
  { label: "Reported by Juan", time: "Mon 8:14 AM", done: true },
  { label: "Seen by Barangay Kapitolyo", time: "Mon 10:02 AM", done: true },
  { label: "Crew scheduled for Wednesday", time: "Tue 3:40 PM", done: true },
  { label: "Waiting for your confirmation", time: "Next", done: false },
];

function ProductPreview() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-6 -z-10 rounded-panel bg-brand-600/50 blur-2xl" />
      <div className="rounded-panel border border-white/10 bg-surface p-5 text-ink shadow-popover">
        <div className="flex items-center justify-between gap-3">
          <StatusBadge status="in_progress" size="sm" />
          <span className="font-mono text-xs text-muted">PSG-2026-000001</span>
        </div>
        <p className="mt-3 text-lg font-bold leading-snug tracking-heading text-brand-700">Clogged drain floods the corner of East Capitol Dr</p>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted">
          <MapPin size={14} strokeWidth={1.75} /> Kapitolyo · Flooding and Drainage
        </p>
        <div className="mt-4 flex h-24 items-center justify-center rounded-card bg-cream text-muted">
          <Camera size={28} strokeWidth={1.5} />
        </div>
        <ol className="mt-5 grid gap-3">
          {timeline.map((t) => (
            <li key={t.label} className="flex items-start gap-3">
              <span className={`mt-1 size-2.5 shrink-0 rounded-full ${t.done ? "bg-brand-600" : "border-2 border-accent bg-surface"}`} />
              <span className="flex-1 text-sm font-medium">{t.label}</span>
              <span className="text-xs text-muted">{t.time}</span>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex items-center justify-between rounded-control bg-accent/20 px-3 py-2 text-sm font-semibold">
          <span className="flex items-center gap-2">
            <HandHeart size={16} strokeWidth={1.75} /> 7 neighbors said Me Too
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <header className="bg-brand-700">
        <div className="mx-auto flex h-header max-w-content items-center gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="PKonek home" className="rounded-control">
            <Logo size="sm" />
          </Link>
          <DemoModePill className="hidden bg-accent text-ink sm:inline-flex" />
          <nav aria-label="Main" className="ml-auto flex items-center gap-1 sm:gap-2">
            <a href="#how-it-works" className="hidden min-h-touch items-center rounded-control px-3 text-sm font-semibold text-brand-50 transition-colors hover:bg-white/10 hover:text-white md:flex">
              How it works
            </a>
            <Link href={STAFF_LOGIN} className="hidden min-h-touch items-center rounded-control px-3 text-sm font-semibold text-brand-50 transition-colors hover:bg-white/10 hover:text-white md:flex">
              For officials
            </Link>
            <Link href={CITIZEN_LOGIN} className="flex min-h-touch items-center rounded-control px-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">
              Sign in
            </Link>
            <Link href="/app/report" className={buttonClasses({ variant: "accent", size: "sm" })}>
              Report an issue
            </Link>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        <section className="relative isolate overflow-hidden bg-brand-700 pb-20 pt-10 sm:pt-16 lg:pb-28">
          <div aria-hidden className="absolute -left-40 top-20 -z-10 size-96 rounded-full bg-brand-600/40 blur-3xl" />
          <div className="mx-auto grid max-w-content items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">Civic reporting for Pasig City</p>
              <h1 className="mt-4 text-4xl leading-tight text-white">Report it. Track it. See it fixed.</h1>
              <p className="mt-5 max-w-xl text-lg text-brand-50">
                PKonek connects residents with their barangay and City Hall, from the first report to a fix you confirm yourself.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/app/report" className={buttonClasses({ variant: "accent", size: "lg" })}>
                  <Megaphone aria-hidden size={20} strokeWidth={1.75} />
                  Report an issue
                </Link>
                <Link href={CITIZEN_REGISTER} className={buttonClasses({ size: "lg", className: "border border-white/30 bg-transparent hover:bg-white/10" })}>
                  Create a free account
                  <ArrowRight aria-hidden size={20} strokeWidth={1.75} />
                </Link>
              </div>
              <p className="mt-6 flex items-center gap-2 text-sm text-brand-50/80">
                <ShieldCheck aria-hidden size={16} strokeWidth={1.75} />
                Your contact details are only visible to officials.
              </p>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-4 py-16 sm:py-24">
          <div className="mx-auto max-w-content px-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-brand-600">How it works</p>
            <h2 id="how-heading" className="mt-2 max-w-2xl text-3xl">
              Three steps from problem to fix
            </h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className="rounded-card border border-border bg-surface p-6 shadow-card">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-control bg-brand-50 text-brand-600">
                      <s.icon {...icon} />
                    </span>
                    <span className="text-sm font-semibold text-muted tabular">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-5 text-xl">{s.title}</h3>
                  <p className="mt-2 text-muted">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="features-heading" className="bg-cream py-16 sm:py-24">
          <div className="mx-auto grid max-w-content gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_2fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-brand-600">Why PKonek</p>
              <h2 id="features-heading" className="mt-2 text-3xl">
                Built so every report counts
              </h2>
            </div>
            <ul className="grid gap-6 sm:grid-cols-3">
              {features.map((f) => (
                <li key={f.title}>
                  <span className="flex size-11 items-center justify-center rounded-control bg-surface text-brand-600 shadow-card">
                    <f.icon {...icon} />
                  </span>
                  <h3 className="mt-4 text-lg">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="audience-heading" className="py-16 sm:py-24">
          <div className="mx-auto max-w-content px-4 sm:px-6">
            <h2 id="audience-heading" className="text-3xl">
              One platform for the whole city
            </h2>
            <ul className="mt-10 grid gap-6 md:grid-cols-3">
              {audiences.map((a) => (
                <li key={a.title} className="flex flex-col rounded-card border border-border bg-surface p-6 shadow-card">
                  <span className="flex size-11 items-center justify-center rounded-control bg-brand-700 text-accent">
                    <a.icon {...icon} />
                  </span>
                  <h3 className="mt-5 text-xl">{a.title}</h3>
                  <p className="mt-2 flex-1 text-muted">{a.text}</p>
                  <Link href={a.href} className="mt-6 inline-flex items-center gap-2 font-semibold text-brand-600 hover:text-brand-700">
                    {a.cta}
                    <ArrowRight aria-hidden size={18} strokeWidth={1.75} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="mx-auto flex max-w-content flex-col items-start gap-6 rounded-panel bg-brand-700 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-12">
            <div>
              <h2 className="text-2xl text-white sm:text-3xl">Seen something that needs fixing?</h2>
              <p className="mt-2 text-brand-50">It takes about a minute, and your barangay sees it right away.</p>
            </div>
            <Link href="/app/report" className={buttonClasses({ variant: "accent", size: "lg" })}>
              Report an issue
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-brand-700 text-brand-50">
        <div className="mx-auto grid max-w-content gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo size="md" />
            <p className="mt-4 max-w-sm text-sm">A civic reporting platform connecting Pasig City residents, barangays and City Hall.</p>
          </div>
          <nav aria-label="Residents">
            <h2 className="text-sm font-semibold text-white">Residents</h2>
            <ul className="mt-3 grid gap-2 text-sm">
              <li><Link href="/app/report" className="hover:text-white">Report an issue</Link></li>
              <li><Link href={CITIZEN_LOGIN} className="hover:text-white">Sign in</Link></li>
              <li><Link href={CITIZEN_REGISTER} className="hover:text-white">Create an account</Link></li>
            </ul>
          </nav>
          <nav aria-label="Staff">
            <h2 className="text-sm font-semibold text-white">Officials</h2>
            <ul className="mt-3 grid gap-2 text-sm">
              <li><Link href={STAFF_LOGIN} className="hover:text-white">Staff sign in</Link></li>
              <li><Link href="/styleguide" className="hover:text-white">Design system</Link></li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto max-w-content px-4 py-5 text-xs text-brand-50/70 sm:px-6">© 2026 PKonek · Pasig City</p>
        </div>
      </footer>
    </div>
  );
}
