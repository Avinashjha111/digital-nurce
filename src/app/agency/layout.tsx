import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Bell,
  CalendarClock,
  MessageSquare,
  Settings,
} from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/sidebar-nav";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/agency/dashboard", icon: LayoutDashboard },
  { label: "Clinics", href: "/agency/clinics", icon: Building2 },
  { label: "Patients", href: "/agency/patients", icon: Users },
  { label: "Prescriptions", href: "/agency/prescriptions", icon: FileText },
  { label: "Reminders", href: "/agency/reminders", icon: Bell },
  { label: "Follow-ups", href: "/agency/follow-ups", icon: CalendarClock },
  { label: "Conversations", href: "/agency/conversations", icon: MessageSquare },
  { label: "Settings", href: "/agency/settings", icon: Settings },
];

export default async function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.role !== "agency_admin") redirect("/clinic/dashboard");

  return (
    <AppShell
      navItems={navItems}
      appName="Digital Nurse"
      badgeLabel="Agency Admin"
      userLabel={profile.email}
    >
      {children}
    </AppShell>
  );
}
