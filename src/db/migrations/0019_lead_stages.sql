-- The lead pipeline's stages were renamed to the steps the studio actually
-- takes (`lib/domain/lead.ts`). Rows saved under the first names move to the
-- nearest new one. "won" goes to "contract_sent": a signed lead becomes a
-- client, so nothing should rest at "won". Data only; no column changes.
UPDATE "leads" SET "stage" = 'reached_out' WHERE "stage" = 'contacted';
UPDATE "leads" SET "stage" = 'quote_sent' WHERE "stage" = 'proposal';
UPDATE "leads" SET "stage" = 'contract_sent' WHERE "stage" = 'won';
