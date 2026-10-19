-- Leads: people who might become clients, with only what a first conversation
-- yields (`lib/domain/lead.ts`). Kept apart from `clients`, which is a fully
-- onboarded record every document derives from.
--
-- `name` and `stage` are real columns because the list groups and sorts on
-- them; company, email, phone, source, services and notes are one JSONB group,
-- validated by `leadInputSchema` on write. Additive only: nothing existing is
-- touched.
CREATE TABLE "leads" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "stage" text NOT NULL,
  "details" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "leads_stage_idx" ON "leads" ("stage");
