import type { ReactNode } from "react";
import { Hammer } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "./PageHeader";

/** Placeholder for a navigation destination that a later task builds. */
export function ComingSoon({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <div className="grid gap-6">
      <PageHeader title={title} description={description} />
      <Card padding="none">
        <EmptyState
          icon={<Hammer size={24} strokeWidth={1.75} />}
          title="This screen is being built"
          description="It's part of the next PKonek releases. The navigation already works, so you can explore the rest of the app."
          action={children}
        />
      </Card>
    </div>
  );
}
