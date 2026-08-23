import Link from "next/link";
import { AlertCircle, AlertTriangle, Clock, Info } from "lucide-react";
import type { StatusTone } from "@/components/status-tone-badge";
import { cn } from "@/lib/utils";

export type AttentionItem = {
  tone: Extract<StatusTone, "danger" | "warning" | "action" | "info">;
  text: string;
  href: string;
  cta: string;
};

const toneIcon: Record<AttentionItem["tone"], typeof AlertCircle> = {
  danger: AlertCircle,
  warning: AlertTriangle,
  action: Clock,
  info: Info,
};

const toneText: Record<AttentionItem["tone"], string> = {
  danger: "text-destructive",
  warning: "text-status-warning",
  action: "text-status-action",
  info: "text-status-info",
};

const toneBorder: Record<AttentionItem["tone"], string> = {
  danger: "border-l-destructive",
  warning: "border-l-status-warning",
  action: "border-l-status-action",
  info: "border-l-status-info",
};

// The "strong Needs Your Attention section" from dashboard.md -- each row
// gets a colored left accent + a tone-matched icon, so the list reads as
// action items at a glance instead of another plain list.
export function AttentionList({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Nothing needs attention. You&apos;re all caught up ✓
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {items.map((item) => {
        const Icon = toneIcon[item.tone];
        return (
          <li
            key={item.text}
            className={cn(
              "flex items-center justify-between gap-3 border-l-2 py-2.5 pl-3",
              toneBorder[item.tone]
            )}
          >
            <div className="flex items-center gap-2.5">
              <Icon className={cn("size-4 shrink-0", toneText[item.tone])} />
              <span className="text-sm">{item.text}</span>
            </div>
            <Link href={item.href} className="shrink-0 text-sm font-medium text-primary hover:underline">
              {item.cta}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
