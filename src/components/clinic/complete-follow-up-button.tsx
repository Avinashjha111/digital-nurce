"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { completeFollowUp } from "@/lib/actions/follow-ups";
import { Button } from "@/components/ui/button";

export function CompleteFollowUpButton({ followUpId }: { followUpId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        className="gap-1.5"
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await completeFollowUp(followUpId);
            if (result.error) setError(result.error);
          })
        }
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        {pending ? "Saving..." : "Mark Completed"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
