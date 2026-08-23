import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusDot } from "@/components/status-tone-badge";
import type { StatusTone } from "@/components/status-tone-badge";

// dashboard.md's compact KPI card: label+icon, one dark number, an
// optional row of "* N Label" status dots, an optional "View X ->" link.
// The number itself stays dark/neutral -- only the dots carry color, per
// the "don't turn a card into a rainbow" rule.
export function KpiCard({
  label,
  value,
  icon: Icon,
  statuses,
  href,
  cta,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  statuses?: { tone: StatusTone; label: string }[];
  href?: string;
  cta?: string;
}) {
  return (
    <Card className="gap-3 py-4 shadow-none transition-colors hover:border-foreground/20">
      <CardContent className="flex flex-col gap-2 px-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <Icon className="size-4 text-muted-foreground" />
        </div>

        <div className="text-2xl font-semibold tabular-nums">{value}</div>

        {statuses && statuses.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            {statuses.map((s) => (
              <StatusDot key={s.label} tone={s.tone}>
                {s.label}
              </StatusDot>
            ))}
          </div>
        )}

        {href && cta && (
          <Link
            href={href}
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {cta}
            <ArrowRight className="size-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
