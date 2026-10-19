-- The agreement is called the Contract Agreement everywhere (founder's
-- instruction, 19 October 2026). The clause library and open drafts carry
-- their own copy of the old name; finalized contracts are immutable and are
-- deliberately not touched. Data only; no column changes.
UPDATE "clauses"
SET "body" = replace("body"::text, 'Master Service Agreement', 'Contract Agreement')::jsonb
WHERE "body"::text LIKE '%Master Service Agreement%';
--> statement-breakpoint
UPDATE "documents"
SET "data" = replace(replace("data"::text, 'Master Service Agreement', 'Contract Agreement'), 'This Service Agreement', 'This Contract Agreement')::jsonb
WHERE "type" = 'CON' AND "status" = 'draft'
  AND ("data"::text LIKE '%Master Service Agreement%' OR "data"::text LIKE '%This Service Agreement%');
