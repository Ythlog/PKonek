import { Suspense } from "react";
import { CitizenShell } from "@/components/shell/CitizenShell";
import { FullPageStatus, RequireRole } from "@/components/shell/RequireRole";

// The guard and shell read the URL, so they render inside Suspense (required for dynamic routes with Cache Components).
export default function CitizenLayout({ children }: LayoutProps<"/app">) {
  return (
    <Suspense fallback={<FullPageStatus label="Loading" />}>
      <RequireRole roles={["citizen"]}>
        <CitizenShell>{children}</CitizenShell>
      </RequireRole>
    </Suspense>
  );
}
