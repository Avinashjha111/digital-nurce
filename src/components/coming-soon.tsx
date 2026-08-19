import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function ComingSoon({
  icon: Icon,
  title,
  milestone,
}: {
  icon: LucideIcon;
  title: string;
  milestone: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Icon className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">{title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{milestone}</p>
      </CardContent>
    </Card>
  );
}
