import { Suspense } from "react";
import { StaffShell } from "@/components/shell/StaffShell";
import { FullPageStatus, RequireRole } from "@/components/shell/RequireRole";

// The guard and shell read the URL, so they render inside Suspense (required for dynamic routes with Cache Components).
export default function OfficialLayout({ children }: LayoutProps<"/official">) {
  return (
    <Suspense fallback={<FullPageStatus label="Loading" />}>
      <RequireRole roles={["official"]}>
        <StaffShell role="official">{children}</StaffShell>
      </RequireRole>
    </Suspense>
  );
}
