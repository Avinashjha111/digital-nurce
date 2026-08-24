-- Step 5 of pricing.md: Razorpay Payment Links. The agency creates a link
-- for a clinic (a specific plan or top-up pack), sends it to the clinic
-- through whatever channel they already use (WhatsApp, etc.), the clinic
-- pays on Razorpay's own hosted page, and a webhook confirms it here --
-- we never touch card details or build a checkout form ourselves.

create table public.payment_links (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  kind text not null check (kind in ('plan', 'top_up')),
  plan_id uuid references public.plans (id),
  top_up_pack_id uuid references public.top_up_packs (id),
  razorpay_payment_link_id text not null unique,
  short_url text not null,
  amount numeric(10, 2) not null,
  status text not null default 'created' check (status in ('created', 'paid', 'expired', 'cancelled')),
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index payment_links_clinic_id_idx on public.payment_links (clinic_id);

alter table public.payment_links enable row level security;

-- Same convention as clinic_subscriptions/top_up_purchases: agency
-- (billing owner) manages its own clinics' links; clinic staff read-only,
-- so they can see a link was sent and whether it's been paid yet.
create policy "agency admin selects own clinics payment links"
  on public.payment_links for select
  using (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );

create policy "agency admin inserts own clinics payment links"
  on public.payment_links for insert
  with check (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );

create policy "clinic staff selects own clinic payment links"
  on public.payment_links for select
  using (clinic_id = public.current_user_clinic_id());

-- Symmetric to deduct_clinic_messages (0023) -- a top-up adds to whatever
-- the clinic's active subscription currently has, atomically. Written by
-- the service-role client only (the Razorpay webhook), so no RLS/grants
-- beyond that are needed.
create or replace function public.add_clinic_messages(p_clinic_id uuid, p_amount int)
returns table (messages_remaining int)
language sql
as $$
  update public.clinic_subscriptions
  set messages_remaining = messages_remaining + p_amount
  where clinic_id = p_clinic_id and status = 'active'
  returning messages_remaining;
$$;
