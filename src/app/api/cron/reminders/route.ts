import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp/provider";
import { extractPlaceholders } from "@/lib/whatsapp/templates";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 50;

type ClaimedReminder = {
  id: string;
  clinic_id: string;
  scheduled_at: string;
  patients: { name: string; whatsapp_number: string } | null;
  prescription_medicines: {
    name: string;
    dosage: string | null;
    instruction: string | null;
  } | null;
};

// Milestone 8 scheduler. Vercel Cron (see vercel.json) hits this on a
// schedule; it can also be called manually with the same header for local
// testing. Runs with no user session -- the admin client is required here,
// not a shortcut, since there's no clinic-staff session to run it under.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Atomic claim: this UPDATE...RETURNING only matches rows still
  // 'scheduled' at the moment it runs, so two overlapping invocations
  // can't both grab the same reminder -- that's what keeps this
  // idempotent under retries/overlap, not any locking we do ourselves.
  const { data: claimed, error: claimErr } = await admin
    .from("reminders")
    .update({ status: "processing" })
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .select(
      "id, clinic_id, scheduled_at, patients(name, whatsapp_number), prescription_medicines(name, dosage, instruction)"
    )
    .limit(BATCH_SIZE)
    .returns<ClaimedReminder[]>();

  if (claimErr) {
    return NextResponse.json({ error: claimErr.message }, { status: 500 });
  }
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const clinicIds = [...new Set(claimed.map((r) => r.clinic_id))];

  const [{ data: clinics }, { data: credentials }] = await Promise.all([
    admin
      .from("clinics")
      .select("id, reminder_template_id")
      .in("id", clinicIds),
    admin
      .from("whatsapp_credentials")
      .select("clinic_id, phone_number_id, access_token")
      .in("clinic_id", clinicIds),
  ]);

  const templateIds = [
    ...new Set(
      (clinics ?? [])
        .map((c) => c.reminder_template_id)
        .filter((id): id is string => !!id)
    ),
  ];
  const { data: templates } =
    templateIds.length > 0
      ? await admin
          .from("whatsapp_templates")
          .select("id, name, language, body_text, header_type, header_text, status")
          .in("id", templateIds)
      : { data: [] };

  const clinicById = new Map((clinics ?? []).map((c) => [c.id, c]));
  const credentialByClinic = new Map((credentials ?? []).map((c) => [c.clinic_id, c]));
  const templateById = new Map((templates ?? []).map((t) => [t.id, t]));

  let sent = 0;
  let failed = 0;

  for (const reminder of claimed) {
    const result = await sendOne(reminder, clinicById, credentialByClinic, templateById);
    if (result.ok) {
      sent++;
      await admin
        .from("reminders")
        .update({ status: "sent", provider_message_id: result.providerMessageId })
        .eq("id", reminder.id);
    } else {
      failed++;
      await admin
        .from("reminders")
        .update({ status: "failed", error: result.error })
        .eq("id", reminder.id);
    }
  }

  return NextResponse.json({ processed: claimed.length, sent, failed });
}

async function sendOne(
  reminder: ClaimedReminder,
  clinicById: Map<string, { id: string; reminder_template_id: string | null }>,
  credentialByClinic: Map<
    string,
    { clinic_id: string; phone_number_id: string; access_token: string }
  >,
  templateById: Map<
    string,
    {
      id: string;
      name: string;
      language: string;
      body_text: string;
      header_type: string;
      header_text: string | null;
      status: string;
    }
  >
): Promise<{ ok: true; providerMessageId: string | null } | { ok: false; error: string }> {
  const patient = reminder.patients;
  const medicine = reminder.prescription_medicines;
  if (!patient || !medicine) {
    return { ok: false, error: "Patient or medicine record no longer exists." };
  }

  const clinic = clinicById.get(reminder.clinic_id);
  if (!clinic?.reminder_template_id) {
    return {
      ok: false,
      error: "This clinic has no reminder template configured yet.",
    };
  }

  const template = templateById.get(clinic.reminder_template_id);
  if (!template) {
    return { ok: false, error: "Configured reminder template no longer exists." };
  }
  if (template.status !== "approved") {
    return { ok: false, error: "Configured reminder template is not approved." };
  }
  if (
    template.header_type === "image" ||
    template.header_type === "video" ||
    template.header_type === "document" ||
    template.header_type === "location"
  ) {
    return {
      ok: false,
      error: "Reminder template has a media header, which isn't supported for reminders.",
    };
  }
  if (template.header_type === "text" && extractPlaceholders(template.header_text ?? "").length > 0) {
    return {
      ok: false,
      error: "Reminder template's header has a variable, which isn't supported for reminders.",
    };
  }

  const bodyPlaceholders = extractPlaceholders(template.body_text);
  if (bodyPlaceholders.length !== 2) {
    return {
      ok: false,
      error:
        "Reminder template must have exactly two body variables: {{1}} patient name, {{2}} medicine.",
    };
  }

  const credential = credentialByClinic.get(reminder.clinic_id);
  if (!credential) {
    return { ok: false, error: "This clinic has not connected WhatsApp yet." };
  }

  const medicineText = [medicine.name, medicine.dosage].filter(Boolean).join(" — ") || medicine.name;

  const result = await sendWhatsAppTemplateMessage({
    phoneNumberId: credential.phone_number_id,
    accessToken: credential.access_token,
    to: patient.whatsapp_number,
    templateName: template.name,
    languageCode: template.language,
    parameters: [patient.name, medicineText],
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, providerMessageId: result.providerMessageId };
}
