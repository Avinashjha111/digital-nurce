import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.role !== "agency_admin") redirect("/clinic/dashboard");

  const supabase = await createClient();
  const { data: clinics } = await supabase.from("clinics").select("whatsapp_status");
  const total = clinics?.length ?? 0;
  const connected = clinics?.filter((c) => c.whatsapp_status === "connected").length ?? 0;

  return (
    <AppShell
      variant="agency"
      appName="Digital Nurse"
      badgeLabel="Agency Admin"
      userLabel={profile.email}
      whatsapp={{ connected, total }}
    >
      {children}
    </AppShell>
  );
}
