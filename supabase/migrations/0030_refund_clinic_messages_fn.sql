-- Atomic message-unit refund when an outbound message fails or is reported undelivered.
-- Ensures clinics are never charged for messages that did not reach the patient.

create or replace function public.refund_clinic_messages(p_clinic_id uuid, p_units int)
returns table (messages_remaining int, status public.subscription_status)
language sql
as $$
  update public.clinic_subscriptions
  set messages_remaining = messages_remaining + p_units
  where clinic_id = p_clinic_id and status = 'active'
  returning messages_remaining, status;
$$;
