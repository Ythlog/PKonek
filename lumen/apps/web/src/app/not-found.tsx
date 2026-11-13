import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { buttonClasses } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-page px-4 py-12 text-center">
      <Logo variant="badge" size="sm" />
      <div className="w-full max-w-md rounded-panel border border-border bg-surface p-8 shadow-card">
        <span aria-hidden className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <MapPinOff size={28} strokeWidth={1.75} />
        </span>
        <p className="mt-6 text-sm font-semibold text-muted tabular">Error 404</p>
        <h1 className="mt-1 text-2xl">We Couldn&rsquo;t Find That Page</h1>
        <p className="mt-3 text-muted">The link may be broken, or the page may have moved.</p>
        <Link href="/" className={buttonClasses({ className: "mt-8" })}>
          Back to PKonek
        </Link>
      </div>
    </main>
  );
}
