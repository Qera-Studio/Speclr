import { defineConfig } from 'drizzle-kit';

// Migrations are generated from src/db/schema.ts into src/db/migrations.
// DATABASE_URL comes from .env.local (pulled from Vercel/Neon; gitignored).
// If Neon provisioned the URL under a prefixed name, this reads it via the
// DATABASE_URL env — adjust the env var name here to match what landed.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
