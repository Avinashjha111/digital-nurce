-- Prevents the exact bug that silently dropped inbound messages: two
-- clinics both connected to the same Meta phone_number_id, which made the
-- webhook's credential lookup ambiguous (.maybeSingle() on >1 row) and it
-- silently skipped every message on that number instead of erroring loudly.
alter table public.whatsapp_credentials
  add constraint whatsapp_credentials_phone_number_id_key unique (phone_number_id);
