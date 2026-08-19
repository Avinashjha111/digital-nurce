import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Bell,
  CalendarClock,
  MessageSquare,
  Settings,
  Inbox,
} from "lucide-react";
import type { NavItem } from "@/components/layout/sidebar-nav";

export const agencyNavItems: NavItem[] = [
  { label: "Dashboard", href: "/agency/dashboard", icon: LayoutDashboard },
  { label: "Clinics", href: "/agency/clinics", icon: Building2 },
  { label: "Patients", href: "/agency/patients", icon: Users },
  { label: "Prescriptions", href: "/agency/prescriptions", icon: FileText },
  { label: "Reminders", href: "/agency/reminders", icon: Bell },
  { label: "Follow-ups", href: "/agency/follow-ups", icon: CalendarClock },
  { label: "Conversations", href: "/agency/conversations", icon: MessageSquare },
  { label: "Settings", href: "/agency/settings", icon: Settings },
];

export const clinicNavItems: NavItem[] = [
  { label: "Dashboard", href: "/clinic/dashboard", icon: LayoutDashboard },
  { label: "Patients", href: "/clinic/patients", icon: Users },
  { label: "Prescriptions", href: "/clinic/prescriptions", icon: FileText },
  { label: "Reminders", href: "/clinic/reminders", icon: Bell },
  { label: "Follow-ups", href: "/clinic/follow-ups", icon: CalendarClock },
  { label: "Inbox", href: "/clinic/inbox", icon: Inbox },
];
