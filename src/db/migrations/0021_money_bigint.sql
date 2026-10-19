-- int4 capped a money column at 2,147,483,647 paise (about Rs 2.14 crore),
-- while the schemas accept far more, so a larger document failed on insert
-- after its number had been claimed (gate dry run, 18 October 2026). Widened
-- to bigint on the founder's decision. Widening keeps every value.
ALTER TABLE "documents" ALTER COLUMN "total_paise" SET DATA TYPE bigint;
--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "pay_amount_paise" SET DATA TYPE bigint;
--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "annual_salary_paise" SET DATA TYPE bigint;
