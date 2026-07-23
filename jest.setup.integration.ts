/**
 * Loads .env.local for integration tests only.
 *
 * Next's jest transform deliberately skips `.env.local` in the `test`
 * environment (to keep unit tests hermetic), so DATABASE_URL isn't present.
 * Integration tests genuinely need the live connection string, so we load it
 * explicitly here. Wired in via `setupFiles` only when RUN_INTEGRATION is set.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env.local') });
