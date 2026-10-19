/**
 * Creates the restricted `speclr_app` login and points the app at it.
 *
 *   npx tsx scripts/create-app-role.ts
 *
 * Run once, as the owner, before migration `0025_app_role_rls`. The role is made with SQL rather than in the
 * Neon console because Neon makes every console role a member of
 * `neon_superuser`, which bypasses row-level security.
 *
 * What it does to `.env.local`, after copying it to `.env.local.bak-<stamp>`:
 * the current `DATABASE_URL` becomes `DATABASE_URL_OWNER` (migrations and
 * backups keep running as the owner), and `DATABASE_URL` becomes the new
 * login. The password is generated here and written there; it is never
 * printed. Refuses to run twice.
 */
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });

import { randomBytes } from 'node:crypto';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const ROLE = 'speclr_app';
const ENV = '.env.local';

async function main() {
  const owner = process.env.DATABASE_URL;
  if (!owner) throw new Error('DATABASE_URL is not set in .env.local.');
  if (process.env.DATABASE_URL_OWNER) {
    throw new Error('DATABASE_URL_OWNER is already set: this has run before. Nothing changed.');
  }

  // URL-safe characters only, so it can sit in a connection string and in
  // the SQL below without escaping. 32 bytes is far past Neon's entropy floor.
  const password = randomBytes(32).toString('base64url');

  const sql = neon(owner);
  const [{ exists }] = (await sql.query(`select exists (select 1 from pg_roles where rolname = $1) as exists`, [
    ROLE,
  ])) as { exists: boolean }[];
  // DDL takes no parameters; the password is base64url, so it cannot close the quote.
  await sql.query(`${exists ? 'ALTER' : 'CREATE'} ROLE ${ROLE} WITH LOGIN PASSWORD '${password}'`);

  const app = new URL(owner);
  app.username = ROLE;
  app.password = password;

  // Prove the login works before the app is pointed at it.
  const [{ who }] = (await neon(app.toString()).query('select current_user as who')) as { who: string }[];
  if (who !== ROLE) throw new Error(`Connected as ${who}, expected ${ROLE}. .env.local not changed.`);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  copyFileSync(ENV, `${ENV}.bak-${stamp}`);
  const lines = readFileSync(ENV, 'utf8').split('\n');
  const at = lines.findIndex((l) => l.startsWith('DATABASE_URL='));
  lines.splice(at, 1, lines[at].replace(/^DATABASE_URL=/, 'DATABASE_URL_OWNER='), `DATABASE_URL="${app.toString()}"`);
  writeFileSync(ENV, lines.join('\n'), { mode: 0o600 });

  console.log(`${exists ? 'Reset' : 'Created'} ${ROLE}, and it connects.`);
  console.log(`.env.local now has DATABASE_URL_OWNER (the owner) and DATABASE_URL (${ROLE}).`);
  console.log(`The previous file is at ${ENV}.bak-${stamp}.`);
}

main().catch((err) => {
  // The message only: an error from the driver can carry the connection string.
  console.error(err instanceof Error ? err.message.replace(/postgres(ql)?:\/\/\S+/g, '<connection string>') : 'Failed.');
  process.exit(1);
});
