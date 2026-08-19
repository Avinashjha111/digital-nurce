-- Migration 0007 deliberately left conversations without a clinic-staff
-- INSERT policy: at the time, only the webhook receiver (service-role,
-- inbound messages) ever created a conversation, and clinic staff only
-- replied into ones that already existed.
--
-- Sending a WhatsApp template message changes that: a template can be the
-- very first outbound message to a patient who has never messaged in
-- (that's the whole point of templates -- reaching a patient outside the
-- 24h reply window), so there may be no conversation row yet. That insert
-- should go through the clinic staff member's own session like everything
-- else they do, not the service-role client, so this adds the missing
-- policy rather than reaching for an admin-client workaround.

create policy "clinic staff inserts own clinic conversations"
  on public.conversations for insert
  with check (clinic_id = public.current_user_clinic_id());
