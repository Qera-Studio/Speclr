/**
 * One-off backfill: recompose stored addresses so state and country share a
 * line ('Uttar Pradesh, India' rather than two lines).
 *
 *     npx tsx scripts/backfill-addresses.ts            # dry run, writes nothing
 *     npx tsx scripts/backfill-addresses.ts --apply    # writes
 *
 * Two rules this script will not break:
 *
 * 1. **Documents are never touched.** They carry frozen client/employee/studio
 *    snapshots. An issued invoice must reprint byte-identically years later
 *    (CGST s.36 / Rule 46) — rewriting one to a prettier address is precisely
 *    the compliance bug the snapshot pattern exists to prevent. This script
 *    reads and writes `clients`, `employees` and `studio_settings` only.
 *
 * 2. **Rows without `addressParts` are skipped, never guessed.** Those hold
 *    hand-typed text with no structure to recompose from; parsing it back into
 *    parts would be inventing data. They keep their stored address until
 *    someone edits them through the form.
 *
 * Safe to run twice — recomposing an already-correct address is a no-op, and
 * unchanged rows are not written.
 */

// `.env.local`, not `.env` — that is where Next keeps the connection string,
// and dotenv's default entry point does not look there.
import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { clients, employees, studioSettings } from '../src/db/schema';
import { composeAddress, isEmptyAddressParts } from '../src/lib/domain/address';
import { STUDIO_INFO } from '../src/lib/domain/studio';

/**
 * The studio's address is free text typed into /settings, not composed from
 * parts, so it cannot be recomputed. It is only rewritten when it still matches
 * the old seeded literal exactly — anything else has been edited by hand, and
 * this script has no business rephrasing it.
 */
const OLD_STUDIO_ADDRESS =
  'C-204,\nMGI Gharaunda, Raj Nagar Extension,\nGhaziabad - 201017\nIndia';

/**
 * Punctuation- and layout-insensitive form, for deciding whether a hand-typed
 * studio address *says the same thing* as the canonical one. Re-punctuating
 * "Ghaziabad - 201017,\nUttar Pradesh,\nIndia" into
 * "Ghaziabad - 201017\nUttar Pradesh, India" is a formatting fix. Rewriting an
 * address that names a different place is not, and must not happen silently.
 */
function sameAddress(a: string, b: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/,/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  return normalize(a) === normalize(b);
}

const apply = process.argv.includes('--apply');

function show(value: string): string {
  return value.replace(/\n/g, ' ⏎ ');
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Add it to .env.local and retry.');
    process.exit(1);
  }

  const db = drizzle(neon(connectionString));

  let changed = 0;
  let skippedNoParts = 0;
  let alreadyCorrect = 0;

  for (const [label, table] of [
    ['client', clients],
    ['employee', employees],
  ] as const) {
    const rows = await db.select().from(table);

    for (const row of rows) {
      if (isEmptyAddressParts(row.addressParts ?? undefined)) {
        skippedNoParts += 1;
        console.log(`skip   ${label} ${row.name} — no structured address to recompose from`);
        continue;
      }

      const next = composeAddress(row.addressParts!);
      if (next === row.address) {
        alreadyCorrect += 1;
        continue;
      }

      changed += 1;
      console.log(`change ${label} ${row.name}`);
      console.log(`         from: ${show(row.address)}`);
      console.log(`         to:   ${show(next)}`);

      if (apply) {
        await db
          .update(table)
          .set({ address: next, updatedAt: new Date() })
          .where(eq(table.id, row.id));
      }
    }
  }

  // ── Studio ────────────────────────────────────────────────────────────────
  const [studioRow] = await db.select().from(studioSettings);
  if (!studioRow) {
    console.log('skip   studio — no settings row yet; the seeded constant already has the state');
  } else if (studioRow.info.address === STUDIO_INFO.address) {
    alreadyCorrect += 1;
  } else if (
    studioRow.info.address === OLD_STUDIO_ADDRESS ||
    sameAddress(studioRow.info.address, STUDIO_INFO.address)
  ) {
    changed += 1;
    console.log('change studio');
    console.log(`         from: ${show(studioRow.info.address)}`);
    console.log(`         to:   ${show(STUDIO_INFO.address)}`);
    if (apply) {
      await db
        .update(studioSettings)
        .set({
          info: { ...studioRow.info, address: STUDIO_INFO.address },
          updatedAt: new Date(),
        })
        .where(eq(studioSettings.id, studioRow.id));
    }
  } else {
    console.log('skip   studio — address was edited by hand; update it at /settings if you want');
    console.log(`         stored: ${show(studioRow.info.address)}`);
  }

  console.log(
    `\n${apply ? 'applied' : 'dry run'}: ${changed} to change, ` +
      `${alreadyCorrect} already correct, ${skippedNoParts} skipped (no structured address).`,
  );
  if (!apply && changed > 0) console.log('Re-run with --apply to write.');
  console.log('Issued documents were not read or written — their snapshots are frozen.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
