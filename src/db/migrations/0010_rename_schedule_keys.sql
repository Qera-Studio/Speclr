-- The Monthly Schedule is now the Retainer Schedule, and Advice is Audit.
-- `schedule_key` is plain text with no constraint, so the rename is a data
-- change rather than a type change.
UPDATE "services" SET "schedule_key" = 'retainer' WHERE "schedule_key" = 'monthly';
--> statement-breakpoint
UPDATE "services" SET "schedule_key" = 'audit' WHERE "schedule_key" = 'advice';
--> statement-breakpoint
-- A ticked service is copied onto the draft (CONTEXT.md §5b), so any open
-- contract carries the old key inside its own JSONB and would fail Zod on load.
-- Nothing is finalized yet, and a finalized contract must never be rewritten —
-- so this is scoped to drafts.
UPDATE "documents"
SET "data" = replace(
  replace("data"::text, '"scheduleKey":"monthly"', '"scheduleKey":"retainer"'),
  '"scheduleKey":"advice"', '"scheduleKey":"audit"'
)::jsonb
WHERE "type" = 'CON' AND "status" = 'draft';
