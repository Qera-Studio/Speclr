-- Row-level security with a restricted app role (founder's decision,
-- 19 October 2026). NOT YET IN THE JOURNAL: it needs the role `speclr_app` to
-- exist, which is created in the Neon console (README.md beside this file).
--
-- What it buys, honestly. speclr has one tenant and the browser never talks
-- to the database, so a policy cannot hide one customer's rows from another.
-- What it does do:
--   * The app connects as a role that can read and write rows and nothing
--     else: it cannot drop or alter a table, truncate one, or switch off the
--     immutability trigger (0022). A leaked app password cannot destroy the
--     schema or rewrite an issued document.
--   * Every table refuses every role that has no policy on it, so any login
--     added later (a reporting tool, a script) sees nothing until it is given
--     a policy on purpose.
-- The owner bypasses RLS, so migrations, backups and restores run as before.
GRANT USAGE ON SCHEMA public TO speclr_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO speclr_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO speclr_app;
--> statement-breakpoint
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clauses', 'client_inputs', 'clients', 'counters', 'documents',
    'contract_acceptances', 'employees', 'exclusions', 'leads', 'services',
    'studio_settings'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    -- Single tenant: the app role is the whole of who may touch a row, so the
    -- policy is the role, and the condition is true.
    EXECUTE format('CREATE POLICY speclr_app_rows ON %I FOR ALL TO speclr_app USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;
