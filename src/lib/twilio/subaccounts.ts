import twilio from "twilio";

// Every clinic gets its own Twilio subaccount -- Twilio's own ISV
// guidance: "a single Twilio account or subaccount is mapped to a single
// WABA." Only the PARENT account's credentials (TWILIO_ACCOUNT_SID/
// TWILIO_AUTH_TOKEN) are used here; the resulting subaccount's own SID/
// token are what every later send/receive call uses (src/lib/whatsapp/provider.ts).
export async function createClinicSubaccount(
  clinicName: string
): Promise<{ ok: true; sid: string; authToken: string } | { ok: false; error: string }> {
  const parentSid = process.env.TWILIO_ACCOUNT_SID;
  const parentAuthToken = process.env.TWILIO_AUTH_TOKEN;
  if (!parentSid || !parentAuthToken) {
    return { ok: false, error: "Twilio is not configured on the server." };
  }

  try {
    const client = twilio(parentSid, parentAuthToken);
    const subaccount = await client.api.v2010.accounts.create({
      friendlyName: `Digital Nurse - ${clinicName}`,
    });
    if (!subaccount.authToken) {
      return { ok: false, error: "Twilio did not return an auth token for the new subaccount." };
    }
    return { ok: true, sid: subaccount.sid, authToken: subaccount.authToken };
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Failed to create Twilio subaccount.";
    return { ok: false, error: message };
  }
}
