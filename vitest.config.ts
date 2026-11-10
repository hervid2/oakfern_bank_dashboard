import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Two projects, one config (plan.md §7.2): `vitest.workspace.ts` is deprecated
 * since Vitest 3.2 in favour of `test.projects`.
 *
 * - `unit` (`pnpm test`) is pure and needs no database.
 * - `integration` (`pnpm test:int`) connects to the Docker Compose / CI
 *   PostgreSQL through the generated Prisma client, so it gets a longer
 *   timeout and never runs as part of `pnpm test`.
 *
 * Coverage **reports** on `src/server/domain` with **no threshold** (CL-05):
 * feature 000 ships that directory empty on purpose, and a threshold over an
 * empty directory would fail CI for no reason. Thresholds arrive with the first
 * real domain code in feature 001.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        resolve: {
          alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
          },
        },
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        resolve: {
          alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
          },
        },
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          testTimeout: 20_000,
          hookTimeout: 20_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/server/domain/**/*.ts'],
      thresholds: undefined,
    },
  },
});
