-- Public clinic self-signup: a clinic that signs itself up starts locked
-- ("pending_activation") until the Digital Nurse team activates it, which
-- happens automatically the moment its first payment succeeds (see the
-- Razorpay webhook). Every existing clinic defaults to 'active' so nothing
-- that already works today changes.

create type public.clinic_activation_status as enum ('pending_activation', 'active');

alter table public.clinics
  add column activation_status public.clinic_activation_status not null default 'active';
