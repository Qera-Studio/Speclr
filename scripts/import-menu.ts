/**
 * Loads menu lines onto the services from a JSON mapping.
 *
 *     npx tsx scripts/import-menu.ts scripts/rate-card-menu.json            # dry run
 *     npx tsx scripts/import-menu.ts scripts/rate-card-menu.json --apply    # writes
 *     npx tsx scripts/import-menu.ts scripts/rate-card-menu.json --apply --replace
 *
 * One-time: the five rate cards (Automation, Branding, Design, Development,
 * Social media) were drafted into `scripts/rate-card-menu.json` under the
 * closest of the twenty-two services, and this is what carries them into the
 * database. After that the menu is edited in the app, on each service's own
 * page, and this file is history.
 *
 * The JSON is keyed by service code. A key beginning with `_` is a note for
 * the reviewer and is skipped. Every line is validated with the same schema
 * the app's own form posts through, and ids are assigned with the same rule
 * (`assignMenuIds`), so a line loaded here and a line typed later are the
 * same kind of thing.
 *
 * **Refuses a service that already has a menu** unless `--replace` is given,
 * because the ordinary case for re-running this is a mistake, and a menu the
 * founder has since edited in the app is not something a script should
 * quietly overwrite. `--replace` restarts that service's ids from M1, so it is
 * only safe before any client record or contract cites them.
 */

import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { z } from 'zod';
import { assignMenuIds, menuLineSchema, serviceContentSchema } from '../src/lib/domain/service';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const REPLACE = args.includes('--replace');
const file = args.find((a) => !a.startsWith('--'));

if (!file) {
  console.error('Usage: npx tsx scripts/import-menu.ts <mapping.json> [--apply] [--replace]');
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Is .env.local present?');
  process.exit(1);
}

/** A line as the JSON writes it: no id yet, the script assigns one. */
const importLineSchema = menuLineSchema.omit({ id: true });
const mappingSchema = z.record(z.string(), z.array(importLineSchema).max(200));

const sql = neon(url);

async function main() {
  const raw = JSON.parse(readFileSync(file!, 'utf8')) as Record<string, unknown>;
  const notes = Object.entries(raw).filter(([key]) => key.startsWith('_'));
  const byCode = Object.fromEntries(Object.entries(raw).filter(([key]) => !key.startsWith('_')));

  const parsed = mappingSchema.safeParse(byCode);
  if (!parsed.success) {
    console.error('The mapping is invalid:', parsed.error.issues.slice(0, 5));
    process.exit(1);
  }

  const rows = await sql`select code, name, content from services order by code`;
  const services = new Map(
    rows.map((r) => [r.code as string, { name: r.name as string, content: r.content as Record<string, unknown> }]),
  );

  let total = 0;
  const plan: { code: string; name: string; menu: unknown[]; menuSeq: number }[] = [];
  for (const [code, lines] of Object.entries(parsed.data)) {
    const service = services.get(code);
    if (!service) {
      console.error(`No service ${code} in the database. Fix the mapping before applying.`);
      process.exit(1);
    }
    const existing = serviceContentSchema.pick({ menu: true, menuSeq: true }).parse(service.content);
    if ((existing.menu?.length ?? 0) > 0 && !REPLACE) {
      console.error(
        `Service ${code} (${service.name}) already has ${existing.menu!.length} menu lines. Re-run with --replace to overwrite them.`,
      );
      process.exit(1);
    }
    // From nothing when replacing: the old ids are being retired with the old
    // menu, which is why --replace is only safe before anything cites them.
    const { menu, menuSeq } = assignMenuIds(
      REPLACE ? {} : existing,
      lines.map((line) => ({ ...line, id: '' })),
    );
    plan.push({ code, name: service.name, menu, menuSeq });
    total += menu.length;
    console.log(`${code}  ${service.name.padEnd(36)} ${String(menu.length).padStart(3)} lines`);
  }

  for (const [key, value] of notes) console.log(`\n${key}:`, value);
  console.log(`\n${total} lines across ${plan.length} services.`);

  if (!APPLY) {
    console.log('\nDry run, nothing written. Re-run with --apply.');
    return;
  }

  for (const { code, menu, menuSeq } of plan) {
    await sql`
      update services
      set content = content || ${JSON.stringify({ menu, menuSeq })}::jsonb, updated_at = now()
      where code = ${code}
    `;
  }
  console.log('Written.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
