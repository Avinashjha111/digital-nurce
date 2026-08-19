-- Milestone 4: conversations + messages.
-- One conversation per patient. Messages carry clinic_id/patient_id
-- directly (denormalized) per the spec's field list, which also keeps RLS
-- on messages a plain equality check instead of a join.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  unread_count int not null default 0,
  human_attention boolean not null default false,
  created_at timestamptz not null default now(),
  unique (patient_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  body text not null,
  provider_message_id text,
  status text not null default 'sent'
    check (status in ('queued', 'sent', 'delivered', 'read', 'failed')),
  created_at timestamptz not null default now()
);

create index messages_conversation_id_idx on public.messages (conversation_id, created_at);
create unique index messages_provider_message_id_idx on public.messages (provider_message_id)
  where provider_message_id is not null;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Clinic staff: full access to their own clinic's conversations/messages
-- (select so the inbox can render, insert so the "send" action can log the
-- outbound message through the caller's own session rather than the
-- service-role key). The webhook receiver, which has no user session,
-- writes inbound messages via the admin client instead.
create policy "clinic staff selects own clinic conversations"
  on public.conversations for select
  using (clinic_id = public.current_user_clinic_id());

create policy "clinic staff updates own clinic conversations"
  on public.conversations for update
  using (clinic_id = public.current_user_clinic_id());

create policy "clinic staff selects own clinic messages"
  on public.messages for select
  using (clinic_id = public.current_user_clinic_id());

create policy "clinic staff inserts own clinic messages"
  on public.messages for insert
  with check (clinic_id = public.current_user_clinic_id());

-- Agency admins: read-only, across the clinics they own.
create policy "agency admin selects own clinics conversations"
  on public.conversations for select
  using (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );

create policy "agency admin selects own clinics messages"
  on public.messages for select
  using (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );
