import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { AppShell } from "@/components/layout/app-shell";

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
      variant="agency"
      appName="Digital Nurse"
      badgeLabel="Agency Admin"
      userLabel={profile.email}
    >
      {children}
    </AppShell>
  );
}
