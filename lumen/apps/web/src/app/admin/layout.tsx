import { Suspense } from "react";
import { StaffShell } from "@/components/shell/StaffShell";
import { FullPageStatus, RequireRole } from "@/components/shell/RequireRole";

// The guard and shell read the URL, so they render inside Suspense (required for dynamic routes with Cache Components).
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<FullPageStatus label="Loading" />}>
      <RequireRole roles={["pasig_admin"]}>
        <StaffShell role="pasig_admin">{children}</StaffShell>
      </RequireRole>
    </Suspense>
  );
}
