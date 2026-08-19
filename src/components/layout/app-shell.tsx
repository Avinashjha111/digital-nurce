"use client";

import { useState, type ReactNode } from "react";
import { Menu, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { agencyNavItems, clinicNavItems } from "@/components/layout/nav-items";
import { LogoutButton } from "@/components/logout-button";

export function AppShell({
  variant,
  appName,
  badgeLabel,
  userLabel,
  children,
}: {
  variant: "agency" | "clinic";
  appName: string;
  badgeLabel: string;
  userLabel: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navItems = variant === "agency" ? agencyNavItems : clinicNavItems;

  const brand = (
    <div className="flex items-center gap-2 px-2 py-1">
      <Stethoscope className="h-5 w-5 text-sidebar-primary" />
      <span className="font-semibold text-sidebar-foreground">{appName}</span>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 md:flex">
        {brand}
        <div className="mt-6 flex-1">
          <SidebarNav items={navItems} />
        </div>
        <Badge variant="secondary" className="mx-2 w-fit">
          {badgeLabel}
        </Badge>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-background px-4">
          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger render={<Button variant="ghost" size="icon" />}>
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-64 bg-sidebar p-3 [&_svg]:text-sidebar-foreground"
              >
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                {brand}
                <div className="mt-6" onClick={() => setOpen(false)}>
                  <SidebarNav items={navItems} />
                </div>
              </SheetContent>
            </Sheet>
            <span className="font-semibold">{appName}</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {userLabel}
            </span>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 bg-muted/20 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
