import { RequireRole } from "@/components/shell/RequireRole";
import { StaffShell } from "@/components/shell/StaffShell";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <RequireRole roles={["pasig_admin"]}>
      <StaffShell role="pasig_admin">{children}</StaffShell>
    </RequireRole>
  );
}
