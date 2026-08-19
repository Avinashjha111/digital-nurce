import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Bell,
  CalendarClock,
  Inbox,
} from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/sidebar-nav";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/clinic/dashboard", icon: LayoutDashboard },
  { label: "Patients", href: "/clinic/patients", icon: Users },
  { label: "Prescriptions", href: "/clinic/prescriptions", icon: FileText },
  { label: "Reminders", href: "/clinic/reminders", icon: Bell },
  { label: "Follow-ups", href: "/clinic/follow-ups", icon: CalendarClock },
  { label: "Inbox", href: "/clinic/inbox", icon: Inbox },
];

const roleLabels: Record<string, string> = {
  clinic_admin: "Clinic Admin",
  receptionist: "Receptionist",
};

export default async function ClinicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.role === "agency_admin") redirect("/agency/dashboard");

  return (
    <AppShell
      navItems={navItems}
      appName="Digital Nurse"
      badgeLabel={roleLabels[profile.role] ?? profile.role}
      userLabel={profile.email}
    >
      {children}
    </AppShell>
  );
}
