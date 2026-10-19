import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// Next keeps the connection string in .env.local, which drizzle-kit does not
// read on its own; without this every migrate needed the env sourced by hand.
config({ path: '.env.local' });

// Migrations are generated from src/db/schema.ts into src/db/migrations.
// DATABASE_URL comes from .env.local (pulled from Vercel/Neon; gitignored).
// If Neon provisioned the URL under a prefixed name, this reads it via the
// DATABASE_URL env — adjust the env var name here to match what landed.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Migrations change the schema, so they run as the owner. The app's own
    // DATABASE_URL becomes a restricted role once row-level security is on
    // (`src/db/pending/README.md`); until then the two are the same login.
    url: (process.env.DATABASE_URL_OWNER ?? process.env.DATABASE_URL)!,
  },
  strict: true,
  verbose: true,
});
