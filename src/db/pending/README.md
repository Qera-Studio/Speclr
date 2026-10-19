# Pending: row-level security

`0025_app_role_rls.sql` is written and reviewed but not applied, because it
needs a restricted database login, `speclr_app`, which does not exist yet. It
is free.

**Create the role with SQL, not in the Neon console.** Neon makes every role
created in the console, CLI or API a member of `neon_superuser`, which can
bypass row-level security and create roles and databases. That would be the
opposite of a restricted login. A role created with SQL by the owner has none
of that.

1. The assistant runs a one-off script, as the owner, that creates
   `speclr_app` with a random password and writes it into `.env.local`: the
   current `DATABASE_URL` becomes `DATABASE_URL_OWNER`, and `DATABASE_URL`
   becomes the `speclr_app` connection string. The password is never printed.
2. The founder copies those two variables into Vercel (Settings, Environment
   Variables). This is the only step that needs a person.
3. The assistant moves the migration into `src/db/migrations/`, adds the
   journal entry, runs `npm run db:migrate` (as the owner, after a backup) and
   `npm run test:int`, which then runs as the restricted role.

A table added after this needs its own `ENABLE ROW LEVEL SECURITY` and policy
in the migration that creates it, or the app will be refused on it.
