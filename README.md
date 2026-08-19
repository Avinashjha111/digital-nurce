# Digital Nurse — Demo MVP

Clinic-focused patient communication and follow-up system. See
[`digital-nurse-demo.md`](./digital-nurse-demo.md) for the full product spec.

Built milestone by milestone — see that spec's "Vibe Coding Rules" section for
the milestone list and completion criteria.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Postgres, Auth, Storage)
- Google Gemini (prescription extraction)
- Twilio WhatsApp (production) / WhatsApp testing sandbox (development)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project at [supabase.com](https://supabase.com).

3. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API
   - `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API (server-only, never expose to the browser)
   - `GEMINI_API_KEY`, `TWILIO_*`, `WHATSAPP_WEBHOOK_SECRET` — added as those milestones land

4. Apply database migrations: open the Supabase SQL Editor and run each file in
   `supabase/migrations/` in order (or use the Supabase CLI if you have it linked).

5. Create the first agency admin user. In the Supabase Dashboard → Authentication →
   Users → Add user, set email/password, and under "User Metadata" add:

   ```json
   { "role": "agency_admin", "full_name": "Your Name" }
   ```

   The `handle_new_user` trigger (migration `0001_users_and_roles.sql`) copies this
   into `public.users` automatically.

6. Run the dev server:

   ```bash
   npm run dev
   ```

   Sign in at `/login`. Agency admins land on `/agency/dashboard`; clinic users
   land on `/clinic/dashboard`.

## Project structure

- `src/app/agency/*` — Agency Dashboard (agency_admin only)
- `src/app/clinic/*` — Clinic web app (clinic_admin / receptionist)
- `src/app/login` — Supabase Auth email/password login
- `src/lib/supabase/` — browser/server/admin Supabase clients + session refresh
- `src/lib/actions/` — server actions
- `supabase/migrations/` — SQL migrations, applied in order
