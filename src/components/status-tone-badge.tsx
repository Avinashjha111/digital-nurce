import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Shared semantic tones used everywhere a status appears (badges, KPI
// dots, activity feed) so color always means the same thing: success is
// always green, action/scheduled is always orange, etc. -- per
// dashboard.md's rule against re-purposing colors per-context.
export type StatusTone = "neutral" | "success" | "warning" | "info" | "action" | "danger";

const toneClass: Record<StatusTone, string> = {
  neutral: "",
  success: "border-transparent bg-status-success-soft text-status-success-soft-foreground",
  warning: "border-transparent bg-status-warning-soft text-status-warning-soft-foreground",
  info: "border-transparent bg-status-info-soft text-status-info-soft-foreground",
  action: "border-transparent bg-status-action-soft text-status-action-soft-foreground",
  danger: "border-transparent bg-destructive/10 text-destructive",
};

export function StatusToneBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Badge
      variant={tone === "neutral" ? "secondary" : "outline"}
      className={cn(toneClass[tone], className)}
    >
      {children}
    </Badge>
  );
}

const dotClass: Record<StatusTone, string> = {
  neutral: "bg-muted-foreground",
  success: "bg-status-success",
  warning: "bg-status-warning",
  info: "bg-status-info",
  action: "bg-status-action",
  danger: "bg-destructive",
};

// The "● 38 Sent   ● 4 Pending" inline pattern from dashboard.md's KPI
// card spec -- a colored dot plus a short label, not a full pill badge.
export function StatusDot({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", dotClass[tone])} aria-hidden="true" />
      {children}
    </span>
  );
}
