import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp/provider";
import { extractPlaceholders } from "@/lib/whatsapp/templates";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 50;

type ClaimedFollowUp = {
  id: string;
  clinic_id: string;
  patients: { name: string; whatsapp_number: string } | null;
};

// Milestone 9 scheduler. Claims 'upcoming' follow-ups whose date has
// arrived and sends the "want to book a visit?" nudge -- that send IS the
// upcoming -> due transition (see migration 0016), so a failed send drops
// the row back to 'upcoming' to retry on the next run rather than leaving
// it stuck.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: claimed, error: claimErr } = await admin
    .from("follow_ups")
    .update({ status: "due" })
    .eq("status", "upcoming")
    .lte("follow_up_date", today)
    .select("id, clinic_id, patients(name, whatsapp_number)")
    .limit(BATCH_SIZE)
    .returns<ClaimedFollowUp[]>();

  if (claimErr) {
    return NextResponse.json({ error: claimErr.message }, { status: 500 });
  }
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const clinicIds = [...new Set(claimed.map((f) => f.clinic_id))];

  const [{ data: clinics }, { data: credentials }] = await Promise.all([
    admin.from("clinics").select("id, follow_up_template_id").in("id", clinicIds),
    admin
      .from("whatsapp_credentials")
      .select("clinic_id, phone_number_id, access_token")
      .in("clinic_id", clinicIds),
  ]);

  const templateIds = [
    ...new Set(
      (clinics ?? []).map((c) => c.follow_up_template_id).filter((id): id is string => !!id)
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

  for (const followUp of claimed) {
    const result = await sendOne(followUp, clinicById, credentialByClinic, templateById);
    if (result.ok) {
      sent++;
      await admin
        .from("follow_ups")
        .update({
          message_sent_at: new Date().toISOString(),
          provider_message_id: result.providerMessageId,
          error: null,
        })
        .eq("id", followUp.id);
    } else {
      failed++;
      // Not a dead end -- drop back to 'upcoming' so the next run retries
      // once the clinic fixes whatever's wrong (template, connection).
      await admin
        .from("follow_ups")
        .update({ status: "upcoming", error: result.error })
        .eq("id", followUp.id);
    }
  }

  return NextResponse.json({ processed: claimed.length, sent, failed });
}

async function sendOne(
  followUp: ClaimedFollowUp,
  clinicById: Map<string, { id: string; follow_up_template_id: string | null }>,
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
): Promise<{ ok: true; providerMessageId: string } | { ok: false; error: string }> {
  const patient = followUp.patients;
  if (!patient) {
    return { ok: false, error: "Patient record no longer exists." };
  }

  const clinic = clinicById.get(followUp.clinic_id);
  if (!clinic?.follow_up_template_id) {
    return { ok: false, error: "This clinic has no follow-up template configured yet." };
  }

  const template = templateById.get(clinic.follow_up_template_id);
  if (!template) {
    return { ok: false, error: "Configured follow-up template no longer exists." };
  }
  if (template.status !== "approved") {
    return { ok: false, error: "Configured follow-up template is not approved." };
  }
  if (
    template.header_type === "image" ||
    template.header_type === "video" ||
    template.header_type === "document" ||
    template.header_type === "location"
  ) {
    return {
      ok: false,
      error: "Follow-up template has a media header, which isn't supported here.",
    };
  }
  if (
    template.header_type === "text" &&
    extractPlaceholders(template.header_text ?? "").length > 0
  ) {
    return {
      ok: false,
      error: "Follow-up template's header has a variable, which isn't supported here.",
    };
  }

  const bodyPlaceholders = extractPlaceholders(template.body_text);
  if (bodyPlaceholders.length !== 1) {
    return {
      ok: false,
      error: "Follow-up template must have exactly one body variable: {{1}} patient name.",
    };
  }

  const credential = credentialByClinic.get(followUp.clinic_id);
  if (!credential) {
    return { ok: false, error: "This clinic has not connected WhatsApp yet." };
  }

  const result = await sendWhatsAppTemplateMessage({
    phoneNumberId: credential.phone_number_id,
    accessToken: credential.access_token,
    to: patient.whatsapp_number,
    templateName: template.name,
    languageCode: template.language,
    parameters: [patient.name],
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, providerMessageId: result.providerMessageId };
}
