"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/clinic/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/clinic/patients", icon: Users, label: "Patients" },
  { href: "/clinic/prescriptions", icon: FileText, label: "Prescriptions" },
  { href: "/clinic/inbox", icon: Inbox, label: "Inbox" },
];

// Icon-only bottom tab bar for the phone-width clinic app, matching the
// pattern most phone apps use for their top-level destinations. Reminders
// and Follow-ups stay in the hamburger sidebar only -- this bar is just
// the handful of screens staff jump into constantly.
export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-label={tab.label}
            className="flex flex-1 items-center justify-center py-2.5"
          >
            <Icon
              className={cn(
                "size-6",
                active ? "text-primary" : "text-muted-foreground"
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
