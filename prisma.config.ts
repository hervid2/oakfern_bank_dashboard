import { defineConfig, env } from 'prisma/config';

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

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
