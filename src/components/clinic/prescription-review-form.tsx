"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import {
  submitPrescriptionReview,
  type SubmitPrescriptionReviewInput,
} from "@/lib/actions/prescriptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { Prescription, PrescriptionMedicine } from "@/lib/types";

type MedicineRow = {
  key: string;
  id?: string;
  name: string;
  dosage: string;
  frequency: string;
  durationDays: string;
  timings: string;
  instruction: string;
  needsReview: boolean;
};

function toRow(medicine: PrescriptionMedicine): MedicineRow {
  return {
    key: medicine.id,
    id: medicine.id,
    name: medicine.name,
    dosage: medicine.dosage ?? "",
    frequency: medicine.frequency ?? "",
    durationDays: medicine.duration_days != null ? String(medicine.duration_days) : "",
    timings: medicine.timings?.join(", ") ?? "",
    instruction: medicine.instruction ?? "",
    needsReview: medicine.needs_review,
  };
}

function emptyRow(): MedicineRow {
  return {
    key: crypto.randomUUID(),
    name: "",
    dosage: "",
    frequency: "",
    durationDays: "",
    timings: "",
    instruction: "",
    needsReview: false,
  };
}

export function PrescriptionReviewForm({
  prescription,
  medicines,
}: {
  prescription: Prescription;
  medicines: PrescriptionMedicine[];
}) {
  const [patientName, setPatientName] = useState(prescription.extracted_patient_name ?? "");
  const [followUpRequired, setFollowUpRequired] = useState(
    prescription.follow_up_required ?? false
  );
  const [followUpDaysAfter, setFollowUpDaysAfter] = useState(
    prescription.follow_up_days_after != null ? String(prescription.follow_up_days_after) : ""
  );
  const [followUpInstruction, setFollowUpInstruction] = useState(
    prescription.follow_up_instruction ?? ""
  );
  const [rows, setRows] = useState<MedicineRow[]>(
    medicines.length > 0 ? medicines.map(toRow) : [emptyRow()]
  );
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateRow(key: string, patch: Partial<MedicineRow>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeRow(row: MedicineRow) {
    if (row.id) setRemovedIds((prev) => [...prev, row.id!]);
    setRows((prev) => prev.filter((r) => r.key !== row.key));
  }

  function submit(decision: "approved" | "rejected") {
    setError(null);

    const input: SubmitPrescriptionReviewInput = {
      prescriptionId: prescription.id,
      decision,
      patientName,
      followUpRequired,
      followUpDaysAfter: followUpDaysAfter ? Number(followUpDaysAfter) : null,
      followUpInstruction,
      removedMedicineIds: removedIds,
      medicines: rows
        .filter((row) => row.name.trim().length > 0)
        .map((row) => ({
          id: row.id,
          name: row.name,
          dosage: row.dosage,
          frequency: row.frequency,
          durationDays: row.durationDays ? Number(row.durationDays) : null,
          timings: row.timings,
          instruction: row.instruction,
        })),
    };

    startTransition(async () => {
      const result = await submitPrescriptionReview(input);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="patient-name" className="flex items-center gap-1.5">
          Patient name
          {prescription.patient_name_needs_review && <NeedsReview />}
        </Label>
        <Input
          id="patient-name"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          placeholder="Confirm the patient's name"
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="font-medium">Medicines</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setRows((prev) => [...prev, emptyRow()])}
          >
            <Plus className="h-3.5 w-3.5" />
            Add medicine
          </Button>
        </div>

        {rows.map((row) => (
          <div key={row.key} className="flex flex-col gap-2 rounded-md border p-3">
            <div className="flex items-start gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Name
                  {row.needsReview && <NeedsReview />}
                </Label>
                <Input
                  value={row.name}
                  onChange={(e) => updateRow(row.key, { name: e.target.value })}
                  placeholder="Medicine name"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="mt-5 text-destructive"
                aria-label="Remove medicine"
                onClick={() => removeRow(row)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Dosage</Label>
                <Input
                  value={row.dosage}
                  onChange={(e) => updateRow(row.key, { dosage: e.target.value })}
                  placeholder="1 tablet"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Frequency</Label>
                <Input
                  value={row.frequency}
                  onChange={(e) => updateRow(row.key, { frequency: e.target.value })}
                  placeholder="3 times daily"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Duration (days)</Label>
                <Input
                  type="number"
                  min={1}
                  value={row.durationDays}
                  onChange={(e) => updateRow(row.key, { durationDays: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Timings</Label>
                <Input
                  value={row.timings}
                  onChange={(e) => updateRow(row.key, { timings: e.target.value })}
                  placeholder="08:00, 14:00, 20:00"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Instruction</Label>
              <Input
                value={row.instruction}
                onChange={(e) => updateRow(row.key, { instruction: e.target.value })}
                placeholder="After food"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-md border p-3">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="size-4 rounded border-input accent-primary"
            checked={followUpRequired}
            onChange={(e) => setFollowUpRequired(e.target.checked)}
          />
          Follow-up required
          {prescription.follow_up_needs_review && <NeedsReview />}
        </Label>

        {followUpRequired && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Days after visit</Label>
              <Input
                type="number"
                min={1}
                value={followUpDaysAfter}
                onChange={(e) => setFollowUpDaysAfter(e.target.value)}
              />
            </div>
            <div className="flex flex-[2] flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Instruction</Label>
              <Textarea
                value={followUpInstruction}
                onChange={(e) => setFollowUpInstruction(e.target.value)}
                rows={1}
              />
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() => submit("approved")}
          className="flex-1"
        >
          {pending ? "Saving..." : "Approve"}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={pending}
          onClick={() => submit("rejected")}
          className="flex-1"
        >
          Reject
        </Button>
      </div>
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
