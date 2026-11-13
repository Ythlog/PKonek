"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth/AuthProvider";
import { roleLabel } from "@/lib/nav";

/** Avatar button with the signed-in user's details and sign out. */
export function UserMenu({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  const firstName = user.full_name.split(" ")[0];

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${user.full_name}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex min-h-touch items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors",
          tone === "dark" ? "text-white hover:bg-white/10" : "text-ink hover:bg-page",
        )}
      >
        <Avatar name={user.full_name} size="sm" />
        <span className="hidden text-sm font-semibold sm:inline">{firstName}</span>
        <ChevronDown aria-hidden size={16} strokeWidth={1.75} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute right-0 top-full z-40 mt-2 w-72 animate-pop-in overflow-hidden rounded-card border border-border bg-surface shadow-popover"
        >
          <div className="flex items-center gap-3 border-b border-border p-4">
            <Avatar name={user.full_name} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{user.full_name}</p>
              <p className="truncate text-sm text-muted">{user.email}</p>
              <p className="mt-0.5 text-xs font-semibold text-brand-600">
                {roleLabel[user.role]}
                {user.barangay ? ` · ${user.barangay}` : ""}
              </p>
            </div>
          </div>
          <div className="p-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="flex min-h-touch w-full items-center gap-3 rounded-control px-3 text-left font-medium text-ink transition-colors hover:bg-page"
            >
              <LogOut aria-hidden size={18} strokeWidth={1.75} className="text-muted" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
