import { formatCents } from '../src/lib/format';
import { dayKeyOf, startOfBusinessDay } from '../src/server/domain/time';

import {
  averageNetBurnCents,
  checkBalanceInvariant,
  checkInt4Range,
  checkInternalExclusionIsObservable,
  checkInternalLegShape,
  checkRunway,
  checkVolumes,
  moneyFlowOverDays,
  netByClosedMonth,
  SeedCheckError,
  totalCashCents,
  type LedgerRow,
} from './seed/checks';
import { generateDataset } from './seed/generate';
import { contentHash, type HashableRow } from './seed/hash';
import { createSeedClient, readBack, writeDataset } from './seed/write';

/**
 * `pnpm db:seed` — the deterministic demo seed (FR-036).
 *
 * Contract (plan §4.5):
 *   stdout  a summary table, then `content-hash: <sha256>`
 *   exit 0  every self-check passed
 *   exit 1  a BR-002, BR-011, `int4`-range, volume or runway self-check failed,
 *           with the reason printed
 *
 * The run day is the **only** impurity in the whole seed: `new Date()` is read
 * once, here, and immediately collapsed to ET midnight. Everything downstream
 * is a pure function of that single value, which is what makes two runs on the
 * same ET day byte-identical (AC-001-03).
 */

/**
 * The seed is a CLI, so nothing has loaded `.env.local` for it. Node 22's
 * built-in `process.loadEnvFile` is used rather than adding `dotenv`, exactly
 * as `prisma.config.ts` does (plan §7.4). It throws when the file is absent —
 * the normal case in CI, where `DATABASE_URL` comes from the job environment —
 * so the call is guarded and that failure is ignored on purpose.
 */
for (const envFile of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(envFile);
  } catch {
    // No such file: the variable is expected to come from the real environment.
  }
}

const PAD = 34;

const line = (label: string, value: string): void => {
  console.log(`  ${label.padEnd(PAD, '.')} ${value}`);
};

const main = async (): Promise<void> => {
  const runDay = startOfBusinessDay(new Date());

  console.log('');
  console.log('oakfern seed');
  console.log(`  run day (America/New_York) ....... ${dayKeyOf(runDay)}`);

  const dataset = generateDataset(runDay);

  const prisma = createSeedClient();

  try {
    await writeDataset(prisma, dataset);

    const stored = await readBack(prisma);

    // ---------------------------------------------------------------- self-checks

    const ledger: LedgerRow[] = stored.transactions.map((row) => ({
      accountId: row.accountId,
      amountCents: row.amountCents,
      status: row.status,
      method: row.method,
      postedAt: row.postedAt,
      categoryId: row.categoryId,
      counterpartyId: row.counterpartyId,
      transferId: row.transferId,
    }));

    const postedInstants = ledger
      .map((row) => row.postedAt)
      .filter((instant): instant is Date => instant !== null)
      .map((instant) => instant.getTime());
    const ledgerSpanDays = Math.round(
      (Math.max(...postedInstants) - Math.min(...postedInstants)) / 86_400_000,
    );

    const pendingExternalOutflows = stored.transactions.filter(
      (row) =>
        row.status === 'pending' &&
        row.amountCents < 0 &&
        (row.method === 'ach' || row.method === 'wire') &&
        row.postedAt === null &&
        row.settleAt !== null &&
        row.settleAt.getTime() > runDay.getTime(),
    ).length;

    checkVolumes({
      businesses: stored.businesses.length,
      users: stored.users.length,
      accounts: stored.accounts.length,
      cards: stored.cards.length,
      categories: stored.categories.length,
      counterparties: stored.counterparties.length,
      transactions: stored.transactions.length,
      transfers: stored.transfers.length,
      pendingExternalOutflows,
      ledgerSpanDays,
    });

    const balanceSummaries = checkBalanceInvariant(
      ledger,
      stored.accounts.map((account) => account.id),
    );

    checkInternalLegShape(
      ledger,
      stored.transfers.map((transfer) => transfer.id),
    );

    const exclusion = checkInternalExclusionIsObservable(ledger, runDay);

    checkInt4Range([
      ...stored.transactions.map((row) => ({
        label: `Transaction ${row.id}.amountCents`,
        value: row.amountCents,
      })),
      ...stored.transfers.map((row) => ({
        label: `Transfer ${row.id}.amountCents`,
        value: row.amountCents,
      })),
      ...stored.cards.map((row) => ({
        label: `Card ${row.id}.monthlyLimitCents`,
        value: row.monthlyLimitCents,
      })),
      ...balanceSummaries.map((summary) => ({
        label: `account ${summary.accountId} currentBalanceCents`,
        value: summary.currentBalanceCents,
      })),
    ]);

    const totalCents = totalCashCents(ledger);
    const avgBurnCents = averageNetBurnCents(ledger, runDay, 3);
    const runway = checkRunway(totalCents, avgBurnCents);
    const flow30 = moneyFlowOverDays(ledger, runDay, 30, { includeInternal: false });

    // ---------------------------------------------------------------- summary

    const accountNameById = new Map(stored.accounts.map((a) => [a.id, a.name]));

    console.log('');
    console.log('row counts');
    line('Business', String(stored.businesses.length));
    line('User (admin, no password hash)', String(stored.users.length));
    line('Category (global, upserted by key)', String(stored.categories.length));
    line('Account', String(stored.accounts.length));
    line('Card', String(stored.cards.length));
    line('Counterparty', String(stored.counterparties.length));
    line('Transfer', String(stored.transfers.length));
    line('Transaction', String(stored.transactions.length));
    line('  of which internal legs', String(ledger.filter((r) => r.method === 'internal').length));
    line('  of which pending ach/wire out', String(pendingExternalOutflows));
    line('ledger span (days)', String(ledgerSpanDays));

    console.log('');
    console.log('balances (BR-002, via the app’s computeBalances)');
    for (const summary of balanceSummaries) {
      line(
        `${accountNameById.get(summary.accountId) ?? summary.accountId} current / available`,
        `${formatCents(summary.currentBalanceCents)} / ${formatCents(summary.availableBalanceCents)}`,
      );
    }
    line('total cash (FR-007)', formatCents(totalCents));

    console.log('');
    console.log('cash flow (last 30 ET days, internal excluded — BR-009, BR-011)');
    line('money in', formatCents(flow30.inCents));
    line('money out', formatCents(flow30.outCents));
    line('money out including internal', formatCents(exclusion.includingCents));

    console.log('');
    console.log('burn and runway (last 3 closed ET months — FR-010, AC-001-08)');
    for (const month of netByClosedMonth(ledger, runDay, 3)) {
      line(`net ${month.monthKey}`, formatCents(month.netCents, { signDisplay: 'always' }));
    }
    line('average net burn', `${formatCents(avgBurnCents)} / month`);
    line('runway', `${runway.toFixed(1)} months`);

    const tables: { name: string; rows: readonly HashableRow[] }[] = [
      { name: 'Business', rows: stored.businesses as unknown as HashableRow[] },
      { name: 'User', rows: stored.users as unknown as HashableRow[] },
      { name: 'Category', rows: stored.categories as unknown as HashableRow[] },
      { name: 'Account', rows: stored.accounts as unknown as HashableRow[] },
      { name: 'Counterparty', rows: stored.counterparties as unknown as HashableRow[] },
      { name: 'Card', rows: stored.cards as unknown as HashableRow[] },
      { name: 'Transfer', rows: stored.transfers as unknown as HashableRow[] },
      { name: 'Transaction', rows: stored.transactions as unknown as HashableRow[] },
    ];

    console.log('');
    console.log(`content-hash: ${contentHash(tables)}`);
    console.log('');
    console.log('all self-checks passed');
    console.log('');
  } finally {
    await prisma.$disconnect();
  }
};

main().catch((error: unknown) => {
  console.error('');

  if (error instanceof SeedCheckError) {
    console.error(`seed self-check failed — ${error.message}`);
  } else {
    console.error('seed failed');
    console.error(error instanceof Error ? error.stack : String(error));
  }

  console.error('');
  process.exitCode = 1;
});
