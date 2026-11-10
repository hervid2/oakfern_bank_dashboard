import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/**
 * ADR-0001 layering, enforced as lint errors.
 *
 * Prisma 7 generates its client into `src/generated/prisma`, so the client is
 * imported from that folder and NOT from `@prisma/client`. Every block below
 * therefore has to name BOTH specifiers: a rule naming only `@prisma/client`
 * would be silently toothless (plan.md §4.4, risk R2).
 */
const PRISMA_IMPORTS = [
  '@prisma/client',
  '@prisma/client/*',
  '@/generated/prisma',
  '@/generated/prisma/**',
  '**/generated/prisma',
  '**/generated/prisma/**',
];

const FRAMEWORK_IMPORTS = ['next', 'next/*', 'next/**', 'react', 'react-dom', 'react/**'];

const REPOSITORY_IMPORTS = [
  '@/server/repositories',
  '@/server/repositories/**',
  '**/server/repositories/**',
  '../repositories/*',
  '../../repositories/*',
];

const SERVICE_IMPORTS = [
  '@/server/services',
  '@/server/services/**',
  '**/server/services/**',
  '../services/*',
  '../../services/*',
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // ADR-0001 block 1 — domain is pure TypeScript: no framework, no Prisma, and
  // no reaching outwards into services or repositories. This is the rule the
  // AC-000-03 lint probe trips.
  {
    files: ['src/server/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                ...FRAMEWORK_IMPORTS,
                ...PRISMA_IMPORTS,
                ...REPOSITORY_IMPORTS,
                ...SERVICE_IMPORTS,
              ],
              message:
                'ADR-0001: src/server/domain is pure TypeScript. No Next, React, Prisma (including the generated client), services or repositories.',
            },
          ],
        },
      ],
    },
  },

  // ADR-0001 block 2 — services orchestrate use cases through repositories;
  // they must not touch Prisma or the framework directly.
  {
    files: ['src/server/services/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [...FRAMEWORK_IMPORTS, ...PRISMA_IMPORTS],
              message:
                'ADR-0001: services must not import Next, React or Prisma (including the generated client). Go through a repository.',
            },
          ],
        },
      ],
    },
  },

  // ADR-0001 block 3 — app/ and actions/ are thin adapters: validate with Zod,
  // call a service, map the result. They never reach the data layer directly.
  {
    files: ['src/app/**/*.{ts,tsx}', 'src/actions/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [...PRISMA_IMPORTS, ...REPOSITORY_IMPORTS],
              message:
                'ADR-0001: Route Handlers, pages and Server Actions must call a service, never Prisma (including the generated client) or a repository.',
            },
          ],
        },
      ],
    },
  },

  // ADR-0001 block 4 — components stay presentational. Pre-installed for
  // feature 001; no component exists yet.
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/server', '@/server/**', '**/src/server/**'],
              message:
                'ADR-0001: components must not import from src/server. Receive data as props or call a Server Action.',
            },
          ],
        },
      ],
    },
  },

  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Oakfern additions:
    'src/generated/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    '.playwright-mcp/**',
    'pnpm-lock.yaml',
  ]),
]);

export default eslintConfig;
