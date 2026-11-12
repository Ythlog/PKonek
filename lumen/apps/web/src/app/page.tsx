import Link from "next/link";
import { ArrowRight, Palette } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { DemoModePill } from "@/components/DemoModePill";

// Temporary home page. Task 5 replaces it with the public landing page.
export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col">
      <section className="bg-brand-700 px-6 py-16 sm:py-24">
        <div className="mx-auto flex max-w-content flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Logo size="lg" />
            <DemoModePill className="bg-accent text-ink" />
          </div>
          <div className="max-w-2xl">
            <h1 className="text-3xl text-white sm:text-4xl">Report it. Track it. See it fixed.</h1>
            <p className="mt-4 text-lg text-brand-50">
              PKonek connects Pasig City residents with their barangay and city officials, from the
              first report to a verified fix.
            </p>
          </div>
        </div>
      </section>
      <section className="mx-auto w-full max-w-content flex-1 px-6 py-12">
        <div className="rounded-card border border-border bg-surface p-6 shadow-card">
          <h2 className="text-xl">The new PKonek interface is being built</h2>
          <p className="mt-2 text-muted">
            The design system is ready. Citizen, official and administrator screens come next.
          </p>
          <Link
            href="/styleguide"
            className="mt-6 inline-flex min-h-touch items-center gap-2 rounded-control bg-brand-600 px-5 font-semibold text-white transition-colors hover:bg-brand-700"
          >
            <Palette aria-hidden size={18} strokeWidth={1.75} />
            View the design system
            <ArrowRight aria-hidden size={18} strokeWidth={1.75} />
          </Link>
        </div>
      </section>
    </main>
  );
}
