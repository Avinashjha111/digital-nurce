-- WhatsApp message template management (needed before Milestone 8: outside
-- the 24h customer-service window, WhatsApp only allows pre-approved
-- template messages, not free-form text).

-- Template creation needs the WhatsApp Business Account ID, which the
-- Phone Number ID alone doesn't give us via the Graph API -- ask for it
-- alongside phone_number_id/access_token in the same Connect WhatsApp flow.
alter table public.whatsapp_credentials
  add column waba_id text;

create type whatsapp_template_status as enum ('pending', 'approved', 'rejected', 'disabled');
create type whatsapp_template_category as enum ('utility', 'marketing', 'authentication');

create table public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  name text not null,
  category whatsapp_template_category not null,
  language text not null,
  body_text text not null,
  meta_template_id text,
  status whatsapp_template_status not null default 'pending',
  rejection_reason text,
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  unique (clinic_id, name, language)
);

alter table public.whatsapp_templates enable row level security;

-- Same ownership model as clinics: only the agency_admin who owns the
-- clinic manages its templates. Clinic staff can read them (useful once a
-- manual-send UI exists) but the Meta submission itself is an agency action,
-- matching how WhatsApp connection itself is agency-only.
create policy "agency admin selects own clinics templates"
  on public.whatsapp_templates for select
  using (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );

create policy "agency admin inserts own clinics templates"
  on public.whatsapp_templates for insert
  with check (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );

create policy "agency admin updates own clinics templates"
  on public.whatsapp_templates for update
  using (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );

create policy "clinic staff selects own clinic templates"
  on public.whatsapp_templates for select
  using (clinic_id = public.current_user_clinic_id());
