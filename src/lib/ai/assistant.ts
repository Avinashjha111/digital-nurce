import { z } from "zod";

const MODEL = "gemini-3.6-flash";

export type AssistantContext = {
  clinicName: string;
  clinicAddress?: string | null;
  clinicCity?: string | null;
  clinicPhone?: string | null;
  doctorName?: string | null;
  doctorSpecialization?: string | null;
  doctorBio?: string | null;
  doctorTimings?: string | null;
  patientName: string;
  patientPhone: string;
  activeMedicines?: Array<{
    name: string;
    dosage?: string | null;
    frequency?: string | null;
    timings?: string[] | null;
    instruction?: string | null;
  }>;
  conversationHistory: Array<{
    direction: "inbound" | "outbound";
    body: string;
  }>;
  latestMessage: string;
};

export type AssistantReply = {
  reply: string;
  isUrgent: boolean;
  urgencyReason: string | null;
};

const assistantResponseSchema = {
  type: "object",
  properties: {
    reply: {
      type: "string",
      description: "The empathetic, WhatsApp-friendly response to the patient in their matching language (Hinglish/Hindi/English).",
    },
    is_urgent: {
      type: "boolean",
      description: "True if the patient has a severe emergency, severe symptom, bleeding, or explicitly insists on speaking to the doctor.",
    },
    urgency_reason: {
      type: "string",
      nullable: true,
      description: "Short reason if urgent (e.g. 'Severe bleeding reported', 'Patient requested immediate doctor call').",
    },
  },
  required: ["reply", "is_urgent", "urgency_reason"],
};

export async function generateClinicAssistantReply(
  context: AssistantContext
): Promise<AssistantReply | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[Gemini Assistant] GEMINI_API_KEY is not configured.");
    return null;
  }

  const doctorInfo = context.doctorName
    ? `${context.doctorName}${context.doctorSpecialization ? ` (${context.doctorSpecialization})` : ""}`
    : "our doctor";

  const clinicInfo = [
    `Clinic Name: ${context.clinicName}`,
    context.doctorName ? `Chief Doctor: ${doctorInfo}` : null,
    context.clinicAddress ? `Address: ${context.clinicAddress}${context.clinicCity ? `, ${context.clinicCity}` : ""}` : null,
    context.clinicPhone ? `Phone: ${context.clinicPhone}` : null,
    context.doctorBio ? `Doctor Details: ${context.doctorBio}` : null,
    context.doctorTimings ? `Consultation Timings: ${context.doctorTimings}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const medicinesInfo =
    context.activeMedicines && context.activeMedicines.length > 0
      ? context.activeMedicines
          .map(
            (m) =>
              `- ${m.name}${m.dosage ? ` (${m.dosage})` : ""}${m.frequency ? `, Frequency: ${m.frequency}` : ""}${m.timings ? `, Timings: ${m.timings.join(", ")}` : ""}${m.instruction ? `, Note: ${m.instruction}` : ""}`
          )
          .join("\n")
      : "No currently active prescriptions recorded.";

  const historyFormatted =
    context.conversationHistory.length > 0
      ? context.conversationHistory
          .map((m) => `${m.direction === "inbound" ? "Patient" : "Clinic"}: ${m.body}`)
          .join("\n")
      : "No previous messages.";

  const systemInstruction = `You are the virtual AI Medical Receptionist & Assistant for "${context.clinicName}". You communicate with patients over WhatsApp on behalf of the clinic.

CLINIC PROFILE:
${clinicInfo}

PATIENT PROFILE:
Name: ${context.patientName}
Phone: ${context.patientPhone}
Active Prescriptions/Medicines:
${medicinesInfo}

CORE INSTRUCTIONS:
1. LANGUAGE & TONE:
   - Match the patient's language naturally. If the patient writes in Hinglish or Hindi (e.g. "Doctor kab milenge", "Mujhe appointment chahiye", "Dawa kaise khani hai"), respond in natural, friendly Hinglish. If they write in English, respond in English.
   - Keep answers warm, polite, reassuring, concise, and WhatsApp-friendly (2-4 sentences max).

2. SCOPE OF ASSISTANCE:
   - Help patients with clinic hours, doctor consultation availability, appointment bookings, clinic location, fees, and explain the timings/routine of their currently prescribed medicines.
   - If they want to book an appointment, ask for their preferred day and time so the clinic can confirm.

3. MEDICAL SAFETY (STRICT):
   - You are an assistant, NOT a prescribing doctor.
   - NEVER diagnose diseases or prescribe new medicines.
   - If a patient asks for a new medicine or complains of new unrelated symptoms, advise them to visit the clinic for an in-person checkup.

4. EMERGENCY & URGENT TRIAGE (CRITICAL):
   - Set is_urgent = true if:
     a) Patient reports severe acute pain, continuous bleeding, allergic reaction, difficulty breathing, or medical emergency.
     b) Patient explicitly demands to speak/call the doctor or human staff immediately ("doctor se baat karni hai", "call me immediately", "urgent hai").
   - For urgent cases:
     - In the reply, reassure the patient that you have immediately alerted Dr. ${context.doctorName || "the doctor"} and the clinic team to contact them as soon as possible.
     - Set urgency_reason to a concise summary of the issue.

5. OUTPUT FORMAT:
   - Output valid JSON matching the schema with fields: "reply", "is_urgent", "urgency_reason".`;

  const userPrompt = `RECENT CONVERSATION HISTORY:
${historyFormatted}

NEW INCOMING MESSAGE FROM PATIENT:
"${context.latestMessage}"

Generate your response as the clinic assistant following all instructions.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: assistantResponseSchema,
            temperature: 0.3,
          },
        }),
      }
    );

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      console.error("[Gemini Assistant API Error]", res.status, errJson);
      return null;
    }

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text) as {
      reply: string;
      is_urgent: boolean;
      urgency_reason: string | null;
    };

    return {
      reply: parsed.reply,
      isUrgent: Boolean(parsed.is_urgent),
      urgencyReason: parsed.urgency_reason ?? null,
    };
  } catch (err) {
    console.error("[Gemini Assistant Execution Error]", err);
    return null;
  }
}
