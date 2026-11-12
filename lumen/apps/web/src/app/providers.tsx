"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";

/** App-wide client providers. Task 3 adds the query client and auth here. */
export function Providers({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
