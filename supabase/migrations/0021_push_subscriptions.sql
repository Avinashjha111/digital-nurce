-- Web Push subscriptions, so clinic staff get a real device/OS notification
-- the moment a patient messages in -- not just an in-app badge they'd only
-- see if they happened to have the tab open.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  clinic_id uuid references public.clinics (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_clinic_id_idx on public.push_subscriptions (clinic_id);

alter table public.push_subscriptions enable row level security;

-- Each user manages only their own subscriptions (one per device/browser).
create policy "users manage own push subscriptions"
  on public.push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- The webhook (service-role client) reads by clinic_id to fan out a push
-- to every subscribed device at that clinic -- bypasses RLS by design,
-- no policy needed for that path.
