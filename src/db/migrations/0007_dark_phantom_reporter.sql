ALTER TABLE "employees" ADD COLUMN "annual_salary_paise" integer;--> statement-breakpoint
-- Backfill: an employee's annual salary is twelve times what they are paid a
-- month, which is not a new claim about anyone — it is the same money, stated
-- the way an offer letter states it. Interns are left null on purpose: a
-- stipend is a monthly figure and calling it an annual package would frame the
-- internship as employment.
--
-- Done here rather than left to a form fallback so the column means what it
-- says from the first read, instead of the form quietly inventing a figure the
-- table does not hold.
UPDATE "employees"
SET "annual_salary_paise" = "pay_amount_paise" * 12
WHERE "engagement_type" = 'employee';
