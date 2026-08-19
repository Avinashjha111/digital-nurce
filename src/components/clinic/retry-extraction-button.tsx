"use client";

import { useState, useTransition } from "react";
import { RotateCw } from "lucide-react";
import { processPrescription } from "@/lib/actions/prescriptions";
import { Button } from "@/components/ui/button";

export function RetryExtractionButton({ prescriptionId }: { prescriptionId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        className="w-fit gap-1.5"
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await processPrescription(prescriptionId);
            if (result.error) setError(result.error);
          })
        }
      >
        <RotateCw className="h-3.5 w-3.5" />
        {pending ? "Retrying..." : "Retry Extraction"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
