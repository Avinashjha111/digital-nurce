// Tests the Resumable Upload API integration (uploadTemplateHeaderMedia)
// end to end against the real Meta API: upload a small real image, get a
// handle back, then submit a template using that handle as an IMAGE header.
// Mirrors src/lib/whatsapp/templates.ts exactly since it can't be imported
// directly outside the Next.js runtime for a plain-Node test.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnvLocal() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (value && !process.env[key]) process.env[key] = value;
  }
}
loadEnvLocal();

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data: credential } = await admin
  .from("whatsapp_credentials")
  .select("waba_id, access_token, meta_app_id")
  .limit(1)
  .single();

if (!credential.meta_app_id) {
  console.error("No meta_app_id saved on this clinic's WhatsApp connection.");
  process.exit(1);
}

// Reuse the synthetic prescription PNG as a stand-in real image file.
const fileBytes = readFileSync(new URL("../.test-prescription.png", import.meta.url));

console.log("Step 1: opening upload session...");
const sessionRes = await fetch(
  `https://graph.facebook.com/v21.0/${credential.meta_app_id}/uploads?file_length=${fileBytes.length}&file_type=${encodeURIComponent("image/png")}&access_token=${encodeURIComponent(credential.access_token)}`,
  { method: "POST" }
);
const sessionJson = await sessionRes.json();
console.log("session response:", sessionRes.status, JSON.stringify(sessionJson));
if (!sessionRes.ok || !sessionJson.id) process.exit(1);

console.log("\nStep 2: uploading bytes...");
const uploadRes = await fetch(`https://graph.facebook.com/v21.0/${sessionJson.id}`, {
  method: "POST",
  headers: { Authorization: `OAuth ${credential.access_token}`, file_offset: "0" },
  body: fileBytes.slice().buffer,
});
const uploadJson = await uploadRes.json();
console.log("upload response:", uploadRes.status, JSON.stringify(uploadJson));
if (!uploadRes.ok || !uploadJson.h) process.exit(1);

console.log("\nStep 3: creating a template using the returned handle as an IMAGE header...");
const templateName = `diag_media_header_${Date.now()}`;
const templateRes = await fetch(
  `https://graph.facebook.com/v21.0/${credential.waba_id}/message_templates`,
  {
    method: "POST",
    headers: { Authorization: `Bearer ${credential.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: templateName,
      category: "UTILITY",
      language: "en_US",
      components: [
        { type: "HEADER", format: "IMAGE", example: { header_handle: [uploadJson.h] } },
        { type: "BODY", text: "Here is your prescription summary." },
      ],
    }),
  }
);
const templateJson = await templateRes.json();
console.log("template response:", templateRes.status, JSON.stringify(templateJson, null, 2));

if (templateJson.id) {
  await fetch(`https://graph.facebook.com/v21.0/${templateJson.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${credential.access_token}` },
  });
  console.log("\ncleaned up test template:", templateName);
}
