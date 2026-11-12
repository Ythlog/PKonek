import { CitizenShell } from "@/components/shell/CitizenShell";
import { RequireRole } from "@/components/shell/RequireRole";

export default function CitizenLayout({ children }: LayoutProps<"/app">) {
  return (
    <RequireRole roles={["citizen"]}>
      <CitizenShell>{children}</CitizenShell>
    </RequireRole>
  );
}
