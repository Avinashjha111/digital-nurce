-- Agency-initiated patient deletion. Every table that references
-- patients (directly or transitively -- conversations, messages,
-- prescriptions, prescription_medicines, reminders, follow_ups,
-- appointment_requests) was already defined with `on delete cascade`, so
-- deleting the patients row here is enough to remove every trace of
-- their data across the whole app in one statement.

create policy "agency admin deletes own clinics patients"
  on public.patients for delete
  using (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );
