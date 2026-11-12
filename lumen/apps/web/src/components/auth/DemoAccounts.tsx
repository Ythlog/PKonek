"use client";

import { KeyRound } from "lucide-react";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/api/mock/seed";
import type { Role } from "@/lib/api/types";
import { USE_MOCKS } from "@/lib/env";

type DemoAccountsProps = {
  roles: Role[];
  onPick: (email: string, password: string) => void;
  enabled?: boolean;
};

/** Mock mode only: one-click demo credentials for presentations. */
export function DemoAccounts({ roles, onPick, enabled = USE_MOCKS }: DemoAccountsProps) {
  if (!enabled) return null;
  const accounts = DEMO_ACCOUNTS.filter((a) => roles.includes(a.role));
  return (
    <section aria-labelledby="demo-accounts" className="rounded-card border border-dashed border-accent bg-accent/10 p-4">
      <h2 id="demo-accounts" className="flex items-center gap-2 text-sm font-semibold text-ink">
        <KeyRound aria-hidden size={16} strokeWidth={1.75} />
        Demo accounts
      </h2>
      <p className="mt-1 text-sm text-muted">
        Password for all: <code className="font-mono font-semibold text-ink">{DEMO_PASSWORD}</code>
      </p>
      <ul className="mt-3 grid gap-2">
        {accounts.map((a) => (
          <li key={a.email}>
            <button
              type="button"
              onClick={() => onPick(a.email, DEMO_PASSWORD)}
              className="flex min-h-touch w-full items-center justify-between gap-3 rounded-control border border-border bg-surface px-3 text-left text-sm transition-colors hover:border-brand-600/40 hover:bg-brand-50"
            >
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{a.label}</span>
                <span className="block truncate text-muted">{a.email}</span>
              </span>
              <span className="shrink-0 font-semibold text-brand-600">Use</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
