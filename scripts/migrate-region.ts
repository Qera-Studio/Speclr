/**
 * One-off: copy every row from one Neon project to another, for a region move.
 *
 *     SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... npx tsx scripts/migrate-region.ts
 *     SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... npx tsx scripts/migrate-region.ts --apply
 *
 * Without `--apply` it reads both databases, prints what it would copy, and
 * writes nothing.
 *
 * **The schema is not this script's job.** Run the Drizzle migrations against
 * the target first (`DATABASE_URL=<target> npx drizzle-kit migrate`), so the
 * target's shape comes from the same 16 migration files as production rather
 * than from whatever this script inferred. This copies data into a schema that
 * already exists.
 *
 * Four rules it will not break:
 *
 * 1. **The source is opened read-only.** Nothing here issues a write against
 *    it. A region move that damages the database being moved *from* has removed
 *    the thing it was supposed to be a fallback to.
 *
 * 2. **It refuses a target that already holds rows.** Copying into a populated
 *    database would either duplicate documents or collide on primary keys, and
 *    the failure mode of the first is far worse: two rows for one issued
 *    invoice. Empty target, or it stops.
 *
 * 3. **`documents` is copied last**, because `client_id` and `employee_id`
 *    reference `clients` and `employees`. Nothing else here has a foreign key.
 *
 * 4. **`counters` is copied like any other table, and that is the important
 *    one.** It holds the last claimed serial per (doc type, FY). Lose it and
 *    the next finalize reissues a number that is already on an issued document,
 *    which CGST Rule 46 forbids outright. It is verified explicitly at the end.
 *
 * Safe to re-run only against an empty target: rule 2 is what makes a second
 * run a refusal rather than a duplication.
 */

// `.env.local`, not `.env` — the same reason as `backfill-addresses.ts`.
import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';

/**
 * Copy order. Parents before children, `documents` last because it is the only
 * table with foreign keys (`client_id`, `employee_id`).
 *
 * Listed explicitly rather than discovered from `information_schema`, so a new
 * table added later fails loudly here instead of being silently left behind.
 */
const TABLES = [
  'clients',
  'employees',
  'services',
  'client_inputs',
  'exclusions',
  'clauses',
  'studio_settings',
  'counters',
  'documents',
] as const;

const APPLY = process.argv.includes('--apply');

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function main() {
  const source = neon(required('SOURCE_DATABASE_URL'));
  const target = neon(required('TARGET_DATABASE_URL'));

  if (required('SOURCE_DATABASE_URL') === required('TARGET_DATABASE_URL')) {
    throw new Error('Source and target are the same database');
  }

  // Every table the target is missing, named before anything is copied, so a
  // forgotten `drizzle-kit migrate` fails here rather than half way through.
  const present = new Set(
    (
      await target`select table_name from information_schema.tables where table_schema = 'public'`
    ).map((r) => r.table_name as string),
  );
  const missing = TABLES.filter((t) => !present.has(t));
  if (missing.length > 0) {
    throw new Error(
      `Target is missing ${missing.join(', ')}. Run the migrations first:\n` +
        '  DATABASE_URL=<target> npx drizzle-kit migrate',
    );
  }

  /**
   * The one row a fresh target legitimately holds, and it must not survive.
   *
   * Migration 0005 seeds `counters` with the employee-code counter, set to
   * `count(*)` of `employees` — which is 0 on a database that has only just had
   * its schema built. The source's value is the true one: employee codes are
   * claimed from it and frozen onto every slip already issued (CONTEXT.md §6a),
   * so carrying a 0 across would reissue `QS-EMP-001` to a second person.
   *
   * Deleted rather than left in place, because the copy below inserts the
   * source's own row and would otherwise collide on the primary key. This is
   * the *only* pre-existing row tolerated; anything else still stops the run.
   */
  if (APPLY) {
    const seeded = await target`
      delete from counters where doc_type = 'EMPLOYEE' and fy_code = '-' and last_serial = 0
      returning doc_type`;
    if (seeded.length > 0) {
      console.log("  cleared migration 0005's empty EMPLOYEE counter seed\n");
    }
  }

  // Rule 2: an empty target, or nothing happens.
  const occupied: string[] = [];
  for (const table of TABLES) {
    const [{ count }] = await target.query(`select count(*)::int as count from "${table}"`);
    if (count > 0) occupied.push(`${table} (${count})`);
  }
  if (occupied.length > 0) {
    throw new Error(
      `Target is not empty: ${occupied.join(', ')}. ` +
        'Copying into a populated database risks duplicating an issued document.' +
        (APPLY ? '' : "\n(A lone EMPLOYEE counter at 0 is migration 0005's seed and is cleared by --apply.)"),
    );
  }

  let total = 0;
  for (const table of TABLES) {
    const rows = await source.query(`select * from "${table}"`);
    total += rows.length;
    if (rows.length === 0) {
      console.log(`  ${table}: empty`);
      continue;
    }

    if (!APPLY) {
      console.log(`  ${table}: would copy ${rows.length}`);
      continue;
    }

    // Column names come from the row itself rather than a hand-written list, so
    // a schema change needs no edit here. Values are parameterised, never
    // interpolated; the identifiers are quoted and come from our own TABLES
    // list and the source's own column names, not from user input.
    const columns = Object.keys(rows[0]);
    const quoted = columns.map((c) => `"${c}"`).join(', ');

    for (const row of rows) {
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const values = columns.map((c) => {
        const v = (row as Record<string, unknown>)[c];
        // JSONB arrives as a parsed object and must go back as JSON text, or
        // the driver sends '[object Object]'. Dates and primitives pass through.
        return v !== null && typeof v === 'object' && !(v instanceof Date)
          ? JSON.stringify(v)
          : v;
      });
      await target.query(`insert into "${table}" (${quoted}) values (${placeholders})`, values);
    }
    console.log(`  ${table}: copied ${rows.length}`);
  }

  if (!APPLY) {
    console.log(`\nDry run. ${total} rows would be copied. Re-run with --apply.`);
    return;
  }

  // Verify rather than assume. Every table's count must agree, and the two that
  // decide whether an issued document can be reprinted or renumbered are named
  // individually so a mismatch says which.
  console.log('\nVerifying:');
  let ok = true;
  for (const table of TABLES) {
    const [a] = await source.query(`select count(*)::int as count from "${table}"`);
    const [b] = await target.query(`select count(*)::int as count from "${table}"`);
    const agree = a.count === b.count;
    ok &&= agree;
    console.log(`  ${agree ? 'ok  ' : 'FAIL'} ${table}: ${a.count} -> ${b.count}`);
  }

  const serials = await target`select doc_type, fy_code, last_serial from counters order by doc_type`;
  console.log('\nCounters (a lost row reissues a number already on an issued document):');
  for (const c of serials) console.log(`  ${c.doc_type} ${c.fy_code}: ${c.last_serial}`);

  if (!ok) throw new Error('Row counts do not agree. Do not switch DATABASE_URL.');
  console.log('\nAll tables agree.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
