-- Milestone 4: per-clinic WhatsApp Cloud API credentials (Phone Number ID +
-- access token entered directly by the agency, not Meta Embedded Signup).
--
-- This table intentionally has RLS enabled with ZERO policies. That means
-- no role -- not even the agency_admin who owns the clinic, not even the
-- clinic's own staff -- can select/insert/update/delete through the normal
-- PostgREST/session path. The only way in is the service-role secret key,
-- used exclusively from server-only code (connect-WhatsApp server action,
-- the webhook receiver, and the outgoing-send server action). This is what
-- "never expose Meta access tokens to the frontend" means at the database
-- layer, not just in the UI.

create table public.whatsapp_credentials (
  clinic_id uuid primary key references public.clinics (id) on delete cascade,
  phone_number_id text not null,
  access_token text not null,
  updated_at timestamptz not null default now()
);

alter table public.whatsapp_credentials enable row level security;
-- No policies created on purpose: default-deny for every non-service role.

-- Non-secret connection metadata that IS fine to show in the UI, alongside
-- the existing whatsapp_status/whatsapp_number columns from migration 0002.
alter table public.clinics
  add column whatsapp_last_checked_at timestamptz;
