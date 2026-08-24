"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { SidebarWhatsAppStatus } from "@/components/layout/sidebar-whatsapp-status";
import { SidebarMessageBalance } from "@/components/layout/sidebar-message-balance";
import { agencyNavGroups, clinicNavGroups } from "@/components/layout/nav-items";
import { LogoutButton } from "@/components/logout-button";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { InstallAppBanner } from "@/components/pwa/install-app-banner";
import { NotificationPermissionBanner } from "@/components/pwa/notification-permission-banner";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export function AppShell({
  variant,
  appName,
  badgeLabel,
  userLabel,
  whatsapp,
  messageBalance,
  children,
}: {
  variant: "agency" | "clinic";
  appName: string;
  badgeLabel: string;
  userLabel: string;
  whatsapp: { connected: number; total: number };
  messageBalance?: {
    hasActivePlan: boolean;
    messagesRemaining: number;
    includedMessages: number;
  } | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navGroups = variant === "agency" ? agencyNavGroups : clinicNavGroups;

  // The inbox gets a real-WhatsApp full-bleed treatment on phones -- no
  // outer app chrome competing with it, no card padding/border, no dead
  // space. Desktop keeps the normal dashboard-with-sidebar look always.
  const isMobileInbox = variant === "clinic" && pathname.startsWith("/clinic/inbox");

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
          {variant === "clinic" && messageBalance && (
            <SidebarMessageBalance
              hasActivePlan={messageBalance.hasActivePlan}
              messagesRemaining={messageBalance.messagesRemaining}
              includedMessages={messageBalance.includedMessages}
            />
          )}
          <Badge variant="secondary" className="w-fit">
            {badgeLabel}
          </Badge>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "flex h-14 items-center justify-between border-b bg-background px-4",
            isMobileInbox && "hidden md:flex"
          )}
        >
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
                  {variant === "clinic" && messageBalance && (
                    <SidebarMessageBalance
                      hasActivePlan={messageBalance.hasActivePlan}
                      messagesRemaining={messageBalance.messagesRemaining}
                      includedMessages={messageBalance.includedMessages}
                    />
                  )}
                  {variant === "clinic" && <InstallAppButton className="w-full" />}
                </div>
              </SheetContent>
            </Sheet>
            <span className="truncate text-[15px] font-semibold">{appName}</span>
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
        <main
          className={cn(
            "flex-1 bg-background",
            isMobileInbox
              ? "flex min-h-0 flex-col overflow-hidden p-0 pb-16 md:p-6 md:pb-6"
              : cn("p-4 md:p-6", variant === "clinic" && "pb-20 md:pb-6")
          )}
        >
          {variant === "clinic" && !isMobileInbox && (
            <div className="mb-4 flex flex-col gap-2">
              <InstallAppBanner />
              <NotificationPermissionBanner />
            </div>
          )}
          {children}
        </main>
      </div>

      {variant === "clinic" && <MobileBottomNav />}
    </div>
  );
}
