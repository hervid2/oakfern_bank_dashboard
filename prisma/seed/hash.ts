import { createHash } from 'node:crypto';

/**
 * The AC-001-03 content hash.
 *
 * The hash is taken over rows **read back out of PostgreSQL**, not over the
 * in-memory dataset. That is deliberate and stronger: hashing the generator's
 * output would prove only that the generator is deterministic, whereas hashing
 * the round trip also catches a database default, a lost column or a silently
 * truncated value. If `@default(now())` ever fired on a seeded row, this hash
 * would differ between runs and the check would fail — which is the point.
 *
 * Canonicalisation rules, so the hash depends on content and never on ordering
 * or on JSON key order:
 *   - rows are sorted by `id` inside each table, and tables are hashed in a
 *     fixed order;
 *   - object keys are sorted;
 *   - `Date` becomes its ISO-8601 string, so ids *and* timestamps are covered,
 *     exactly as AC-001-03 requires;
 *   - `undefined` and `null` are distinguished.
 */

type Scalar = string | number | boolean | null | Date;
export type HashableRow = Record<string, Scalar | undefined>;

const canonicalValue = (value: Scalar | undefined): string => {
  if (value === undefined) {
    return 'u';
  }

  if (value === null) {
    return 'n';
  }

  if (value instanceof Date) {
    return `d:${value.toISOString()}`;
  }

  if (typeof value === 'number') {
    // Integers only, in this schema. Rendering through `String` keeps a float
    // visible rather than rounding it away — a float would change the hash.
    return `i:${String(value)}`;
  }

  if (typeof value === 'boolean') {
    return `b:${String(value)}`;
  }

  return `s:${value}`;
};

const canonicalRow = (row: HashableRow): string =>
  Object.keys(row)
    .sort()
    .map((key) => `${key}=${canonicalValue(row[key])}`)
    .join('|');

const canonicalTable = (name: string, rows: readonly HashableRow[]): string => {
  const lines = rows
    .map(canonicalRow)
    .slice()
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));

  return [`#${name} (${String(rows.length)})`, ...lines].join('\n');
};

/** SHA-256, hex, over every table in the fixed order given. */
export const contentHash = (
  tables: readonly { readonly name: string; readonly rows: readonly HashableRow[] }[],
): string => {
  const hash = createHash('sha256');

  for (const table of tables) {
    hash.update(canonicalTable(table.name, table.rows));
    hash.update('\n');
  }

  return hash.digest('hex');
};
