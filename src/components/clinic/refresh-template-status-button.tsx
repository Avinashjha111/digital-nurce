"use client";

import { useTransition } from "react";
import { RotateCw } from "lucide-react";
import { refreshTemplateStatus } from "@/lib/actions/templates";
import { Button } from "@/components/ui/button";

export function RefreshTemplateStatusButton({ templateId }: { templateId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={() => startTransition(() => refreshTemplateStatus(templateId))}
      title="Refresh status from Meta"
    >
      <RotateCw className="h-3.5 w-3.5" />
    </Button>
  );
}
