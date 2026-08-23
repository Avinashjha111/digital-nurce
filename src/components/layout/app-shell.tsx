"use client";

import { useState, type ReactNode } from "react";
import { Menu, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { SidebarWhatsAppStatus } from "@/components/layout/sidebar-whatsapp-status";
import { agencyNavGroups, clinicNavGroups } from "@/components/layout/nav-items";
import { LogoutButton } from "@/components/logout-button";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { InstallAppBanner } from "@/components/pwa/install-app-banner";

export function AppShell({
  variant,
  appName,
  badgeLabel,
  userLabel,
  whatsapp,
  children,
}: {
  variant: "agency" | "clinic";
  appName: string;
  badgeLabel: string;
  userLabel: string;
  whatsapp: { connected: number; total: number };
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navGroups = variant === "agency" ? agencyNavGroups : clinicNavGroups;

  const brand = (
    <div className="flex items-center gap-2 px-2 py-1">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/15">
        <Stethoscope className="h-4 w-4 text-sidebar-primary" />
      </span>
      <span className="text-[15px] font-semibold text-sidebar-foreground">{appName}</span>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 md:flex">
        {brand}
        <div className="mt-6 flex-1">
          <SidebarNav groups={navGroups} />
        </div>
        <div className="flex flex-col gap-2 px-1">
          <SidebarWhatsAppStatus connected={whatsapp.connected} total={whatsapp.total} mode={variant === "agency" ? "aggregate" : "single"} />
          <Badge variant="secondary" className="w-fit">
            {badgeLabel}
          </Badge>
        </div>
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
                  <SidebarNav groups={navGroups} />
                </div>
                <div className="mt-4 flex flex-col gap-2 px-1">
                  <SidebarWhatsAppStatus connected={whatsapp.connected} total={whatsapp.total} mode={variant === "agency" ? "aggregate" : "single"} />
                  {variant === "clinic" && <InstallAppButton className="w-full" />}
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
            {variant === "clinic" && <InstallAppButton />}
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 bg-background p-4 md:p-6">
          {variant === "clinic" && (
            <div className="mb-4">
              <InstallAppBanner />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
