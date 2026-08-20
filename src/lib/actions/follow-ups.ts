"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";

export type RequestAppointmentResult = { error: string | null };

const requestAppointmentSchema = z.object({
  followUpId: z.string().uuid(),
  preferredDate: z.string().min(1, "Pick a preferred date."),
  preferredTime: z.string().trim().min(1, "Pick a preferred time."),
});

// Milestone 9's "basic appointment request": clinic staff record the date
// and time slot they agreed on with the patient (over the phone or a
// WhatsApp reply) -- this is deliberately not a real availability/booking
// system, just enough to prove the follow-up -> appointment journey.
export async function requestAppointment(
  followUpId: string,
  preferredDate: string,
  preferredTime: string
): Promise<RequestAppointmentResult> {
  const profile = await getCurrentProfile();
  if (
    !profile ||
    (profile.role !== "clinic_admin" && profile.role !== "receptionist") ||
    !profile.clinic_id
  ) {
    return { error: "Only clinic staff can request an appointment." };
  }

  const parsed = requestAppointmentSchema.safeParse({
    followUpId,
    preferredDate,
    preferredTime,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();

  // RLS-bound: only returns a row if this follow-up belongs to the
  // caller's own clinic.
  const { data: followUp } = await supabase
    .from("follow_ups")
    .select("id, clinic_id, patient_id, status")
    .eq("id", parsed.data.followUpId)
    .single();

  if (!followUp) {
    return { error: "Follow-up not found." };
  }
  if (followUp.status !== "due" && followUp.status !== "contacted") {
    return { error: "This follow-up isn't awaiting an appointment request." };
  }

  const { error: insertErr } = await supabase.from("appointment_requests").insert({
    clinic_id: followUp.clinic_id,
    patient_id: followUp.patient_id,
    follow_up_id: followUp.id,
    preferred_date: parsed.data.preferredDate,
    preferred_time: parsed.data.preferredTime,
  });
  if (insertErr) return { error: insertErr.message };

  const { error: updateErr } = await supabase
    .from("follow_ups")
    .update({ status: "appointment_requested" })
    .eq("id", followUp.id);
  if (updateErr) return { error: updateErr.message };

  revalidatePath("/clinic/follow-ups");
  revalidatePath("/agency/follow-ups");
  return { error: null };
}

export type CompleteFollowUpResult = { error: string | null };

export async function completeFollowUp(followUpId: string): Promise<CompleteFollowUpResult> {
  const profile = await getCurrentProfile();
  if (
    !profile ||
    (profile.role !== "clinic_admin" && profile.role !== "receptionist") ||
    !profile.clinic_id
  ) {
    return { error: "Only clinic staff can update follow-ups." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("follow_ups")
    .update({ status: "completed" })
    .eq("id", followUpId)
    .eq("clinic_id", profile.clinic_id);

  if (error) return { error: error.message };

  revalidatePath("/clinic/follow-ups");
  revalidatePath("/agency/follow-ups");
  return { error: null };
}
