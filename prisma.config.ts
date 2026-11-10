import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 configuration (plan.md §7.2).
 *
 * In v7 the datasource URL is resolved HERE, not by `env()` inside
 * `schema.prisma`. The Prisma CLI does not load `.env` files itself, so we use
 * Node 22's built-in `process.loadEnvFile()` instead of adding `dotenv`
 * (plan.md §7.4). It throws when the file is absent — which is the normal case
 * in CI, where `DATABASE_URL` comes from the job environment — so the call is
 * guarded and the failure is ignored on purpose.
 */
for (const envFile of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(envFile);
  } catch {
    // No such file: the variable is expected to come from the real environment.
  }
}

/**
 * The CLI datasource prefers `DIRECT_DATABASE_URL` (plan §3.4).
 *
 * Neon's pooled host (PgBouncer, `-pooler`) cannot run `prisma migrate deploy`:
 * migrations need session-level features — advisory locks and non-pipelined
 * DDL — that a transaction pool does not provide. The runtime client in
 * `src/server/repositories/client.ts` keeps reading `DATABASE_URL`, so the pool
 * stays pooled and only the CLI goes direct.
 *
 * Empty strings count as absent: `.env.example` ships
 * `DIRECT_DATABASE_URL=""`, and `??` alone would hand the CLI an empty URL.
 */
const firstNonEmpty = (...values: readonly (string | undefined)[]): string => {
  for (const value of values) {
    if (value !== undefined && value.trim() !== '') {
      return value;
    }
  }

  throw new Error(
    'Neither DIRECT_DATABASE_URL nor DATABASE_URL is set. Copy .env.example to .env.local and fill it in.',
  );
};

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'pnpm db:seed',
  },
  datasource: {
    url: firstNonEmpty(process.env.DIRECT_DATABASE_URL, process.env.DATABASE_URL),
  },
});
