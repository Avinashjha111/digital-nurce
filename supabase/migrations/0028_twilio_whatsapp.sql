-- Clean cutover from Meta's WhatsApp Cloud API to Twilio (ISV / Embedded
-- Signup, one Twilio subaccount per clinic). No real paying clinic depends
-- on the old Meta columns surviving, so they're dropped rather than kept
-- unused alongside the new ones.

alter table public.whatsapp_credentials
  drop constraint whatsapp_credentials_phone_number_id_key,
  drop column phone_number_id,
  drop column access_token,
  drop column meta_app_id;

alter table public.whatsapp_credentials
  add column twilio_subaccount_sid text,
  add column twilio_subaccount_auth_token text,
  add column twilio_sender_sid text,
  -- Same lesson as the old phone_number_id unique constraint (migration
  -- 0025): two clinics sharing one number made webhook credential lookup
  -- ambiguous and silently dropped every inbound message on it. Never
  -- again -- enforced at the DB level, not just app-side.
  add column whatsapp_number_e164 text unique,
  -- Twilio's own status string (CREATING/ONLINE/OFFLINE/FAILED/etc) --
  -- kept as free text rather than a Postgres enum since Twilio's full
  -- vocabulary isn't documented anywhere we have access to and may grow;
  -- app code only ever compares it to 'ONLINE'.
  add column sender_status text;

-- waba_id (added in 0011) is reused as-is -- still the WhatsApp Business
-- Account id, just now populated from the Embedded Signup FINISH event
-- instead of a manual form field.

alter table public.whatsapp_templates
  drop column meta_template_id,
  add column twilio_content_sid text;
