import { Skeleton } from "@/components/ui/Skeleton";

/** Placeholder while a sign-in form that reads the URL loads in the browser. */
export function AuthFormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading form" className="grid gap-5">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-11 w-full rounded-control" />
        </div>
      ))}
      <Skeleton className="h-12 w-full rounded-control" />
    </div>
  );
}
