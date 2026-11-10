import { en, Faker } from '@faker-js/faker';
import { TZDate } from '@date-fns/tz';

import {
  BUSINESS_TIME_ZONE,
  startOfBusinessDay,
  startOfBusinessMonth,
} from '../../src/server/domain/time';

import {
  ACCOUNT_OPERATING,
  ACCOUNT_PAYROLL,
  ACCOUNTS,
  BALANCE_FLOOR_CENTS,
  BUSINESS,
  CARD_DAILY_SPEND,
  CARD_SPEND_CATEGORY_KEYS,
  CARD_SPEND_RANGES,
  CARD_SPEND_WEEKDAY_MAX,
  CARD_SPEND_WEEKDAY_MIN,
  CARD_SPEND_WEEKEND_MAX,
  CARD_SPEND_WEEKEND_MIN,
  CARDS,
  CATEGORIES,
  CONTRACTOR_MAX_CENTS,
  CONTRACTOR_MIN_CENTS,
  CONTRACTORS_PER_MONTH,
  COUNTERPARTIES,
  counterpartyIndexByName,
  counterpartyIndexesByCategory,
  DEMO_USER,
  FAKER_SEED,
  FUNDING_SOURCES,
  HISTORY_MONTHS,
  INTEREST_ACCOUNTS,
  INTEREST_MAX_CENTS,
  INTEREST_MIN_CENTS,
  MONTHLY_OUTFLOWS,
  PAYROLL_DAYS,
  PAYROLL_MAX_CENTS,
  PAYROLL_MIN_CENTS,
  PENDING_PAYMENTS,
  REVENUE_MAX_CENTS,
  REVENUE_MIN_CENTS,
  REVENUE_PER_MONTH,
  TARGET_RUNWAY_MONTHS,
  TAX_DAY_OF_MONTH,
  TAX_MAX_CENTS,
  TAX_MIN_CENTS,
  TAX_MONTHS,
  TRANSFER_ROUNDING_CENTS,
  UNSETTLED_PAYMENTS,
  type SeedMethod,
} from './catalog';
import { averageNetBurnCents, type FlowRow } from './checks';

/**
 * The pure generator (spec §6.4, AC-001-03).
 *
 * `generateDataset(runDay)` is a **pure function**: same `runDay`, same output,
 * byte for byte, including every id and every timestamp. That is the whole of
 * AC-001-03, and it costs three disciplines:
 *
 *   1. **No clock.** `runDay` is a parameter. Nothing here calls `new Date()`
 *      except to convert a known epoch millisecond value.
 *   2. **No database defaults.** The seed mints every `id`, `createdAt`,
 *      `postedAt` and `settleAt` itself (ASM-001-03). `@default(cuid())` and
 *      `@default(now())` stay on the models for rows the *app* creates at
 *      runtime, but a seeded row never reaches them.
 *   3. **One RNG, consumed in a fixed order.** A single faker instance seeded
 *      with `FAKER_SEED`, drawn from in exactly the sequence below.
 *
 * ## How the runway is made to land in the 14–24 month band (AC-001-08)
 *
 * The plan proposed a *bounded search* over an outflow multiplier. Implemented
 * here instead is the closed form, which is both exact and O(1):
 *
 *   - Internal transfers are **excluded** from burn (BR-011) and their two legs
 *     sum to zero, so neither the BR-002 floor logic nor the funding transfers it
 *     injects can move `avgBurn` or `totalCash`. The coupling the plan feared is
 *     structurally absent.
 *   - Therefore `avgBurn` is a function of the external events alone, and
 *     `totalCash = openingCapital + Σ(posted external events)`.
 *   - So the generator computes `avgBurn` from the events first, then sizes
 *     `openingCapital = TARGET_RUNWAY_MONTHS × avgBurn − Σ(posted events)`.
 *     The runway is then exactly `TARGET_RUNWAY_MONTHS` by construction.
 *
 * This is also the more honest of the two mechanisms: it fixes how much money
 * the business raised, rather than distorting how much it spends.
 */

/** 0 Operating · 1 Payroll · 2 Reserve · 3 Treasury. */
type AccountIndex = number;

export type SeedStatus = 'posted' | 'pending' | 'canceled' | 'failed';

/** One intended ledger movement, before ids and before floor correction. */
interface LedgerEvent {
  readonly at: Date;
  readonly accountIndex: AccountIndex;
  /** Signed cents: inflows positive, outflows negative (BR-001). */
  readonly amountCents: number;
  readonly method: SeedMethod;
  readonly status: SeedStatus;
  readonly categoryKey: string | null;
  readonly counterpartyIndex: number | null;
  readonly cardIndex: number | null;
  readonly memo: string;
  readonly settleAt: Date | null;
  /** Insertion sequence, the tie-breaker that keeps the chronological sort stable. */
  readonly sequence: number;
}

export interface SeedBusiness {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly createdAt: Date;
}

export interface SeedUser {
  readonly id: string;
  readonly businessId: string;
  readonly email: string;
  readonly name: string;
  readonly role: 'admin';
  readonly passwordHash: null;
  readonly createdAt: Date;
}

export interface SeedCategory {
  readonly id: string;
  readonly key: string;
  readonly label: string;
  readonly direction: 'in' | 'out' | 'both';
  readonly sortOrder: number;
}

export interface SeedAccount {
  readonly id: string;
  readonly businessId: string;
  readonly name: string;
  readonly type: 'checking' | 'savings' | 'treasury';
  readonly accountNumber: string;
  readonly routingNumber: string;
  readonly currency: 'USD';
  readonly openedAt: Date;
}

export interface SeedCounterparty {
  readonly id: string;
  readonly businessId: string;
  readonly name: string;
  readonly kind: 'recipient' | 'merchant';
  readonly accountNumber: string | null;
  readonly routingNumber: string | null;
  readonly defaultCategoryId: string | null;
  readonly createdAt: Date;
}

export interface SeedCard {
  readonly id: string;
  readonly businessId: string;
  readonly accountId: string;
  readonly holderName: string;
  readonly formFactor: 'virtual' | 'physical';
  readonly last4: string;
  readonly status: 'active' | 'frozen';
  readonly monthlyLimitCents: number;
  readonly createdAt: Date;
}

export interface SeedTransfer {
  readonly id: string;
  readonly businessId: string;
  readonly sourceAccountId: string;
  readonly destinationAccountId: string;
  readonly amountCents: number;
  readonly idempotencyKey: string;
  readonly createdAt: Date;
}

export interface SeedTransaction {
  readonly id: string;
  readonly businessId: string;
  readonly accountId: string;
  readonly amountCents: number;
  readonly status: SeedStatus;
  readonly method: SeedMethod;
  readonly categoryId: string | null;
  readonly counterpartyId: string | null;
  readonly cardId: string | null;
  readonly transferId: string | null;
  readonly memo: string | null;
  readonly note: string | null;
  readonly idempotencyKey: string;
  readonly createdAt: Date;
  readonly settleAt: Date | null;
  readonly postedAt: Date | null;
}

export interface SeedDataset {
  readonly runDay: Date;
  readonly windowStart: Date;
  readonly business: SeedBusiness;
  readonly user: SeedUser;
  readonly categories: readonly SeedCategory[];
  readonly accounts: readonly SeedAccount[];
  readonly counterparties: readonly SeedCounterparty[];
  readonly cards: readonly SeedCard[];
  readonly transfers: readonly SeedTransfer[];
  readonly transactions: readonly SeedTransaction[];
  readonly openingCapitalCents: number;
  readonly averageNetBurnCents: number;
}

/**
 * Deterministic, readable ids. Not cuids: a cuid is deliberately
 * non-reproducible, which is exactly what AC-001-03 forbids. The schema keeps
 * `@default(cuid())` for rows the app creates at runtime.
 */
const mintId = (kind: string, index: number): string =>
  `seed_${kind}_${index.toString().padStart(6, '0')}`;

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/**
 * An instant inside the given ET day. `hour` stays under 23 so that the result
 * never escapes the 23-hour spring-DST day (BR-009 example 2).
 */
const atHour = (etDayStart: Date, hour: number, minute: number): Date =>
  new Date(etDayStart.getTime() + hour * HOUR_MS + minute * MINUTE_MS);

/** Day of week in the business zone: 0 Sunday … 6 Saturday. */
const businessDayOfWeek = (instant: Date): number =>
  new TZDate(instant, BUSINESS_TIME_ZONE).getDay();

/** ET calendar month index of an instant: 0 January … 11 December. */
const businessMonthIndex = (instant: Date): number =>
  new TZDate(instant, BUSINESS_TIME_ZONE).getMonth();

export const generateDataset = (runDay: Date): SeedDataset => {
  const faker = new Faker({ locale: en });
  faker.seed(FAKER_SEED);

  const windowStart = startOfBusinessMonth(runDay, -HISTORY_MONTHS);
  /** Exclusive upper bound: nothing posts in the future. */
  const horizon = startOfBusinessDay(runDay, 1);

  // ---------------------------------------------------------------- reference data

  const business: SeedBusiness = {
    id: mintId('biz', 1),
    name: BUSINESS.name,
    slug: BUSINESS.slug,
    createdAt: windowStart,
  };

  const user: SeedUser = {
    id: mintId('usr', 1),
    businessId: business.id,
    email: DEMO_USER.email,
    name: DEMO_USER.name,
    role: 'admin',
    passwordHash: null,
    createdAt: windowStart,
  };

  const categories: SeedCategory[] = CATEGORIES.map((category, index) => ({
    id: mintId('cat', index + 1),
    key: category.key,
    label: category.label,
    direction: category.direction,
    sortOrder: index + 1,
  }));

  const categoryIdByKey = new Map(categories.map((category) => [category.key, category.id]));

  const categoryId = (key: string | null): string | null => {
    if (key === null) {
      return null;
    }

    const id = categoryIdByKey.get(key);

    if (id === undefined) {
      throw new Error(`generate: unknown category key ${key}`);
    }

    return id;
  };

  const accounts: SeedAccount[] = ACCOUNTS.map((account, index) => ({
    id: mintId('acc', index + 1),
    businessId: business.id,
    name: account.name,
    type: account.type,
    accountNumber: account.accountNumber,
    routingNumber: account.routingNumber,
    currency: 'USD',
    openedAt: windowStart,
  }));

  const counterparties: SeedCounterparty[] = COUNTERPARTIES.map((counterparty, index) => ({
    id: mintId('cpy', index + 1),
    businessId: business.id,
    name: counterparty.name,
    kind: counterparty.kind,
    // Only payees we send money to have bank coordinates on file.
    accountNumber:
      counterparty.kind === 'recipient'
        ? faker.string.numeric({ length: 11, allowLeadingZeros: false })
        : null,
    routingNumber: counterparty.kind === 'recipient' ? '011000015' : null,
    defaultCategoryId: categoryId(counterparty.categoryKey),
    createdAt: windowStart,
  }));

  const cards: SeedCard[] = CARDS.map((card, index) => ({
    id: mintId('crd', index + 1),
    businessId: business.id,
    accountId: accounts[card.accountIndex].id,
    holderName: faker.person.fullName(),
    formFactor: card.formFactor,
    last4: card.last4,
    status: card.status,
    monthlyLimitCents: card.monthlyLimitCents,
    createdAt: windowStart,
  }));

  // ---------------------------------------------------------------- the event stream

  const events: LedgerEvent[] = [];
  let sequence = 0;

  const push = (event: Omit<LedgerEvent, 'sequence'>): void => {
    if (event.at.getTime() < windowStart.getTime() || event.at.getTime() >= horizon.getTime()) {
      return;
    }

    sequence += 1;
    events.push({ ...event, sequence });
  };

  const revenueCounterparties = counterpartyIndexesByCategory('revenue');
  const contractorCounterparties = counterpartyIndexesByCategory('contractors');
  const taxCounterparties = counterpartyIndexesByCategory('taxes');
  const payrollCounterparty = counterpartyIndexByName('GUSTO PAYROLL SERVICES');

  /** Month offsets, oldest first: `HISTORY_MONTHS` closed months plus the current partial one. */
  for (let offset = HISTORY_MONTHS; offset >= 0; offset -= 1) {
    const monthStart = startOfBusinessMonth(runDay, -offset);
    const etMonthIndex = businessMonthIndex(monthStart);
    const dayInMonth = (dayOfMonth: number): Date => startOfBusinessDay(monthStart, dayOfMonth - 1);

    // Customer receipts. ACH mostly, wire for the larger ones. ASM-001-06: the
    // domain model's "ACH and wire are outflows" invariant binds *user-created*
    // movements, not inbound settlement.
    for (let index = 0; index < REVENUE_PER_MONTH; index += 1) {
      const amountCents = faker.number.int({ min: REVENUE_MIN_CENTS, max: REVENUE_MAX_CENTS });

      push({
        at: atHour(dayInMonth(faker.number.int({ min: 1, max: 28 })), 10, faker.number.int(59)),
        accountIndex: ACCOUNT_OPERATING,
        amountCents,
        method: amountCents > 2_500_000 ? 'wire' : 'ach',
        status: 'posted',
        categoryKey: 'revenue',
        counterpartyIndex: faker.helpers.arrayElement(revenueCounterparties),
        cardIndex: null,
        memo: 'Customer invoice',
        settleAt: null,
      });
    }

    // Semi-monthly payroll, on the Payroll account.
    for (const dayOfMonth of PAYROLL_DAYS) {
      push({
        at: atHour(dayInMonth(dayOfMonth), 8, 30),
        accountIndex: ACCOUNT_PAYROLL,
        amountCents: -faker.number.int({ min: PAYROLL_MIN_CENTS, max: PAYROLL_MAX_CENTS }),
        method: 'ach',
        status: 'posted',
        categoryKey: 'payroll',
        counterpartyIndex: payrollCounterparty,
        cardIndex: null,
        memo: 'Semi-monthly payroll run',
        settleAt: null,
      });
    }

    // Fixed recurring obligations, on the Operating account.
    for (const outflow of MONTHLY_OUTFLOWS) {
      push({
        at: atHour(dayInMonth(outflow.dayOfMonth), 9, 15),
        accountIndex: ACCOUNT_OPERATING,
        amountCents: -faker.number.int({ min: outflow.minCents, max: outflow.maxCents }),
        method: outflow.method,
        status: 'posted',
        categoryKey: outflow.categoryKey,
        counterpartyIndex: counterpartyIndexByName(outflow.counterpartyName),
        cardIndex: outflow.cardIndex,
        memo: outflow.memo,
        settleAt: null,
      });
    }

    // Contractor invoices.
    for (let index = 0; index < CONTRACTORS_PER_MONTH; index += 1) {
      push({
        at: atHour(dayInMonth(faker.number.int({ min: 2, max: 27 })), 14, faker.number.int(59)),
        accountIndex: ACCOUNT_OPERATING,
        amountCents: -faker.number.int({
          min: CONTRACTOR_MIN_CENTS,
          max: CONTRACTOR_MAX_CENTS,
        }),
        method: 'ach',
        status: 'posted',
        categoryKey: 'contractors',
        counterpartyIndex: faker.helpers.arrayElement(contractorCounterparties),
        cardIndex: null,
        memo: 'Contractor invoice',
        settleAt: null,
      });
    }

    // Quarterly taxes.
    if (TAX_MONTHS.includes(etMonthIndex)) {
      push({
        at: atHour(dayInMonth(TAX_DAY_OF_MONTH), 11, 0),
        accountIndex: ACCOUNT_OPERATING,
        amountCents: -faker.number.int({ min: TAX_MIN_CENTS, max: TAX_MAX_CENTS }),
        method: 'ach',
        status: 'posted',
        categoryKey: 'taxes',
        counterpartyIndex: faker.helpers.arrayElement(taxCounterparties),
        cardIndex: null,
        memo: 'Quarterly estimated tax',
        settleAt: null,
      });
    }

    // Interest credited on the cash-holding accounts.
    for (const accountIndex of INTEREST_ACCOUNTS) {
      push({
        at: atHour(dayInMonth(28), 6, 0),
        accountIndex,
        amountCents: faker.number.int({ min: INTEREST_MIN_CENTS, max: INTEREST_MAX_CENTS }),
        method: 'interest',
        status: 'posted',
        categoryKey: 'interest',
        counterpartyIndex: null,
        cardIndex: null,
        memo: 'Monthly interest',
        settleAt: null,
      });
    }
  }

  // Everyday card spend, day by day across the whole window.
  for (let dayOffset = 0; ; dayOffset += 1) {
    const etDayStart = startOfBusinessDay(windowStart, dayOffset);

    if (etDayStart.getTime() >= horizon.getTime()) {
      break;
    }

    const dayOfWeek = businessDayOfWeek(etDayStart);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const count = faker.number.int({
      min: isWeekend ? CARD_SPEND_WEEKEND_MIN : CARD_SPEND_WEEKDAY_MIN,
      max: isWeekend ? CARD_SPEND_WEEKEND_MAX : CARD_SPEND_WEEKDAY_MAX,
    });

    for (let index = 0; index < count; index += 1) {
      const categoryKey = faker.helpers.arrayElement(CARD_SPEND_CATEGORY_KEYS);
      const [min, max] = CARD_SPEND_RANGES[categoryKey];

      push({
        at: atHour(etDayStart, 8 + index * 3, faker.number.int(59)),
        accountIndex: ACCOUNT_OPERATING,
        amountCents: -faker.number.int({ min, max }),
        method: 'card',
        status: 'posted',
        categoryKey,
        counterpartyIndex: faker.helpers.arrayElement(counterpartyIndexesByCategory(categoryKey)),
        cardIndex: faker.helpers.arrayElement(CARD_DAILY_SPEND),
        memo: 'Card purchase',
        settleAt: null,
      });
    }
  }

  // The 2–4 external payments still in flight on the run day. `pending`, so they
  // lower available but not current balance (BR-002).
  for (const payment of PENDING_PAYMENTS) {
    push({
      at: startOfBusinessDay(runDay),
      accountIndex: ACCOUNT_OPERATING,
      amountCents: -payment.amountCents,
      method: payment.method,
      status: 'pending',
      categoryKey: payment.categoryKey,
      counterpartyIndex: counterpartyIndexByName(payment.counterpartyName),
      cardIndex: null,
      memo: payment.memo,
      settleAt: new Date(startOfBusinessDay(runDay, payment.settleInDays).getTime() + 15 * HOUR_MS),
    });
  }

  // Attempts that never settled: neither balance sees them.
  for (const payment of UNSETTLED_PAYMENTS) {
    const attemptedAt = atHour(startOfBusinessDay(runDay, -payment.daysAgo), 13, 20);

    push({
      at: attemptedAt,
      accountIndex: ACCOUNT_OPERATING,
      amountCents: -payment.amountCents,
      method: payment.method,
      status: payment.status,
      categoryKey: payment.categoryKey,
      counterpartyIndex: counterpartyIndexByName(payment.counterpartyName),
      cardIndex: null,
      memo: payment.memo,
      settleAt: new Date(attemptedAt.getTime() + DAY_MS),
    });
  }

  // Chronological, with the insertion sequence as a stable tie-breaker.
  events.sort((left, right) =>
    left.at.getTime() === right.at.getTime()
      ? left.sequence - right.sequence
      : left.at.getTime() - right.at.getTime(),
  );

  // ------------------------------------------- opening capital, sized for the runway

  const flowRows: FlowRow[] = events.map((event) => ({
    amountCents: event.amountCents,
    status: event.status,
    method: event.method,
    postedAt: event.status === 'posted' ? event.at : null,
  }));

  const avgNetBurnCents = averageNetBurnCents(flowRows, runDay, 3);
  const postedEventTotalCents = flowRows
    .filter((row) => row.status === 'posted')
    .reduce((total, row) => total + row.amountCents, 0);

  /**
   * `totalCash = openingCapital + Σ posted events`, and the internal transfers
   * injected below sum to zero, so this lands the runway exactly on
   * `TARGET_RUNWAY_MONTHS` (AC-001-08).
   */
  const targetTotalCashCents = TARGET_RUNWAY_MONTHS * avgNetBurnCents;
  const openingCapitalCents = targetTotalCashCents - postedEventTotalCents;

  if (openingCapitalCents <= 0) {
    throw new Error(
      `generate: the sized opening capital is ${openingCapitalCents}, which is not positive; the event stream already leaves more cash than ${TARGET_RUNWAY_MONTHS} months of runway needs`,
    );
  }

  const openingByAccount = ACCOUNTS.map((account) =>
    Math.round(openingCapitalCents * account.openingWeight),
  );
  // The last account absorbs the rounding remainder, so the split is exact.
  openingByAccount[openingByAccount.length - 1] +=
    openingCapitalCents - openingByAccount.reduce((total, value) => total + value, 0);

  // ----------------------------------------------- materialise, carrying the balances

  const transactions: SeedTransaction[] = [];
  const transfers: SeedTransfer[] = [];
  const balances = ACCOUNTS.map(() => 0);

  const emit = (event: Omit<LedgerEvent, 'sequence'>): void => {
    const index = transactions.length + 1;
    const posted = event.status === 'posted';

    transactions.push({
      id: mintId('txn', index),
      businessId: business.id,
      accountId: accounts[event.accountIndex].id,
      amountCents: event.amountCents,
      status: event.status,
      method: event.method,
      categoryId: categoryId(event.categoryKey),
      counterpartyId:
        event.counterpartyIndex === null ? null : counterparties[event.counterpartyIndex].id,
      cardId: event.cardIndex === null ? null : cards[event.cardIndex].id,
      transferId: null,
      memo: event.memo,
      note: null,
      idempotencyKey: `seed:txn:${index}`,
      createdAt: event.at,
      settleAt: event.settleAt ?? (posted ? event.at : null),
      postedAt: posted ? event.at : null,
    });

    if (posted) {
      balances[event.accountIndex] += event.amountCents;
    }
  };

  /** Opening capital, as a real posted inflow — there is no balance column to cheat with. */
  ACCOUNTS.forEach((account, accountIndex) => {
    emit({
      at: windowStart,
      accountIndex,
      amountCents: openingByAccount[accountIndex],
      method: 'wire',
      status: 'posted',
      categoryKey: 'other',
      counterpartyIndex: null,
      cardIndex: null,
      memo: `Opening balance, ${account.name}`,
      settleAt: null,
    });
  });

  /**
   * BR-002 by construction: the funding account is whichever of
   * `FUNDING_SOURCES` currently holds the most cash, which is deterministic,
   * realistic, and cannot drive an account negative.
   */
  const emitFundingTransfer = (
    sourceIndex: AccountIndex,
    destinationIndex: AccountIndex,
    amountCents: number,
    at: Date,
  ): void => {
    const transferIndex = transfers.length + 1;
    const transferId = mintId('trf', transferIndex);

    transfers.push({
      id: transferId,
      businessId: business.id,
      sourceAccountId: accounts[sourceIndex].id,
      destinationAccountId: accounts[destinationIndex].id,
      amountCents,
      idempotencyKey: `seed:transfer:${transferIndex}`,
      createdAt: at,
    });

    const legs: readonly { accountIndex: AccountIndex; amountCents: number; memo: string }[] = [
      {
        accountIndex: sourceIndex,
        amountCents: -amountCents,
        memo: `Internal transfer to ${ACCOUNTS[destinationIndex].name}`,
      },
      {
        accountIndex: destinationIndex,
        amountCents,
        memo: `Internal transfer from ${ACCOUNTS[sourceIndex].name}`,
      },
    ];

    for (const leg of legs) {
      const index = transactions.length + 1;

      transactions.push({
        id: mintId('txn', index),
        businessId: business.id,
        accountId: accounts[leg.accountIndex].id,
        amountCents: leg.amountCents,
        status: 'posted',
        method: 'internal',
        // BR-011: never categorised, never a counterparty.
        categoryId: null,
        counterpartyId: null,
        cardId: null,
        transferId,
        memo: leg.memo,
        note: null,
        idempotencyKey: `seed:txn:${index}`,
        createdAt: at,
        settleAt: at,
        postedAt: at,
      });

      balances[leg.accountIndex] += leg.amountCents;
    }
  };

  const ensureFunds = (accountIndex: AccountIndex, outflowCents: number, at: Date): void => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      if (balances[accountIndex] - outflowCents >= BALANCE_FLOOR_CENTS) {
        return;
      }

      const shortfallCents = BALANCE_FLOOR_CENTS + outflowCents - balances[accountIndex];
      const requestedCents =
        Math.ceil(shortfallCents / TRANSFER_ROUNDING_CENTS) * TRANSFER_ROUNDING_CENTS;

      const sourceIndex = FUNDING_SOURCES.filter((candidate) => candidate !== accountIndex).reduce(
        (best, candidate) => (balances[candidate] > balances[best] ? candidate : best),
      );

      if (balances[sourceIndex] <= 0) {
        throw new Error(
          `generate: no funding source has cash to cover ${requestedCents} for ${ACCOUNTS[accountIndex].name} at ${at.toISOString()}`,
        );
      }

      emitFundingTransfer(
        sourceIndex,
        accountIndex,
        Math.min(requestedCents, balances[sourceIndex]),
        at,
      );
    }

    throw new Error(
      `generate: could not fund ${ACCOUNTS[accountIndex].name} for an outflow of ${outflowCents} at ${at.toISOString()} within 8 internal transfers`,
    );
  };

  for (const event of events) {
    if (event.status === 'posted' && event.amountCents < 0) {
      ensureFunds(event.accountIndex, -event.amountCents, event.at);
    }

    emit(event);
  }

  return {
    runDay,
    windowStart,
    business,
    user,
    categories,
    accounts,
    counterparties,
    cards,
    transfers,
    transactions,
    openingCapitalCents,
    averageNetBurnCents: avgNetBurnCents,
  };
};
