# Pending: row-level security

`0025_app_role_rls.sql` is written and reviewed but not applied, because it
needs a database role that only the founder can create. It is free.

1. Neon console, project speclr, **Roles**: create a role named `speclr_app`.
   Copy its connection string (pooled is fine).
2. In `.env.local`, rename the current `DATABASE_URL` to `DATABASE_URL_OWNER`,
   and set `DATABASE_URL` to the new `speclr_app` string. Do the same two
   variables in Vercel.
3. Tell the assistant. It moves the file into `src/db/migrations/`, adds the
   journal entry, runs `npm run db:migrate` (which runs as the owner and backs
   up first), and runs `npm run test:int`, which then exercises the app as the
   restricted role.

A table added after this needs its own `ENABLE ROW LEVEL SECURITY` and policy
in the migration that creates it, or the app will be refused on it.
