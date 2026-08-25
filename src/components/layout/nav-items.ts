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
  IndianRupee,
  MessageSquareText,
  LayoutTemplate,
} from "lucide-react";
import type { NavItem } from "@/components/layout/sidebar-nav";

export type NavGroup = { label?: string; items: NavItem[] };

export const agencyNavGroups: NavGroup[] = [
  {
    items: [{ label: "Dashboard", href: "/agency/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Manage",
    items: [
      { label: "Clinics", href: "/agency/clinics", icon: Building2 },
      { label: "Patients", href: "/agency/patients", icon: Users },
      { label: "Prescriptions", href: "/agency/prescriptions", icon: FileText },
    ],
  },
  {
    label: "Communication",
    items: [
      { label: "Reminders", href: "/agency/reminders", icon: Bell },
      { label: "Follow-ups", href: "/agency/follow-ups", icon: CalendarClock },
      { label: "Conversations", href: "/agency/conversations", icon: MessageSquare },
      { label: "Templates", href: "/agency/templates", icon: LayoutTemplate },
    ],
  },
  {
    items: [
      { label: "Message Usage", href: "/agency/usage", icon: MessageSquareText },
      { label: "Billing & Margins", href: "/agency/billing", icon: IndianRupee },
      { label: "Settings", href: "/agency/settings", icon: Settings },
    ],
  },
];

export const clinicNavGroups: NavGroup[] = [
  {
    items: [{ label: "Dashboard", href: "/clinic/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Patient Care",
    items: [
      { label: "Patients", href: "/clinic/patients", icon: Users },
      { label: "Prescriptions", href: "/clinic/prescriptions", icon: FileText },
      { label: "Reminders", href: "/clinic/reminders", icon: Bell },
      { label: "Follow-ups", href: "/clinic/follow-ups", icon: CalendarClock },
    ],
  },
  {
    label: "Communication",
    items: [
      { label: "Inbox", href: "/clinic/inbox", icon: Inbox },
      { label: "Message Usage", href: "/clinic/usage", icon: MessageSquareText },
    ],
  },
];

// Flat fallbacks, still exported in case anything imports the old shape.
export const agencyNavItems: NavItem[] = agencyNavGroups.flatMap((g) => g.items);
export const clinicNavItems: NavItem[] = clinicNavGroups.flatMap((g) => g.items);
