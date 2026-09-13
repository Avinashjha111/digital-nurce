import { z } from "zod";

const MODEL = "gemini-3.6-flash";

export type AssistantContext = {
  clinicName: string;
  clinicAddress?: string | null;
  clinicCity?: string | null;
  clinicPhone?: string | null;
  clinicGoogleMapsLink?: string | null;
  clinicServices?: string[] | null;
  consultationFee?: number | null;
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
  bookedAppointment?: {
    date: string;
    time: string;
    status: "confirmed" | "requested";
  } | null;
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
    booked_appointment: {
      type: "object",
      nullable: true,
      description: "Populate if the patient agreed on or requested a specific appointment date and time during the chat (e.g. 'Aaj shaam 6 baje', 'tomorrow 11 am'). Otherwise null.",
      properties: {
        date: {
          type: "string",
          description: "Appointment date formatted as YYYY-MM-DD (resolve relative words like 'aaj'/'today' to current date, 'kal'/'tomorrow' to next day).",
        },
        time: {
          type: "string",
          description: "Appointment time (e.g. '06:00 PM', '11:00 AM').",
        },
        status: {
          type: "string",
          enum: ["confirmed", "requested"],
          description: "'confirmed' if timing fits consultation hours and confirmed by assistant, 'requested' if pending confirmation.",
        },
      },
      required: ["date", "time", "status"],
    },
  },
  required: ["reply", "is_urgent", "urgency_reason", "booked_appointment"],
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
    context.clinicGoogleMapsLink ? `Google Maps Location: ${context.clinicGoogleMapsLink}` : null,
    context.clinicPhone ? `Phone: ${context.clinicPhone}` : null,
    context.consultationFee ? `Consultation Fee: ₹${context.consultationFee}` : null,
    context.clinicServices && context.clinicServices.length > 0 ? `Services: ${context.clinicServices.join(", ")}` : null,
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

  const now = new Date();
  const todayDateStr = now.toISOString().slice(0, 10);
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });

  const systemInstruction = `You are the friendly, human-like WhatsApp clinic coordinator for "${context.clinicName}". You chat with patients on WhatsApp like a warm, helpful clinic receptionist.

TODAY'S REFERENCE DATE: ${todayDateStr} (${dayName})

CLINIC INFO:
${clinicInfo}

PATIENT INFO:
Name: ${context.patientName}
Phone: ${context.patientPhone}
Active Medicines:
${medicinesInfo}

CRITICAL RULES:
1. GREETINGS (CRITICAL):
   - Say "Namaste / Hello ${context.patientName} ji! 🙏" ONLY on the very first message if conversation history is empty.
   - If conversation history has ANY prior messages or an ongoing chat, DO NOT say Namaste/Hello/Hi, and NEVER repeat doctor/clinic names. Reply directly to what the user said.
2. SHORT, HUMAN-LIKE & CRISP:
   - Keep replies strictly to 1-2 short sentences (maximum 25 words).
   - Talk naturally like a real person chatting on WhatsApp, NOT a robotic corporate AI.
3. EMOJIS:
   - Always include 1-2 warm, friendly emojis (😊, 👍, 🦷, 📍, 🙏, ⏰).
4. NO REPETITION:
   - Never repeat robotic boilerplate like "Humne aapka appointment request note kar liya hai." Be casual and clear (e.g. "Perfect! Shaam 6:00 baje milte hain clinic par! 😊👍").
5. APPOINTMENT BOOKING:
   - When a patient agrees on or specifies an appointment date & time (e.g. "Aaj shaam 6 baje", "kal subah 11 baje"), populate the booked_appointment field with { date: "YYYY-MM-DD", time: "HH:MM AM/PM", status: "confirmed" }.
   - If they are only asking timings or not confirming a slot, keep booked_appointment = null.
6. LANGUAGE:
   - Match the patient's language naturally (Hinglish/Hindi/English). If they speak casual Hinglish ("Doctor kab milenge"), reply in friendly Hinglish.
7. MEDICAL SAFETY & EMERGENCIES:
   - Never prescribe new medicines.
   - If patient reports severe acute pain, continuous bleeding, difficulty breathing, or insists on talking to the doctor ("doctor se baat karni hai", "call doctor"), set is_urgent = true and reassure them warmly that you have alerted the doctor.`;

  const userPrompt = `RECENT CONVERSATION HISTORY:
${historyFormatted}

NEW INCOMING MESSAGE FROM PATIENT:
"${context.latestMessage}"

Generate your natural, short WhatsApp reply and populate booked_appointment if an appointment was agreed upon.`;

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
            temperature: 0.2,
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
      booked_appointment?: {
        date: string;
        time: string;
        status: "confirmed" | "requested";
      } | null;
    };

    return {
      reply: parsed.reply,
      isUrgent: Boolean(parsed.is_urgent),
      urgencyReason: parsed.urgency_reason ?? null,
      bookedAppointment: parsed.booked_appointment ?? null,
    };
  } catch (err) {
    console.error("[Gemini Assistant Execution Error]", err);
    return null;
  }
}
