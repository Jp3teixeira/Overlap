import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto de uma lista agrupada enquanto os dados chegam. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      aria-busy
      aria-label="A carregar"
      className="divide-border border-border bg-card divide-y overflow-hidden rounded-lg border"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
