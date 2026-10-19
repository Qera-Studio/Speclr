-- Contract wording approved by the founder, 19 October 2026: clause 5.3
-- sends notices to the addresses on the parties page (it named a Schedule that
-- states none), and clause 1.1 defines "Third-Party Costs", which 8.6 and 9.4
-- use. Applied to the clause library and to open drafts, which carry their
-- own copy; issued contracts are immutable and are not touched. Text
-- replacement, so a clause already edited by hand is left as it is.
UPDATE "clauses"
SET "body" = replace(replace("body"::text,
  '5.3 Formal notices shall be sent to the email addresses stated in the applicable Schedule',
  '5.3 Formal notices shall be sent to the email address set out against each Party''s name at the head of this Agreement, or such other address as a Party notifies in writing,'),
  '"\"Third-Party Services\" means', '"\"Third-Party Costs\" means the platform subscriptions, hosting, domain fees, licences and other third-party charges described at clause 9.1.", "\"Third-Party Services\" means')::jsonb
WHERE "number" IN (1, 5);
--> statement-breakpoint
UPDATE "documents"
SET "data" = replace(replace("data"::text,
  '5.3 Formal notices shall be sent to the email addresses stated in the applicable Schedule',
  '5.3 Formal notices shall be sent to the email address set out against each Party''s name at the head of this Agreement, or such other address as a Party notifies in writing,'),
  '"\"Third-Party Services\" means', '"\"Third-Party Costs\" means the platform subscriptions, hosting, domain fees, licences and other third-party charges described at clause 9.1.", "\"Third-Party Services\" means')::jsonb
WHERE "type" = 'CON' AND "status" = 'draft';
