import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PrescriptionUploadForm } from "@/components/clinic/prescription-upload-form";
import type { Doctor, Patient } from "@/lib/types";

export default async function NewPrescriptionPage() {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) redirect("/clinic/dashboard");

  const supabase = await createClient();

  const [{ data: patients }, { data: doctors }] = await Promise.all([
    supabase
      .from("patients")
      .select("*")
      .order("name")
      .returns<Patient[]>(),
    supabase
      .from("doctors")
      .select("*")
      .order("name")
      .returns<Doctor[]>(),
  ]);

  return (
    <div>
      <PageHeader
        title="Upload Prescription"
        description="Select a patient and doctor, then attach the prescription file."
      />
      <Card className="max-w-xl">
        <CardContent className="pt-6">
          <PrescriptionUploadForm
            clinicId={profile.clinic_id}
            patients={patients ?? []}
            doctors={doctors ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
