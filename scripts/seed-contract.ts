/**
 * Loads the contract library into Postgres from the transcribed specs.
 *
 *     npx tsx scripts/seed-contract.ts            # dry run, writes nothing
 *     npx tsx scripts/seed-contract.ts --apply    # writes
 *
 * **Inserts, never updates.** A row that already exists is left exactly as it
 * is, whatever this file says about it. The app is the one place a service, a
 * library line or a clause is edited (decided 15 September 2026): every one of
 * those tables has an editor in the app now, and a script that overwrote
 * `content` on every run was silently deleting the rate, the name and the menu
 * lines typed there. It was also reverting in-app clause edits, which CONTEXT.md
 * §5c says must not happen. So this is a first-load script. Running it twice
 * changes nothing; running it after a spec edit changes nothing either, and
 * that is the point. A correction to the transcribed text goes in through the
 * app, where it lands once and stays.
 *
 * **It cannot affect a contract already issued.** A contract copies every Part
 * and every library line it uses onto itself when the service is ticked, so the
 * tables this script writes are the *source* for new contracts and nothing
 * more. That is the same guarantee as the client and studio snapshots
 * (CONTEXT.md §5).
 *
 * Archived rows are left archived. Unarchiving is a decision, and a seed script
 * silently putting a retired exclusion back on every future contract is exactly
 * the kind of quiet change this codebase does not make.
 */

// `.env.local`, not `.env` — that is where Next keeps the connection string,
// and dotenv's default entry point does not look there.
import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { CLIENT_INPUTS, EXCLUSIONS } from '../src/lib/domain/contract/seed/libraries';
import { PARTS } from '../src/lib/domain/seed/parts';
import { serviceInputSchema, libraryLineSchema } from '../src/lib/domain/service';
import {
  MSA_CLAUSES,
  MSA_CLAUSE_SUMMARIES,
  msaClauseSchema,
} from '../src/lib/domain/contract/msa';

const APPLY = process.argv.includes('--apply');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Is .env.local present?');
  process.exit(1);
}

const sql = neon(url);

async function main() {
  // Validate before touching the database. A transcription typo should fail
  // here, loudly, rather than land as a malformed JSONB payload.
  for (const service of PARTS) {
    const parsed = serviceInputSchema.safeParse(service);
    if (!parsed.success) {
      console.error(`Service ${service.code} is invalid:`, parsed.error.issues);
      process.exit(1);
    }
  }
  for (const line of [...EXCLUSIONS, ...CLIENT_INPUTS]) {
    const parsed = libraryLineSchema.safeParse(line);
    if (!parsed.success) {
      console.error(`Library line ${line.id} is invalid:`, parsed.error.issues);
      process.exit(1);
    }
  }
  for (const clause of MSA_CLAUSES) {
    const parsed = msaClauseSchema.safeParse(clause);
    if (!parsed.success) {
      console.error(`Clause ${clause.number} is invalid:`, parsed.error.issues);
      process.exit(1);
    }
  }

  console.log(
    `${PARTS.length} services · ${EXCLUSIONS.length} exclusions · ${CLIENT_INPUTS.length} client inputs · ${MSA_CLAUSES.length} clauses`,
  );

  if (!APPLY) {
    console.log('\nDry run — nothing written. Re-run with --apply.');
    return;
  }

  for (const service of PARTS) {
    const { code, name, scheduleKey, sortOrder, archived, ...content } = service;
    await sql`
      insert into services (code, name, schedule_key, sort_order, content, archived, updated_at)
      values (${code}, ${name}, ${scheduleKey}, ${sortOrder}, ${JSON.stringify(content)}, ${archived}, now())
      on conflict (code) do nothing
    `;
  }

  for (const [table, lines] of [
    ['exclusions', EXCLUSIONS],
    ['client_inputs', CLIENT_INPUTS],
  ] as const) {
    for (const line of lines) {
      // Two statements rather than one interpolated table name: the driver
      // parameterises values, not identifiers, and building SQL by string
      // concatenation is a habit worth not having even where the input is a
      // literal in this file.
      if (table === 'exclusions') {
        await sql`
          insert into exclusions (id, text, category, updated_at)
          values (${line.id}, ${line.text}, ${line.category}, now())
          on conflict (id) do nothing
        `;
      } else {
        await sql`
          insert into client_inputs (id, text, category, updated_at)
          values (${line.id}, ${line.text}, ${line.category}, now())
          on conflict (id) do nothing
        `;
      }
    }
  }

  // Clauses. `number` is the key and is never reissued (msa.ts). A clause
  // already in the table is the library's copy, edited at /client/clauses, and
  // this file's copy of it is only the text it started from.
  for (const clause of MSA_CLAUSES) {
    await sql`
      insert into clauses (number, heading, summary, body, updated_at)
      values (
        ${clause.number},
        ${clause.heading},
        ${MSA_CLAUSE_SUMMARIES[clause.number] ?? null},
        ${JSON.stringify(clause.body)},
        now()
      )
      on conflict (number) do nothing
    `;
  }

  /*
    Summaries onto rows that pre-date the column, and **only** where none has
    been written. The insert above cannot reach them: those rows already exist,
    so `do nothing` fires and they would sit with an empty column for ever.

    `where summary is null` is what keeps this safe to re-run. The whole file
    is written to touch nothing a person has edited (the comment above says so
    for clauses, and the same rule was applied to services and the libraries
    in September), and a summary typed in the library is exactly that.
  */
  for (const [number, summary] of Object.entries(MSA_CLAUSE_SUMMARIES)) {
    await sql`
      update clauses set summary = ${summary}
      where number = ${Number(number)} and summary is null
    `;
  }

  console.log('Written.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
