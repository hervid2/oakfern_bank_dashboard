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
 * Coverage is **enforced** on `src/server/domain` at **80 %** (ASM-001-14,
 * task T-09). Feature 000 shipped that directory empty and deliberately left
 * the threshold off, because a threshold over an empty directory fails CI for no
 * reason. 001 fills it with the money, balance, time and error primitives, so
 * the threshold is switched on here and met by writing tests — never by lowering
 * it (plan §8 R-8). The scope stays `src/server/domain` on purpose: it is the
 * code where a wrong number is a wrong number everywhere, and a global
 * percentage over adapters would be a figure nobody could act on.
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
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
