import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrescriptionStatusBadge } from "@/components/prescription-status-badge";
import type { Prescription } from "@/lib/types";

export default async function PrescriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: prescription } = await supabase
    .from("prescriptions")
    .select("*")
    .eq("id", id)
    .single<Prescription>();

  if (!prescription) notFound();

  const [{ data: patient }, { data: doctor }, { data: signed }] = await Promise.all([
    supabase.from("patients").select("name").eq("id", prescription.patient_id).single(),
    supabase.from("doctors").select("name").eq("id", prescription.doctor_id).single(),
    supabase.storage.from("prescriptions").createSignedUrl(prescription.file_path, 300),
  ]);

  const isImage = prescription.file_type.startsWith("image/");
  const fileUrl = signed?.signedUrl;

  return (
    <div>
      <PageHeader
        title={patient?.name ?? "Prescription"}
        description="Prescription details."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <Row label="Doctor" value={doctor?.name ?? "—"} />
            <Row label="Status" value={<PrescriptionStatusBadge status={prescription.status} />} />
            <Row
              label="Uploaded"
              value={new Date(prescription.created_at).toLocaleString()}
            />
            {fileUrl && (
              <Link
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Open original file
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Original Prescription
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!fileUrl ? (
              <p className="text-sm text-muted-foreground">
                Could not load the file.
              </p>
            ) : isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fileUrl}
                alt="Prescription"
                className="max-h-96 w-full rounded-md border object-contain"
              />
            ) : (
              <iframe src={fileUrl} className="h-96 w-full rounded-md border" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
