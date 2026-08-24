import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { getClinicUsageSummary } from "@/lib/billing";

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

  const supabase = await createClient();
  const [{ data: clinic }, usage] = await Promise.all([
    profile.clinic_id
      ? supabase.from("clinics").select("whatsapp_status").eq("id", profile.clinic_id).single()
      : Promise.resolve({ data: null }),
    profile.clinic_id
      ? getClinicUsageSummary(profile.clinic_id)
      : Promise.resolve(null),
  ]);

  return (
    <AppShell
      variant="clinic"
      appName="Digital Nurse"
      badgeLabel={roleLabels[profile.role] ?? profile.role}
      userLabel={profile.email}
      whatsapp={{ connected: clinic?.whatsapp_status === "connected" ? 1 : 0, total: 1 }}
      messageBalance={
        usage
          ? {
              hasActivePlan: usage.hasActivePlan,
              messagesRemaining: usage.messagesRemaining,
              includedMessages: usage.includedMessages,
            }
          : null
      }
    >
      {children}
    </AppShell>
  );
}
