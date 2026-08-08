-- Services are renumbered to run in the order an engagement does: Setup 01–04,
-- Build 05–14, Retainer 15–20, Audit 21–22. Previously Build held 01–10 and
-- Setup sat at 17–20, which read backwards against both the tabs and the
-- Schedules.
--
-- Two passes, because `code` is the primary key and a single UPDATE would
-- collide (17 → 01 while 01 is still 01). The first parks every code out of the
-- numeric space; the second lands them.
--
-- No `documents` rewrite: a contract draft copies its Parts and keys its blanks
-- `part.<code>.<section>#<n>`, so a renumbering would orphan every filled value
-- — but there is no CON document of any status in this database, and none has
-- ever been finalized. If that changes before this runs, mirror the two-pass
-- rewrite over `data::text` the way 0010 does for the schedule keys.
UPDATE "services" SET "code" = 'T' || "code";
--> statement-breakpoint
UPDATE "services" SET
  "code" = CASE "code"
    WHEN 'T17' THEN '01' WHEN 'T18' THEN '02' WHEN 'T19' THEN '03'
    WHEN 'T20' THEN '04' WHEN 'T01' THEN '05' WHEN 'T02' THEN '06'
    WHEN 'T03' THEN '07' WHEN 'T04' THEN '08' WHEN 'T05' THEN '09'
    WHEN 'T06' THEN '10' WHEN 'T07' THEN '11' WHEN 'T08' THEN '12'
    WHEN 'T09' THEN '13' WHEN 'T10' THEN '14' WHEN 'T11' THEN '15'
    WHEN 'T12' THEN '16' WHEN 'T13' THEN '17' WHEN 'T14' THEN '18'
    WHEN 'T15' THEN '19' WHEN 'T16' THEN '20' WHEN 'T21' THEN '21'
    WHEN 'T22' THEN '22'
  END;
--> statement-breakpoint
-- sort_order has always been the code as a number, and stays so.
UPDATE "services" SET "sort_order" = "code"::int;
