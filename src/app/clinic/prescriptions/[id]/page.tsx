import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, FileText, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PrescriptionStatusBadge } from "@/components/prescription-status-badge";
import { RetryExtractionButton } from "@/components/clinic/retry-extraction-button";
import type { Prescription, PrescriptionMedicine } from "@/lib/types";

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

  const [{ data: patient }, { data: doctor }, { data: signed }, { data: medicines }] =
    await Promise.all([
      supabase.from("patients").select("name").eq("id", prescription.patient_id).single(),
      supabase.from("doctors").select("name").eq("id", prescription.doctor_id).single(),
      supabase.storage.from("prescriptions").createSignedUrl(prescription.file_path, 300),
      supabase
        .from("prescription_medicines")
        .select("*")
        .eq("prescription_id", id)
        .order("created_at")
        .returns<PrescriptionMedicine[]>(),
    ]);

  const isImage = prescription.file_type.startsWith("image/");
  const fileUrl = signed?.signedUrl;

  return (
    <div>
      <PageHeader
        title={patient?.name ?? "Prescription"}
        description="Prescription details."
        action={<PrescriptionStatusBadge status={prescription.status} />}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Original Prescription
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Row label="Doctor" value={doctor?.name ?? "—"} />
            <Row
              label="Uploaded"
              value={new Date(prescription.created_at).toLocaleString()}
            />
            {!fileUrl ? (
              <p className="text-sm text-muted-foreground">Could not load the file.</p>
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
              <Sparkles className="h-4 w-4" />
              Gemini Extraction
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            {prescription.status === "uploaded" || prescription.status === "processing" ? (
              <p className="text-muted-foreground">Extraction in progress...</p>
            ) : prescription.status === "failed" ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Extraction failed</span>
                </div>
                <p className="text-xs text-muted-foreground">{prescription.extraction_error}</p>
                <RetryExtractionButton prescriptionId={id} />
              </div>
            ) : (
              <>
                <Row
                  label="Patient name"
                  value={
                    <span className="flex items-center gap-1.5">
                      {prescription.extracted_patient_name ?? "—"}
                      {prescription.patient_name_needs_review && <NeedsReview />}
                    </span>
                  }
                />

                <div>
                  <p className="mb-2 font-medium">Medicines</p>
                  {!medicines || medicines.length === 0 ? (
                    <p className="text-muted-foreground">No medicines extracted.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {medicines.map((medicine) => (
                        <div key={medicine.id} className="rounded-md border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{medicine.name}</span>
                            {medicine.needs_review && <NeedsReview />}
                          </div>
                          <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                            {medicine.dosage && <span>Dosage: {medicine.dosage}</span>}
                            {medicine.frequency && <span>Frequency: {medicine.frequency}</span>}
                            {medicine.duration_days != null && (
                              <span>Duration: {medicine.duration_days} day(s)</span>
                            )}
                            {medicine.timings && medicine.timings.length > 0 && (
                              <span>Timings: {medicine.timings.join(", ")}</span>
                            )}
                            {medicine.instruction && <span>Instruction: {medicine.instruction}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 font-medium">Follow-up</p>
                  <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-sm text-foreground">
                      {prescription.follow_up_required === true
                        ? "Required"
                        : prescription.follow_up_required === false
                          ? "Not required"
                          : "Unclear"}
                      {prescription.follow_up_needs_review && <NeedsReview />}
                    </span>
                    {prescription.follow_up_days_after != null && (
                      <span>{prescription.follow_up_days_after} day(s) after this visit</span>
                    )}
                    {prescription.follow_up_instruction && (
                      <span>{prescription.follow_up_instruction}</span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Approve/Edit/Reject lands in Milestone 7. This is the raw AI
                  extraction -- not yet safe to use for reminders.
                </p>
              </>
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

function NeedsReview() {
  return (
    <Badge variant="outline" className="h-4 gap-1 px-1 text-[10px] text-amber-600">
      <AlertTriangle className="h-2.5 w-2.5" />
      Needs Review
    </Badge>
  );
}
