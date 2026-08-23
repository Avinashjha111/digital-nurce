import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export type QuickAction = {
  label: string;
  href: string;
  icon: LucideIcon;
  primary?: boolean;
};

// dashboard.md's "Quick Actions" row -- at most one primary (orange)
// button, the rest stay outline so orange keeps meaning "the main thing
// to do here" instead of every action competing for attention.
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(({ label, href, icon: Icon, primary }) => (
        <Button
          key={label}
          variant={primary ? "default" : "outline"}
          size="sm"
          nativeButton={false}
          render={<Link href={href} />}
        >
          <Icon className="size-4" />
          {label}
        </Button>
      ))}
    </div>
  );
}
