"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { normalizePhone } from "@/lib/phone";
import { createClinicSubaccount } from "@/lib/twilio/subaccounts";
import { registerSender, getSenderStatus, verifySenderOtp } from "@/lib/twilio/senders";

export type ConnectWhatsAppState = {
  error: string | null;
  success?: boolean;
  senderStatus?: string;
};

const connectSchema = z.object({
  waba_id: z.string().trim().min(1, "WhatsApp Business Account ID is required"),
  phone_e164: z
    .string()
    .trim()
    .min(1, "WhatsApp number is required")
    .transform(normalizePhone)
    .refine((v) => v.length >= 10, "Enter a valid WhatsApp number with country code"),
});

export type ConnectWhatsAppInput = { wabaId: string; phoneE164: string };

// Twilio ISV / Embedded Signup connect flow: the browser side (see
// ConnectWhatsAppDialog) runs Facebook's Embedded Signup popup and hands
// us back { waba_id } from its FINISH postMessage event, plus the clinic's
// WhatsApp number collected as a plain form field (Twilio's own guidance:
// Embedded Signup alone doesn't guarantee the E.164 number in the exact
// shape the Senders API needs). This creates a dedicated Twilio subaccount
// for the clinic, then registers that number as a WhatsApp Sender under it.
// Registration is asynchronous on Twilio's side -- this returns whatever
// status Twilio gives immediately, and checkWhatsAppSenderStatus() below
// is what the UI polls with until it reaches "ONLINE".
export async function connectWhatsApp(
  clinicId: string,
  input: ConnectWhatsAppInput
): Promise<ConnectWhatsAppState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "agency_admin") {
    return { error: "Only agency admins can connect WhatsApp." };
  }

  const parsed = connectSchema.safeParse({
    waba_id: input.wabaId,
    phone_e164: input.phoneE164,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();

  // Ownership is enforced through the caller's own RLS-bound session: this
  // returns nothing if the clinic doesn't exist or isn't theirs.
  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, name, activation_status")
    .eq("id", clinicId)
    .single();

  if (!clinic) {
    return { error: "Clinic not found or you do not own it." };
  }

  // Defense-in-depth: the UI already hides this behind the pending-activation
  // blur, but a self-signed-up clinic that hasn't paid yet must not be able
  // to get WhatsApp connected server-side either.
  if (clinic.activation_status === "pending_activation") {
    return { error: "Activate this clinic (send a payment link) before connecting WhatsApp." };
  }

  // Check if this clinic already has incomplete/pending credentials (idempotency)
  const admin = createAdminClient();
  const { data: existingCred } = await admin
    .from("whatsapp_credentials")
    .select("twilio_subaccount_sid, twilio_subaccount_auth_token, sender_status, updated_at")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  // If this clinic was previously flagged for manual recovery after a subaccount
  // persistence failure, block automatic re-creation to prevent duplicate accounts.
  if (
    existingCred?.sender_status === "manual_recovery_required" ||
    existingCred?.sender_status === "subaccount_persist_failed"
  ) {
    return {
      error:
        "WhatsApp subaccount setup requires manual assistance. Please contact support before retrying.",
    };
  }

  let subaccountSid = existingCred?.twilio_subaccount_sid;
  let subaccountAuthToken = existingCred?.twilio_subaccount_auth_token;

  // Only create a new subaccount if one does not exist
  if (!subaccountSid || !subaccountAuthToken) {
    let claimAcquired = false;

    if (!existingCred) {
      // Case A: No row exists in whatsapp_credentials yet.
      // Attempt atomic INSERT of placeholder claim using clinic_id PRIMARY KEY.
      const { error: insertError } = await admin
        .from("whatsapp_credentials")
        .insert({
          clinic_id: clinicId,
          waba_id: parsed.data.waba_id,
          sender_status: "claiming",
          updated_at: new Date().toISOString(),
        });

      if (!insertError) {
        claimAcquired = true;
      } else if (insertError.code === "23505") {
        // Primary key conflict: another concurrent request inserted first
        claimAcquired = false;
      } else {
        return { error: `Database error during provisioning claim: ${insertError.message}` };
      }
    } else {
      // Case B: Row exists but twilio_subaccount_sid is NULL.
      // Acquire claim using atomic conditional UPDATE.
      // Stale claim recovery: ONLY recover if status was 'claiming' or 'failed',
      // and NEVER recover if status is 'manual_recovery_required' or 'subaccount_persist_failed'.
      const staleThreshold = new Date(Date.now() - 60 * 1000).toISOString();
      const { data: claimedRow, error: updateError } = await admin
        .from("whatsapp_credentials")
        .update({
          waba_id: parsed.data.waba_id,
          sender_status: "claiming",
          updated_at: new Date().toISOString(),
        })
        .eq("clinic_id", clinicId)
        .is("twilio_subaccount_sid", null)
        .neq("sender_status", "manual_recovery_required")
        .neq("sender_status", "subaccount_persist_failed")
        .or(`sender_status.neq.claiming,updated_at.lt.${staleThreshold}`)
        .select("clinic_id, sender_status")
        .maybeSingle();

      if (updateError) {
        return { error: `Database error during provisioning claim: ${updateError.message}` };
      }

      claimAcquired = !!claimedRow;
    }

    if (!claimAcquired) {
      // Lost the race or another request is actively provisioning
      const { data: refreshedCred } = await admin
        .from("whatsapp_credentials")
        .select("twilio_subaccount_sid, twilio_subaccount_auth_token, sender_status")
        .eq("clinic_id", clinicId)
        .maybeSingle();

      if (
        refreshedCred?.sender_status === "manual_recovery_required" ||
        refreshedCred?.sender_status === "subaccount_persist_failed"
      ) {
        return {
          error:
            "WhatsApp subaccount setup requires manual assistance. Please contact support before retrying.",
        };
      }

      if (refreshedCred?.twilio_subaccount_sid && refreshedCred?.twilio_subaccount_auth_token) {
        subaccountSid = refreshedCred.twilio_subaccount_sid;
        subaccountAuthToken = refreshedCred.twilio_subaccount_auth_token;
      } else {
        return {
          error: "WhatsApp setup is already in progress. Please wait a few seconds and try again.",
        };
      }
    } else {
      // Exclusively acquired claim -- call Twilio to create subaccount
      const subaccount = await createClinicSubaccount(clinic.name);
      if (!subaccount.ok) {
        // Twilio subaccount was never created -- reset claim to 'failed' for future retries
        await admin
          .from("whatsapp_credentials")
          .update({ sender_status: "failed", updated_at: new Date().toISOString() })
          .eq("clinic_id", clinicId)
          .eq("sender_status", "claiming");

        return { error: `Could not create Twilio subaccount: ${subaccount.error}` };
      }

      subaccountSid = subaccount.sid;
      subaccountAuthToken = subaccount.authToken;

      // Persist credentials with up to 3 immediate retry attempts
      let persistSuccess = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const { error: persistError } = await admin
          .from("whatsapp_credentials")
          .update({
            twilio_subaccount_sid: subaccountSid,
            twilio_subaccount_auth_token: subaccountAuthToken,
            waba_id: parsed.data.waba_id,
            sender_status: "subaccount_created",
            updated_at: new Date().toISOString(),
          })
          .eq("clinic_id", clinicId);

        if (!persistError) {
          persistSuccess = true;
          break;
        }

        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
      }

      if (!persistSuccess) {
        // Subaccount was created on Twilio, but writing to DB failed even after retries.
        // Lock the clinic in 'manual_recovery_required' so automatic provisioning NEVER creates a second subaccount.
        await admin
          .from("whatsapp_credentials")
          .update({
            sender_status: "manual_recovery_required",
            updated_at: new Date().toISOString(),
          })
          .eq("clinic_id", clinicId);

        return {
          error:
            "WhatsApp subaccount was provisioned with Twilio, but saving credentials failed. Please contact support to complete setup.",
        };
      }
    }
  }

  // At this point, subaccount credentials are guaranteed persisted in DB.
  // Proceed with sender registration.
  const sender = await registerSender({
    subaccountSid,
    subaccountAuthToken,
    wabaId: parsed.data.waba_id,
    phoneE164: parsed.data.phone_e164,
    profileName: clinic.name,
  });

  if (!sender.ok) {
    // Preserve subaccount SID and auth token; only mark sender_status as failed
    await admin
      .from("whatsapp_credentials")
      .update({
        sender_status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("clinic_id", clinicId);

    return { error: `Could not register WhatsApp sender: ${sender.error}` };
  }

  // Sender registered successfully (or pending)
  const { error: credError } = await admin.from("whatsapp_credentials").update({
    twilio_sender_sid: sender.sender.sid,
    whatsapp_number_e164: parsed.data.phone_e164,
    waba_id: parsed.data.waba_id,
    sender_status: sender.sender.status,
    updated_at: new Date().toISOString(),
  }).eq("clinic_id", clinicId);

  if (credError) {
    if (credError.code === "23505") {
      return {
        error:
          "This WhatsApp number is already connected to a different clinic. Each clinic needs its own number.",
      };
    }
    return { error: `Failed to store credentials: ${credError.message}` };
  }

  const online = sender.sender.status.toUpperCase() === "ONLINE";
  const { error: updateError } = await supabase
    .from("clinics")
    .update({
      whatsapp_status: online ? "connected" : "not_connected",
      whatsapp_number: `+${parsed.data.phone_e164}`,
      whatsapp_last_checked_at: new Date().toISOString(),
    })
    .eq("id", clinicId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath(`/agency/clinics/${clinicId}`);
  return { error: null, success: true, senderStatus: sender.sender.status };
}

export type SenderStatusState = { error: string | null; senderStatus?: string };

// Twilio registers a Sender asynchronously -- this is what the "Check
// status" button in the connect UI calls to re-poll and flip the clinic
// over to 'connected' once Twilio reports "ONLINE".
export async function checkWhatsAppSenderStatus(clinicId: string): Promise<SenderStatusState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "agency_admin") {
    return { error: "Only agency admins can check WhatsApp status." };
  }

  const admin = createAdminClient();
  const { data: credential } = await admin
    .from("whatsapp_credentials")
    .select("twilio_subaccount_sid, twilio_subaccount_auth_token, twilio_sender_sid")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (!credential?.twilio_sender_sid) {
    return { error: "This clinic has not started connecting WhatsApp yet." };
  }

  const sender = await getSenderStatus({
    subaccountSid: credential.twilio_subaccount_sid,
    subaccountAuthToken: credential.twilio_subaccount_auth_token,
    senderSid: credential.twilio_sender_sid,
  });
  if (!sender.ok) {
    return { error: sender.error };
  }

  await admin
    .from("whatsapp_credentials")
    .update({ sender_status: sender.sender.status, updated_at: new Date().toISOString() })
    .eq("clinic_id", clinicId);

  const online = sender.sender.status.toUpperCase() === "ONLINE";
  const supabase = await createClient();
  await supabase
    .from("clinics")
    .update({
      whatsapp_status: online ? "connected" : "not_connected",
      whatsapp_last_checked_at: new Date().toISOString(),
    })
    .eq("id", clinicId);

  revalidatePath(`/agency/clinics/${clinicId}`);
  return { error: null, senderStatus: sender.sender.status };
}

// Only needed if Twilio's response after registerSender() asks for phone
// verification -- built defensively since it's unclear from available docs
// whether this step is always required.
export async function submitWhatsAppSenderOtp(
  clinicId: string,
  code: string
): Promise<SenderStatusState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "agency_admin") {
    return { error: "Only agency admins can verify WhatsApp." };
  }

  const admin = createAdminClient();
  const { data: credential } = await admin
    .from("whatsapp_credentials")
    .select("twilio_subaccount_sid, twilio_subaccount_auth_token, twilio_sender_sid")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (!credential?.twilio_sender_sid) {
    return { error: "This clinic has not started connecting WhatsApp yet." };
  }

  const sender = await verifySenderOtp({
    subaccountSid: credential.twilio_subaccount_sid,
    subaccountAuthToken: credential.twilio_subaccount_auth_token,
    senderSid: credential.twilio_sender_sid,
    verificationCode: code,
  });
  if (!sender.ok) {
    return { error: sender.error };
  }

  await admin
    .from("whatsapp_credentials")
    .update({ sender_status: sender.sender.status, updated_at: new Date().toISOString() })
    .eq("clinic_id", clinicId);

  revalidatePath(`/agency/clinics/${clinicId}`);
  return { error: null, senderStatus: sender.sender.status };
}

export type SetReminderTemplateResult = { error: string | null };

// Milestone 8: which approved template the scheduler sends reminders
// with. Reminders always go out as a template (they're business-initiated
// on a schedule, not a reply, so they're outside WhatsApp's 24h free-text
// window) -- the agency picks which one, same ownership as everything
// else template-related.
export async function setReminderTemplate(
  clinicId: string,
  templateId: string | null
): Promise<SetReminderTemplateResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "agency_admin") {
    return { error: "Only agency admins can set the reminder template." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("clinics")
    .update({ reminder_template_id: templateId })
    .eq("id", clinicId);

  if (error) return { error: error.message };

  revalidatePath(`/agency/clinics/${clinicId}`);
  return { error: null };
}

export type SetFollowUpTemplateResult = { error: string | null };

// Milestone 9: which approved template the scheduler sends the follow-up
// nudge with, same reasoning as setReminderTemplate.
export async function setFollowUpTemplate(
  clinicId: string,
  templateId: string | null
): Promise<SetFollowUpTemplateResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "agency_admin") {
    return { error: "Only agency admins can set the follow-up template." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("clinics")
    .update({ follow_up_template_id: templateId })
    .eq("id", clinicId);

  if (error) return { error: error.message };

  revalidatePath(`/agency/clinics/${clinicId}`);
  return { error: null };
}
