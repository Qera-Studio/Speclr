-- Client onboarding: the client record becomes the source of truth.
--
-- Six columns, all nullable, all additive. Nothing existing is rewritten and no
-- document changes shape — a client written before today simply has none of
-- these, which is a normal state the record and every form tolerate.
--
-- `entity_type` is a real column because it is identity rather than tax
-- (PRINCIPLES.md rule 2), and because it is the one identity fact that
-- validates another: an Indian entity's PAN encodes its own kind in the 4th
-- character, so knowing the entity type turns a shape check into a real one.
--
-- The other four are JSONB groups, following `employees.bank` and
-- `employees.payroll`: nothing queries them, and a group keeps the next field
-- migration-free. Each is Zod-validated on write (lib/domain/client.ts), so
-- these columns never hold merely what a browser sent.
--
-- No `country` column: addressParts.country already holds it, and two places to
-- say where a client is means two places for them to disagree (rule 3). No
-- `onboarding_step` column either — completeness is derived from which groups
-- are present.
--
-- `attachments` holds file *metadata* only. The bytes live in blob storage and
-- are read back through an authenticated route; there is no public URL in this
-- column, because these are a third party's identity documents.
ALTER TABLE "clients" ADD COLUMN "entity_type" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "tax" jsonb;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "contacts" jsonb;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "commercial" jsonb;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "attachments" jsonb;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "access" jsonb;
