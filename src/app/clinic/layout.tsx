import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  const { data: clinic } = profile.clinic_id
    ? await supabase.from("clinics").select("whatsapp_status").eq("id", profile.clinic_id).single()
    : { data: null };

  return (
    <AppShell
      variant="clinic"
      appName="Digital Nurse"
      badgeLabel={roleLabels[profile.role] ?? profile.role}
      userLabel={profile.email}
      whatsapp={{ connected: clinic?.whatsapp_status === "connected" ? 1 : 0, total: 1 }}
    >
      {children}
    </AppShell>
  );
}
