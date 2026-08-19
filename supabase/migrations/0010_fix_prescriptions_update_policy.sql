-- Bug found by scripts/test-milestone6-e2e.mjs: migration 0008 gave clinic
-- staff select + insert policies on prescriptions, but no UPDATE policy.
-- With RLS enabled and no UPDATE policy, an UPDATE from a clinic-staff
-- session matches zero rows and returns NO ERROR (not blocked with an
-- exception, just silently affects nothing) -- so processPrescription()
-- would call Gemini successfully, insert prescription_medicines
-- successfully, then silently fail to ever flip prescriptions.status past
-- 'uploaded' or store the extracted patient_name/follow_up fields.

create policy "clinic staff updates own clinic prescriptions"
  on public.prescriptions for update
  using (clinic_id = public.current_user_clinic_id());
