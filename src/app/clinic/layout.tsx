import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { AppShell } from "@/components/layout/app-shell";

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
      variant="clinic"
      appName="Digital Nurse"
      badgeLabel={roleLabels[profile.role] ?? profile.role}
      userLabel={profile.email}
    >
      {children}
    </AppShell>
  );
}
