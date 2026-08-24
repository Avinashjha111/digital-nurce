-- Digital Nurse Pass pricing (pricing.md Section 2/3/6). Plans and top-up
-- packs are the product catalog -- seeded here with the exact numbers from
-- the doc. Subscriptions/top-up purchases are recorded per clinic when the
-- agency buys one on a clinic's behalf (Step 5 adds the Razorpay checkout
-- that creates these rows; for now they're just the data model).

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10, 2) not null,
  validity_days int not null,
  included_messages int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.top_up_packs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10, 2) not null,
  messages int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.plans (name, price, validity_days, included_messages) values
  ('7-Day Trial', 199, 7, 100),
  ('30-Day Pass', 899, 30, 500),
  ('90-Day Pass', 2399, 90, 1800),
  ('Annual Pass', 8499, 365, 8000);

insert into public.top_up_packs (name, price, messages) values
  ('Top-up 100', 129, 100),
  ('Top-up 500', 599, 500),
  ('Top-up 1,000', 1099, 1000);

create type public.subscription_status as enum ('active', 'expired');

create table public.clinic_subscriptions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  plan_id uuid not null references public.plans (id),
  start_date timestamptz not null default now(),
  expiry_date timestamptz not null,
  messages_remaining int not null,
  status public.subscription_status not null default 'active',
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now()
);

-- Only one subscription can be 'active' per clinic at a time (a partial
-- unique index, not a plain one, since many *expired* rows per clinic are
-- expected as history accumulates). Buying a new plan while one is active
-- must first flip the old row to 'expired' in the same transaction.
create unique index clinic_subscriptions_one_active_per_clinic
  on public.clinic_subscriptions (clinic_id)
  where status = 'active';

create table public.top_up_purchases (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  pack_id uuid not null references public.top_up_packs (id),
  messages_added int not null,
  purchased_at timestamptz not null default now(),
  linked_subscription_id uuid references public.clinic_subscriptions (id),
  created_by uuid not null references public.users (id)
);

create index clinic_subscriptions_clinic_id_idx on public.clinic_subscriptions (clinic_id);
create index top_up_purchases_clinic_id_idx on public.top_up_purchases (clinic_id);

alter table public.plans enable row level security;
alter table public.top_up_packs enable row level security;
alter table public.clinic_subscriptions enable row level security;
alter table public.top_up_purchases enable row level security;

-- Plans/top-up packs are the public catalog -- any signed-in user can read
-- them (needed to render pricing in both dashboards); only ever written by
-- migrations, not app code, so no insert/update policy exists.
create policy "any signed-in user reads plans"
  on public.plans for select
  using (auth.uid() is not null);

create policy "any signed-in user reads top-up packs"
  on public.top_up_packs for select
  using (auth.uid() is not null);

-- Subscriptions/top-ups: agency (billing owner) manages its own clinics'
-- records; clinic staff get read-only visibility (to show the balance and
-- expiry banner) but never write -- purchasing is an agency action.
create policy "agency admin selects own clinics subscriptions"
  on public.clinic_subscriptions for select
  using (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );

create policy "agency admin inserts own clinics subscriptions"
  on public.clinic_subscriptions for insert
  with check (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );

create policy "agency admin updates own clinics subscriptions"
  on public.clinic_subscriptions for update
  using (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );

create policy "clinic staff selects own clinic subscription"
  on public.clinic_subscriptions for select
  using (clinic_id = public.current_user_clinic_id());

create policy "agency admin selects own clinics top-up purchases"
  on public.top_up_purchases for select
  using (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );

create policy "agency admin inserts own clinics top-up purchases"
  on public.top_up_purchases for insert
  with check (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );

create policy "clinic staff selects own clinic top-up purchases"
  on public.top_up_purchases for select
  using (clinic_id = public.current_user_clinic_id());
