-- Make follow_up_id optional in appointment_requests so direct / AI assistant bookings
-- (not tied strictly to a post-prescription follow-up) can be recorded and tracked on the dashboard.

alter table public.appointment_requests alter column follow_up_id drop not null;
