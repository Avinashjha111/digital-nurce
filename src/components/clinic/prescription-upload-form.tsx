"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createPrescriptionRecord } from "@/lib/actions/prescriptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Doctor, Patient } from "@/lib/types";

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.pdf";
const MAX_SIZE_MB = 10;

export function PrescriptionUploadForm({
  clinicId,
  patients,
  doctors,
}: {
  clinicId: string;
  patients: Patient[];
  doctors: Doctor[];
}) {
  const router = useRouter();
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!patientId) return setError("Select a patient.");
    if (!doctorId) return setError("Select a doctor.");
    if (!file) return setError("Choose a prescription file.");
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return setError("Only JPG, JPEG, PNG or PDF files are supported.");
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return setError(`File must be under ${MAX_SIZE_MB}MB.`);
    }

    setPending(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${clinicId}/${patientId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("prescriptions")
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const result = await createPrescriptionRecord({
        patient_id: patientId,
        doctor_id: doctorId,
        file_path: path,
        file_type: file.type,
      });

      if (result.error || !result.id) {
        setError(result.error ?? "Failed to save prescription.");
        return;
      }

      router.push(`/clinic/prescriptions/${result.id}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Patient</Label>
        <Select value={patientId} onValueChange={(value) => setPatientId(value ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select patient">
              {(value: string | null) =>
                patients.find((p) => p.id === value)?.name ?? "Select patient"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {patients.map((patient) => (
              <SelectItem key={patient.id} value={patient.id}>
                {patient.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Doctor</Label>
        <Select value={doctorId} onValueChange={(value) => setDoctorId(value ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select doctor">
              {(value: string | null) =>
                doctors.find((d) => d.id === value)?.name ?? "Select doctor"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {doctors.map((doctor) => (
              <SelectItem key={doctor.id} value={doctor.id}>
                {doctor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="file">Prescription file (JPG, PNG or PDF)</Label>
        <Input
          id="file"
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Uploading..." : "Upload Prescription"}
      </Button>
    </form>
  );
}
