import { z } from 'zod';

/**
 * The one place server environment variables are read and validated (AC-001-19,
 * NFR-005, Constitution Title III).
 *
 * Three rules, all of them load-bearing:
 *
 *   1. **No defaults, ever.** A fallback secret is worse than no secret: it
 *      makes a misconfigured deployment look healthy while every session token
 *      is forgeable by anyone who has read the repository. `SESSION_SECRET` is
 *      required and must be at least 32 characters (ADR-0004).
 *   2. **Fails loudly, with the variable named.** The error lists which
 *      variables are wrong and why, and never prints a value — an error message
 *      is not a place to leak a secret.
 *   3. **Lazily, not at module evaluation.** `next build` imports every module;
 *      throwing at import time would fail the *build* of a correctly configured
 *      deployment whose variables only exist at runtime. Parsing on first call
 *      keeps the failure where spec §4 E-1 wants it: at the first request that
 *      needs a secret, as a 503 rather than a broken build.
 *
 * ⚠️ `middleware.ts` must **not** import this module. The edge runtime gets a
 * narrower, dependency-free guard of its own (plan §8 R-9); pulling Zod and this
 * schema into the edge bundle is exactly the failure that risk describes.
 */

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, 'is required — the PostgreSQL connection string used by the runtime client'),
  /**
   * Neon's **direct / unpooled** string. Optional: only the Prisma CLI needs it,
   * and only when deploying migrations (plan §3.4). An empty string counts as
   * absent so `.env.example` can ship the placeholder.
   */
  DIRECT_DATABASE_URL: z
    .string()
    .transform((value) => (value.trim() === '' ? undefined : value))
    .optional(),
  SESSION_SECRET: z
    .string()
    .min(32, 'must be at least 32 characters — generate one with `openssl rand -base64 32`'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvError';
  }
}

/**
 * Validated server environment. Throws `EnvError` naming every offending
 * variable; the result is memoised, so the cost is paid once per process.
 */
export const getEnv = (): Env => {
  if (cached) {
    return cached;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'} ${issue.message}`)
      .join('\n');

    throw new EnvError(
      `Invalid server environment.\n${problems}\n\nCopy .env.example to .env.local and fill it in. No variable has a default.`,
    );
  }

  cached = parsed.data;

  return cached;
};
