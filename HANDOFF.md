# Sarthak Clinic handoff

## Purpose and technology

Sarthak Clinic is a mobile-first clinic website and private doctor workspace.
It uses Next.js 16 App Router, React, TypeScript, Tailwind CSS, Supabase Auth,
Postgres, PostgREST RPCs, and SQL migrations. Patient and financial records live
in Supabase, never in Git.

## Install and run (Windows PowerShell)

```powershell
npm ci
Copy-Item .env.example .env.local
# Edit .env.local locally, then:
npm run dev
```

Production commands:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run start
```

## Environment variables

Set these locally in `.env.local` or in the hosting provider; do not commit real
values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable/anon key only)
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_DEMO_MODE`

The checked-in `.env.example` contains placeholders only. Never use a
service-role key in the application.

## Supabase migrations (execution order)

Back up and verify remote migration history before applying anything. Never
reset a hosted project or blindly replay the initial migration.

1. `supabase/migrations/202610290001_initial_schema.sql` — base tables,
   `authorized_doctors`, authorization and booking/ledger functions, views,
   grants, and RLS.
2. `supabase/migrations/202611020001_public_clinic_speciality.sql` — additive
   profile speciality field and public profile view.
3. `supabase/migrations/202611020002_doctor_ledger_workspace.sql` — reversal-
   aware accounting RPCs and paginated ledger patient/summary RPCs.

For an already-populated database, inspect migration history and objects first,
then apply only confirmed-pending migrations.

## Doctor account provisioning

Doctor access is a Supabase Auth user UUID allowlist, not a role or email
allowlist. The initial migration creates `public.authorized_doctors(user_id)`
with a foreign key to `auth.users(id)`. The app and RLS check the current
authenticated user through `is_authorized_doctor()`. Keep public signup
disabled.

1. Privately invite/create the doctor in Supabase Auth and set the password
   through the private invite or recovery flow.
2. After verifying the initial migration, insert only that Auth user's UUID:

   ```sql
   insert into public.authorized_doctors (user_id)
   values ('DOCTOR_AUTH_USER_UUID');
   ```

3. Sign in at `/doctor/login`. Configure Supabase Auth redirect allow-lists for
   local `/auth/callback` and the production HTTPS callback.

## Implemented and verification status

Implemented: public bilingual clinic page and booking request flow; doctor
authentication and allowlist; availability management; appointments; patient
records and visit notes; immutable Udhaar ledger transactions,
reversals/corrections, and reports; responsive doctor workspace.

Checks last run after availability-selector and authorization changes:

- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — passed, 8 tests.
- Production build — **not verified**. Compilation completed, but the build
  failed when the sandbox denied creating
  `.next/server/app/doctor/(private)` (`EPERM`).
- Supabase pgTAP tests, real migration state, authenticated page rendering,
  database persistence, and full booking/visit/charge/payment workflow — not
  verified against an isolated test database.

Passing local checks do not establish readiness for real patients.

## Known issues and pending work

- The Udhaar page reported missing
  `doctor_ledger_patient_page(...)`; Reports reported missing
  `accounting_ledger_totals()`. An anonymous PostgREST probe also reported
  `PGRST202` for `patient_ledger_summary(uuid)`. This confirms these RPCs were
  not visible in the API schema cache at probe time, but does not distinguish
  an unapplied migration from a stale cache.
- Verify actual function signatures and migration state in Supabase before
  deciding whether to apply `202611020002_doctor_ledger_workspace.sql` or reload
  the schema cache. Do not replay the initial schema migration.
- Slow development navigation needs repeated production-mode measurements;
  reported development timings include first-load compilation and are not a
  production benchmark.
- Database migrations/access tests and full booking and payment persistence
  flows still need verification in a separate, isolated test project.
- Public content still has sample/fallback profile details. Verify and replace
  them with confirmed doctor profile values in Doctor Settings before launch;
  saved database profile settings take precedence.
- No production deployment manifest is included. Configure auth redirects,
  backups, restore validation, and deployment abuse controls before launch.

