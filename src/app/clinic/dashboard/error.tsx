"use client";

import { useEffect } from "react";
import { DashboardErrorState } from "@/components/dashboard-error-state";

export default function ClinicDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <DashboardErrorState reset={reset} />;
}
