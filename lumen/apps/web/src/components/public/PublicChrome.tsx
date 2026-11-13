import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { DemoModePill } from "@/components/DemoModePill";
import { buttonClasses } from "@/components/ui/Button";
import { CITIZEN_LOGIN, CITIZEN_REGISTER, STAFF_LOGIN } from "@/lib/auth/routes";

const navLink = "hidden min-h-touch items-center rounded-control px-3 text-sm font-semibold text-brand-50 transition-colors hover:bg-white/10 hover:text-white md:flex";

/** Header for public pages (landing, accountability report). */
export function PublicHeader() {
  return (
    <header className="bg-brand-700">
      <div className="mx-auto flex h-header max-w-content items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="PKonek home" className="rounded-control">
          <Logo size="sm" />
        </Link>
        <DemoModePill className="hidden bg-accent text-ink sm:inline-flex" />
        <nav aria-label="Main" className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link href="/#how-it-works" className={navLink}>
            How It Works
          </Link>
          <Link href="/accountability" className={navLink}>
            City Report
          </Link>
          <Link href={STAFF_LOGIN} className={navLink}>
            For Officials
          </Link>
          <Link href={CITIZEN_LOGIN} className="flex min-h-touch items-center rounded-control px-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">
            Sign In
          </Link>
          <Link href="/app/report" className={buttonClasses({ variant: "accent", size: "sm" })}>
            Report an Issue
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-brand-700 text-brand-50">
      <div className="mx-auto grid max-w-content gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo size="md" />
          <p className="mt-4 max-w-sm text-sm">A civic reporting platform connecting Pasig City residents, barangays and City Hall.</p>
        </div>
        <nav aria-label="Residents">
          <h2 className="text-sm font-semibold text-white">Residents</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            <li><Link href="/app/report" className="hover:text-white">Report an Issue</Link></li>
            <li><Link href={CITIZEN_LOGIN} className="hover:text-white">Sign In</Link></li>
            <li><Link href={CITIZEN_REGISTER} className="hover:text-white">Create an Account</Link></li>
            <li><Link href="/accountability" className="hover:text-white">City Accountability Report</Link></li>
          </ul>
        </nav>
        <nav aria-label="Staff">
          <h2 className="text-sm font-semibold text-white">Officials</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            <li><Link href={STAFF_LOGIN} className="hover:text-white">Staff Sign In</Link></li>
            <li><Link href="/styleguide" className="hover:text-white">Design System</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-content px-4 py-5 text-xs text-brand-50/70 sm:px-6">© 2026 PKonek · Pasig City</p>
      </div>
    </footer>
  );
}
