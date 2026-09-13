"use client";

import { useTransition } from "react";
import { AlertCircle, Bot, UserCheck } from "lucide-react";
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
      aria-label={active ? "Human attention required (click to switch to AI)" : "AI Assistant Active (click to take manual control)"}
      title={active ? "Doctor in control / Attention needed (click to switch back to AI)" : "AI Assistant active (click to take manual control)"}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
        active
          ? "border-amber-300 bg-amber-500 text-white shadow-sm hover:bg-amber-600"
          : "border-emerald-300/40 bg-emerald-700/80 text-white hover:bg-emerald-700"
      )}
      onClick={() =>
        startTransition(() => {
          toggleHumanAttention(conversationId, !active);
        })
      }
    >
      {active ? (
        <>
          <AlertCircle className="size-3.5 shrink-0" />
          <span>Doctor Control</span>
        </>
      ) : (
        <>
          <Bot className="size-3.5 shrink-0 text-emerald-200" />
          <span>AI Active</span>
        </>
      )}
    </button>
  );
}
