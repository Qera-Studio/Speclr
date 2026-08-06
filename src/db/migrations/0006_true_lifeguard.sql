-- Employee codes are for employees, not interns — and a corrected order.
--
-- Migration 0005 assigned a code to every person on the books. That was wrong
-- twice over: an intern is not on the payroll, is never issued a pay slip, and
-- the stipend slip does not print a code — so three of the five codes belonged
-- to nobody in the series and burned numbers in it. And the two that did belong
-- were ordered by when the record happened to be typed, not by the order the
-- founder wanted the series to read.
--
-- Safe to rewrite again for the same reason as 0005: no document has ever been
-- finalized carrying an employee code, so nothing frozen into an issued
-- snapshot is being contradicted. This is the last time these move — from here
-- `withEmployeeCode` keeps whatever a record already holds.

-- Interns hold no code. `- 'employeeCode'` drops just that key, leaving PAN and
-- the rest of the payroll group intact.
UPDATE "employees"
SET "payroll" = "payroll" - 'employeeCode'
WHERE "engagement_type" <> 'employee' AND "payroll" IS NOT NULL;
--> statement-breakpoint
-- The two employees, in the order asked for. Written by id rather than by a
-- rule because no rule produces it: Pragya joined after Shivanshu, so neither
-- joining date nor creation date would order them this way.
UPDATE "employees"
SET "payroll" = coalesce("payroll", '{}'::jsonb) || '{"employeeCode":"QS-EMP-001"}'::jsonb
WHERE "id" = 'd5268023-c73e-44ca-9e70-12f655433302';
--> statement-breakpoint
UPDATE "employees"
SET "payroll" = coalesce("payroll", '{}'::jsonb) || '{"employeeCode":"QS-EMP-002"}'::jsonb
WHERE "id" = '6606f146-918d-4821-a117-9bdeabaf9ee7';
--> statement-breakpoint
-- Wind the counter back to the highest code now in use, so the next employee
-- added is QS-EMP-003 rather than QS-EMP-006. Derived from the data rather than
-- hard-coded, so it stays right if a row was added between 0005 and this.
UPDATE "counters"
SET "last_serial" = (
  SELECT coalesce(max(substring("payroll" ->> 'employeeCode' from 'QS-EMP-(\d+)$')::int), 0)
  FROM "employees"
), "updated_at" = now()
WHERE "doc_type" = 'EMPLOYEE' AND "fy_code" = '-';
