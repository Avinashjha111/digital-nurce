-- Atomic message-unit deduction. A plain read-then-write from app code
-- would race under concurrent messages (two inbound messages arriving at
-- once could both read remaining=5 and both write remaining=4 instead of
-- 3) -- a single UPDATE...RETURNING is atomic at the row level, which
-- read-then-write never is. Callable only via the service-role client
-- (matches how whatsapp_credentials is handled), so no RLS/grants needed.
create or replace function public.deduct_clinic_messages(p_clinic_id uuid, p_units int)
returns table (messages_remaining int, status public.subscription_status)
language sql
as $$
  update public.clinic_subscriptions
  set messages_remaining = greatest(messages_remaining - p_units, 0)
  where clinic_id = p_clinic_id and status = 'active'
  returning messages_remaining, status;
$$;
