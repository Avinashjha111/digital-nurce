import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

// Doubles as the app's EmptyState: "coming soon" copy when a feature
// genuinely isn't built yet, or "no data yet" copy with an optional CTA
// once the feature is real but a list happens to be empty.
export function ComingSoon({
  icon: Icon,
  title,
  milestone,
  action,
}: {
  icon: LucideIcon;
  title: string;
  milestone: string;
  action?: { label: string; href: string };
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Icon className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">{title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{milestone}</p>
        {action && (
          <Link
            href={action.href}
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {action.label}
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
