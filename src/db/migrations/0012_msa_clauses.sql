-- The Master Service Agreement's clauses, moved out of code into the database
-- so they can be edited at /client/clauses.
--
-- `number` is the primary key rather than a surrogate id: clause bodies cite
-- each other by number ("has the meaning given at clause 11.2"), so the number
-- is the clause's identity and renumbering would break live cross-references.
--
-- Seeded from src/lib/domain/contract/msa.ts by scripts/seed-contract.ts, which
-- stays the source of the reviewed text. Existing contracts are untouched: each
-- carries its own copy in documents.content.
CREATE TABLE "clauses" (
	"number" integer PRIMARY KEY NOT NULL,
	"heading" text NOT NULL,
	"body" jsonb NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
