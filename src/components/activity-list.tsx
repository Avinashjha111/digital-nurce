import Link from "next/link";
import type { ReactNode } from "react";

export type ActivityItem = {
  key: string;
  time: string;
  text: ReactNode;
  href?: string;
};

// dashboard.md's "Recent Activity" / "Recent Patient Activity" pattern:
// a short list of timestamp + event, each optionally linking somewhere
// (e.g. a patient's profile).
export function ActivityList({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Nothing recent yet.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {items.map((item) => {
        const row = (
          <div className="flex flex-col gap-0.5 py-3">
            <span className="text-xs text-muted-foreground">{item.time}</span>
            <span className="text-sm">{item.text}</span>
          </div>
        );
        return (
          <li key={item.key}>
            {item.href ? (
              <Link href={item.href} className="block rounded-md hover:bg-muted/50">
                {row}
              </Link>
            ) : (
              row
            )}
          </li>
        );
      })}
    </ul>
  );
}
