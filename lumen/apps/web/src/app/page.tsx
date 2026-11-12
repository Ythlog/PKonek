import Link from "next/link";
import { ArrowRight, Palette } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { DemoModePill } from "@/components/DemoModePill";
import { buttonClasses } from "@/components/ui/Button";

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
            Sign-in is ready for residents, barangay officials and Pasig administrators.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login" className={buttonClasses()}>
              Resident sign in
              <ArrowRight aria-hidden size={18} strokeWidth={1.75} />
            </Link>
            <Link href="/register" className={buttonClasses({ variant: "secondary" })}>
              Create an account
            </Link>
            <Link href="/staff/login" className={buttonClasses({ variant: "secondary" })}>
              Staff sign in
            </Link>
            <Link href="/styleguide" className={buttonClasses({ variant: "ghost" })}>
              <Palette aria-hidden size={18} strokeWidth={1.75} />
              Design system
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
