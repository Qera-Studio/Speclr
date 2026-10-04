-- Three facts about a client that onboarding now asks for: what they do, who
-- brought them in, and who works with them.
--
-- `industry` is a fact about who the client is (`PRINCIPLES.md` rule 2) and a
-- real column rather than a key in one of the JSONB groups, because unlike the
-- groups it is something the clients list *queries*: filtering and grouping by
-- trade is the whole reason for recording it, and a JSONB key cannot be
-- indexed usefully for that. Its values come from the fixed fifty in
-- `lib/domain/industry.ts` rather than free text, for the reason that file
-- gives: five spellings of 'SaaS' is a field with no value.
--
-- `lead_employee_id` and `team_employee_ids` are facts about *Qera* rather
-- than about the client, which makes them the one place the two profiles have
-- to meet. They store employee **ids, never names**: a name copied onto a
-- client goes stale the first time somebody is renamed, which is the rule
-- `CONTEXT.md` §5d-i already applies to `contacts.primary`.
--
-- ON DELETE SET NULL rather than CASCADE: deleting an employee must not delete
-- the clients they brought in. An unassigned client is a true statement; a
-- deleted one is not.
--
-- The team is JSONB rather than a join table, and deliberately carries no
-- foreign key. Nothing queries "which clients is this person on" today, a join
-- table would be three files and a migration for an array of at most a handful
-- of ids, and the list is filtered against the live employees on read, so a
-- departed member stops resolving rather than leaving a dangling row. The day
-- something does query it from the other side, that is when it earns the table.
--
-- All three are nullable, like every column added after the first invoice, and
-- none is snapshotted: no sheet prints any of them, and `ClientSnapshot` is an
-- explicit list precisely so a field gets on it by being printed (rule 4).
ALTER TABLE "clients" ADD COLUMN "industry" text;
ALTER TABLE "clients" ADD COLUMN "lead_employee_id" text;
ALTER TABLE "clients" ADD COLUMN "team_employee_ids" jsonb;

ALTER TABLE "clients"
  ADD CONSTRAINT "clients_lead_employee_id_employees_id_fk"
  FOREIGN KEY ("lead_employee_id") REFERENCES "employees"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

-- The list filters and groups on it, and an unset industry is the common case
-- early on, so the index is partial: it stays small while every client added
-- before this migration has no value.
CREATE INDEX "clients_industry_idx" ON "clients" ("industry") WHERE "industry" IS NOT NULL;
