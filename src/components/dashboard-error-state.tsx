"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Shared UI for both dashboards' error.tsx (Next.js error boundary --
// catches anything thrown while the async Server Component renders).
export function DashboardErrorState({ reset }: { reset: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="font-medium">Unable to load dashboard data.</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Something went wrong while fetching your data. This is usually temporary.
        </p>
        <Button onClick={reset} className="mt-1">
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}
