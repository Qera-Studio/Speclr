-- A client's acceptance of an issued contract, kept beside it because the
-- contract itself is immutable once issued (founder's decision, 19 October
-- 2026). One row per contract.
CREATE TABLE "contract_acceptances" (
  "document_id" text PRIMARY KEY NOT NULL REFERENCES "documents"("id"),
  "accepted_on" date NOT NULL,
  "method" text NOT NULL CHECK ("method" IN ('email', 'link', 'signature')),
  "accepted_by_name" text NOT NULL,
  "accepted_by_designation" text,
  "reference" text,
  "recorded_by" text,
  "recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
