/**
 * A backup that costs nothing: every table, as dated JSON.
 *
 *   npx tsx scripts/backup.ts            # to ~/speclr-backups/<timestamp>/
 *   BACKUP_DIR=/Volumes/X npx tsx scripts/backup.ts
 *
 * **Why it exists.** Neon's free tier keeps a few hours of point-in-time
 * recovery, and CGST s.36 wants an issued invoice kept unaltered for 72
 * months. Until a paid tier is affordable, this is the copy that survives a
 * bad migration or a deleted branch. Run it after every finalize.
 *
 * **Every table, found rather than listed.** The tables are read off the
 * schema's own exports, so a table added later cannot be left out of the
 * backup by somebody forgetting to add it here.
 *
 * **It holds third parties' personal data** (names, PANs, GSTINs, phone
 * numbers), so it is written outside the repository by default, where no
 * commit can pick it up, and to a folder only this user can read. It does not
 * copy Blob files (attachments, issued PDFs); those live in their own store.
 *
 * **Restoring** is `migrate-region.ts` with `SOURCE_BACKUP_DIR` set: into an
 * empty database only, parents before children, counters verified.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { neon } from '@neondatabase/serverless';
import { getTableName, is } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import * as schema from '../src/db/schema';

/** Every table the schema exports, by its database name. */
export function tablesOf(mod: Record<string, unknown>): PgTable[] {
  return Object.values(mod).filter((value): value is PgTable => is(value, PgTable));
}

async function main() {
  // The owner where there is one: a backup reads every table whole, and the
  // app's restricted role is held to its policies.
  const url = process.env.DATABASE_URL_OWNER ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (looked in .env.local).');
  const sql = neon(url);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = join(process.env.BACKUP_DIR ?? join(homedir(), 'speclr-backups'), stamp);
  mkdirSync(dir, { recursive: true, mode: 0o700 });

  // A table the schema declares but the database does not have yet is one a
  // pending migration is about to create, which is exactly when this runs
  // (`npm run db:migrate`). Nothing is in it to lose, so it is skipped.
  const existing = new Set(
    ((await sql.query(`select table_name from information_schema.tables where table_schema = 'public'`)) as {
      table_name: string;
    }[]).map((r) => r.table_name),
  );

  const counts: Record<string, number> = {};
  for (const table of tablesOf(schema)) {
    const name = getTableName(table);
    if (!existing.has(name)) {
      console.log(`  ${name}: not created yet, skipped`);
      continue;
    }
    // Raw rows, database column names and all, so `migrate-region.ts` can
    // restore a folder exactly as it copies a live database.
    const rows = await sql.query(`select * from "${name}"`);
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(rows, null, 2), { mode: 0o600 });
    counts[name] = rows.length;
  }
  writeFileSync(
    join(dir, 'manifest.json'),
    JSON.stringify({ takenAt: new Date().toISOString(), tables: counts }, null, 2),
    { mode: 0o600 },
  );

  console.log(`Backed up ${Object.keys(counts).length} tables to ${dir}`);
  for (const [name, n] of Object.entries(counts)) console.log(`  ${name}: ${n}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
