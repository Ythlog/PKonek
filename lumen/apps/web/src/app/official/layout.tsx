import { RequireRole } from "@/components/shell/RequireRole";
import { StaffShell } from "@/components/shell/StaffShell";

export default function OfficialLayout({ children }: LayoutProps<"/official">) {
  return (
    <RequireRole roles={["official"]}>
      <StaffShell role="official">{children}</StaffShell>
    </RequireRole>
  );
}
