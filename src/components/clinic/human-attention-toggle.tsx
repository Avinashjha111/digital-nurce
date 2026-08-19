"use client";

import { useTransition } from "react";
import { AlertCircle } from "lucide-react";
import { toggleHumanAttention } from "@/lib/actions/messages";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HumanAttentionToggle({
  conversationId,
  active,
}: {
  conversationId: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant={active ? "destructive" : "outline"}
      size="sm"
      disabled={pending}
      className={cn("gap-1.5")}
      onClick={() =>
        startTransition(() => {
          toggleHumanAttention(conversationId, !active);
        })
      }
    >
      <AlertCircle className="h-3.5 w-3.5" />
      {active ? "Human Attention Required" : "Mark Attention Needed"}
    </Button>
  );
}
