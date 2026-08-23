"use client";

import { useTransition } from "react";
import { AlertCircle } from "lucide-react";
import { toggleHumanAttention } from "@/lib/actions/messages";
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
    <button
      type="button"
      disabled={pending}
      aria-label={active ? "Human attention required" : "Mark attention needed"}
      title={active ? "Human attention required" : "Mark attention needed"}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50",
        active ? "bg-white text-red-600" : "text-white/80 hover:bg-white/10 hover:text-white"
      )}
      onClick={() =>
        startTransition(() => {
          toggleHumanAttention(conversationId, !active);
        })
      }
    >
      <AlertCircle className="size-4 shrink-0" />
      <span className="hidden lg:inline">
        {active ? "Attention needed" : "Mark attention"}
      </span>
    </button>
  );
}
