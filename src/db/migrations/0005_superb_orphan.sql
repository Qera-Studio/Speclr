-- Employee codes: assign one to every existing employee, seed the counter past
-- them, then make duplicates unrepresentable.
--
-- The backfill is not cosmetic. Two employees were already sharing the code
-- "000001", typed by hand months apart — the unique index below cannot be
-- created until that is resolved, and an employee code that identifies two
-- people is exactly what it exists to prevent. Codes are assigned in creation
-- order so the series matches the order people joined.
--
-- Safe to rewrite existing values here: no document has ever been finalized
-- carrying an employee code (the pay slip is new), so nothing frozen into an
-- issued snapshot is being contradicted. Once a slip is issued, a code is
-- never reassigned again — see `withEmployeeCode` in the employees action.
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS n FROM "employees"
)
UPDATE "employees" e
SET "payroll" = coalesce(e."payroll", '{}'::jsonb)
  || jsonb_build_object('employeeCode', 'QS-EMP-' || lpad(o.n::text, 3, '0'))
FROM ordered o
WHERE o.id = e.id;
--> statement-breakpoint
-- Start the counter above every code just assigned, so the next employee added
-- gets the next number rather than re-issuing one. GREATEST guards the case
-- where a counter row somehow already exists and is further along.
INSERT INTO "counters" ("doc_type", "fy_code", "last_serial")
VALUES ('EMPLOYEE', '-', (SELECT count(*) FROM "employees"))
ON CONFLICT ("doc_type", "fy_code")
DO UPDATE SET "last_serial" = GREATEST("counters"."last_serial", EXCLUDED."last_serial");
--> statement-breakpoint
CREATE UNIQUE INDEX "employees_employee_code_uniq" ON "employees" USING btree (("payroll" ->> 'employeeCode')) WHERE "employees"."payroll" ->> 'employeeCode' is not null;
