import 'server-only';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/**
 * The Drizzle client, bound to Neon's serverless HTTP driver.
 *
 * `server-only` guarantees this module can never be imported into a client
 * bundle — the connection string must never reach the browser. Consumers are
 * the persistence layer and Server Actions, all of which run server-side.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set — cannot connect to Postgres.');
}

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
export { schema };
