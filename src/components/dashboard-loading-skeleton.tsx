import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function KpiSkeleton() {
  return (
    <Card className="gap-3 py-4 shadow-none">
      <CardContent className="flex flex-col gap-2 px-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="size-4 rounded-full" />
        </div>
        <Skeleton className="h-7 w-12" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function SectionSkeleton({ rows = 3, height }: { rows?: number; height?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <Skeleton className="h-4 w-40" />
        {height ? (
          <Skeleton className={height} />
        ) : (
          Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
        )}
      </CardContent>
    </Card>
  );
}

// Shared shape for both dashboards' loading.tsx (Next.js Suspense
// fallback while the async Server Component fetches) -- both dashboards
// share the same KPI-rows -> section -> two-column-charts -> activity
// layout, so one skeleton covers both instead of duplicating markup.
export function DashboardLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>

      <SectionSkeleton rows={3} />
      <SectionSkeleton rows={2} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionSkeleton height="h-56" />
        <SectionSkeleton height="h-56" />
      </div>

      <SectionSkeleton rows={4} />
    </div>
  );
}
