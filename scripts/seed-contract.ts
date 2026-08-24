/**
 * Loads the contract library into Postgres from the transcribed specs.
 *
 *     npx tsx scripts/seed-contract.ts            # dry run, writes nothing
 *     npx tsx scripts/seed-contract.ts --apply    # writes
 *
 * Idempotent: every write is an upsert keyed by the row's own id, so running it
 * twice changes nothing and running it after a spec edit brings the tables back
 * in step.
 *
 * **It cannot affect a contract already issued.** A contract copies every Part
 * and every library line it uses onto itself when the service is ticked, so the
 * tables this script writes are the *source* for new contracts and nothing
 * more. That is the same guarantee as the client and studio snapshots
 * (CONTEXT.md §5) and it is what makes reseeding safe.
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
import { SERVICES } from '../src/lib/domain/contract/seed/services';
import { serviceInputSchema, libraryLineSchema } from '../src/lib/domain/service';
import { MSA_CLAUSES, msaClauseSchema } from '../src/lib/domain/contract/msa';

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
  for (const service of SERVICES) {
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
    `${SERVICES.length} services · ${EXCLUSIONS.length} exclusions · ${CLIENT_INPUTS.length} client inputs · ${MSA_CLAUSES.length} clauses`,
  );

  if (!APPLY) {
    console.log('\nDry run — nothing written. Re-run with --apply.');
    return;
  }

  for (const service of SERVICES) {
    const { code, name, scheduleKey, sortOrder, archived, ...content } = service;
    await sql`
      insert into services (code, name, schedule_key, sort_order, content, archived, updated_at)
      values (${code}, ${name}, ${scheduleKey}, ${sortOrder}, ${JSON.stringify(content)}, ${archived}, now())
      on conflict (code) do update set
        name = excluded.name,
        schedule_key = excluded.schedule_key,
        sort_order = excluded.sort_order,
        content = excluded.content,
        updated_at = now()
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
          on conflict (id) do update set
            text = excluded.text, category = excluded.category, updated_at = now()
        `;
      } else {
        await sql`
          insert into client_inputs (id, text, category, updated_at)
          values (${line.id}, ${line.text}, ${line.category}, now())
          on conflict (id) do update set
            text = excluded.text, category = excluded.category, updated_at = now()
        `;
      }
    }
  }

  // Clauses. `number` is the key, and it is never reissued — see msa.ts. An
  // upsert therefore only ever corrects the text of a clause that already means
  // what it means, which is what makes reseeding after a drafting fix safe.
  for (const clause of MSA_CLAUSES) {
    await sql`
      insert into clauses (number, heading, body, updated_at)
      values (${clause.number}, ${clause.heading}, ${JSON.stringify(clause.body)}, now())
      on conflict (number) do update set
        heading = excluded.heading, body = excluded.body, updated_at = now()
    `;
  }

  console.log('Written.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
