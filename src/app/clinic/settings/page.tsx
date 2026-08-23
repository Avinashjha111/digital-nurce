import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { ChatAppearanceForm } from "@/components/clinic/chat-appearance-form";
import type { ClinicChatAppearance } from "@/lib/types";

export default async function ClinicSettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.clinic_id) redirect("/clinic/dashboard");

  const supabase = await createClient();
  const { data: appearance } = await supabase
    .from("clinic_chat_appearance")
    .select("*")
    .eq("clinic_id", profile.clinic_id)
    .maybeSingle<ClinicChatAppearance>();

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Customize how your WhatsApp inbox looks for your clinic."
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Chat Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <ChatAppearanceForm
            clinicId={profile.clinic_id}
            theme={appearance?.theme ?? "default"}
            wallpaperUrl={appearance?.wallpaper_url ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
