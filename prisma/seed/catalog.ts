/**
 * Static, hand-curated catalogue for the deterministic seed (FR-036).
 *
 * Nothing here depends on a clock, on `process.env` or on the RNG: it is the
 * fixed vocabulary the generator draws from. Keeping it separate is what makes
 * `generate.ts` a pure function of `(runDay, faker seed)` — the whole basis of
 * AC-001-03.
 *
 * Every name is fictional or a generic statement-style descriptor. No real
 * person and no resemblance to Mercury or Slash copy (AGENTS.md non-negotiable 4).
 */

/** Fixed faker seed (spec §6.4). Changing it changes every id and every hash. */
export const FAKER_SEED = 20_261_110;

/** The BR-002 construction floor: USD 50,000 in cents (spec §5 BR-002). */
export const BALANCE_FLOOR_CENTS = 5_000_000;

/** Internal funding transfers round up to a whole USD 100 so they read like real treasury moves. */
export const TRANSFER_ROUNDING_CENTS = 10_000;

/** The runway the seeded ledger is built to show, in months (AC-001-08 wants 14–24). */
export const TARGET_RUNWAY_MONTHS = 18;

/** How many closed ET months of history the ledger covers (FR-036 wants >= 360 days). */
export const HISTORY_MONTHS = 12;

export const BUSINESS = {
  name: 'Oakfern Demo Co',
  slug: 'oakfern-demo',
} as const;

export const DEMO_USER = {
  email: 'ada.whitfield@oakfern.example',
  name: 'Ada Whitfield',
} as const;

export type CategoryDirection = 'in' | 'out' | 'both';

/** The 14 global categories of `docs/domain/model.md`, upserted by `key` (ASM-001-02). */
export const CATEGORIES: readonly {
  readonly key: string;
  readonly label: string;
  readonly direction: CategoryDirection;
}[] = [
  { key: 'revenue', label: 'Revenue', direction: 'in' },
  { key: 'interest', label: 'Interest', direction: 'in' },
  { key: 'payroll', label: 'Payroll', direction: 'out' },
  { key: 'contractors', label: 'Contractors', direction: 'out' },
  { key: 'rent', label: 'Rent', direction: 'out' },
  { key: 'software', label: 'Software', direction: 'out' },
  { key: 'cloud', label: 'Cloud', direction: 'out' },
  { key: 'marketing', label: 'Marketing', direction: 'out' },
  { key: 'travel', label: 'Travel', direction: 'out' },
  { key: 'meals', label: 'Meals', direction: 'out' },
  { key: 'insurance', label: 'Insurance', direction: 'out' },
  { key: 'taxes', label: 'Taxes', direction: 'out' },
  { key: 'fees', label: 'Fees', direction: 'out' },
  { key: 'other', label: 'Other', direction: 'both' },
];

export type AccountType = 'checking' | 'savings' | 'treasury';

/**
 * Account order is load-bearing and referenced by index throughout the
 * generator: 0 Operating, 1 Payroll, 2 Reserve, 3 Treasury.
 */
export const ACCOUNT_OPERATING = 0;
export const ACCOUNT_PAYROLL = 1;
export const ACCOUNT_RESERVE = 2;
export const ACCOUNT_TREASURY = 3;

/**
 * Accounts that may fund another account when the BR-002 floor would be
 * breached. The generator always draws from whichever of these currently holds
 * the most cash (ties broken by the lowest index), which is both the realistic
 * treasury behaviour and the reason no account can be driven negative: the
 * largest of three balances cannot be empty while the business still has cash.
 */
export const FUNDING_SOURCES: readonly number[] = [
  ACCOUNT_OPERATING,
  ACCOUNT_RESERVE,
  ACCOUNT_TREASURY,
];

export const ACCOUNTS: readonly {
  readonly name: string;
  readonly type: AccountType;
  readonly accountNumber: string;
  readonly routingNumber: string;
  /**
   * Share of the opening capital. The generator sizes the *total* opening
   * capital so the runway lands on `TARGET_RUNWAY_MONTHS`; these weights only
   * decide how it is split. Operating and Payroll stay deliberately thin — a
   * real business parks idle cash in Reserve and Treasury, which is also what
   * gives the BR-002 floor logic something to do.
   */
  readonly openingWeight: number;
}[] = [
  {
    name: 'Operating',
    type: 'checking',
    accountNumber: '100042871934',
    routingNumber: '021000021',
    openingWeight: 0.3,
  },
  {
    name: 'Payroll',
    type: 'checking',
    accountNumber: '100042871942',
    routingNumber: '021000021',
    openingWeight: 0.1,
  },
  {
    name: 'Reserve',
    type: 'savings',
    accountNumber: '100042871950',
    routingNumber: '021000021',
    openingWeight: 0.35,
  },
  {
    name: 'Treasury',
    type: 'treasury',
    accountNumber: '100042871968',
    routingNumber: '021000021',
    openingWeight: 0.25,
  },
];

export type CardFormFactor = 'virtual' | 'physical';
export type CardStatus = 'active' | 'frozen';

/**
 * 5 cards: 3 virtual, 2 physical, exactly 1 frozen (spec §6.4).
 *
 * `Growth virtual` carries a deliberately small limit so that its current-month
 * spend exceeds it — 006's over-limit state has real data if that feature ever
 * returns, and nobody has to fabricate it later.
 */
export const CARDS: readonly {
  readonly label: string;
  readonly accountIndex: number;
  readonly formFactor: CardFormFactor;
  readonly status: CardStatus;
  readonly last4: string;
  readonly monthlyLimitCents: number;
}[] = [
  {
    label: 'Operations physical',
    accountIndex: ACCOUNT_OPERATING,
    formFactor: 'physical',
    status: 'active',
    last4: '4417',
    monthlyLimitCents: 2_500_000,
  },
  {
    label: 'Engineering virtual',
    accountIndex: ACCOUNT_OPERATING,
    formFactor: 'virtual',
    status: 'active',
    last4: '7120',
    monthlyLimitCents: 1_500_000,
  },
  {
    label: 'Travel physical',
    accountIndex: ACCOUNT_OPERATING,
    formFactor: 'physical',
    status: 'active',
    last4: '8863',
    monthlyLimitCents: 1_000_000,
  },
  {
    label: 'Growth virtual',
    accountIndex: ACCOUNT_OPERATING,
    formFactor: 'virtual',
    status: 'active',
    last4: '2094',
    monthlyLimitCents: 200_000,
  },
  {
    label: 'Legacy virtual',
    accountIndex: ACCOUNT_OPERATING,
    formFactor: 'virtual',
    status: 'frozen',
    last4: '5538',
    monthlyLimitCents: 500_000,
  },
];

/** Cards that everyday spend is spread across. */
export const CARD_DAILY_SPEND: readonly number[] = [0, 1, 2];
/** The low-limit card that carries the recurring subscription charges. */
export const CARD_SUBSCRIPTIONS = 3;

export type CounterpartyKind = 'recipient' | 'merchant';

export interface CounterpartySpec {
  readonly name: string;
  readonly kind: CounterpartyKind;
  readonly categoryKey: string;
}

/**
 * 61 counterparties (spec §6.4 wants 55–65), statement-style and fictional.
 * `name` is unique because the schema has `@@unique([businessId, name])`.
 */
export const COUNTERPARTIES: readonly CounterpartySpec[] = [
  { name: 'LINEAR SOFTWARE INC', kind: 'merchant', categoryKey: 'software' },
  { name: 'NOTION LABS INC', kind: 'merchant', categoryKey: 'software' },
  { name: 'FIGMA INC', kind: 'merchant', categoryKey: 'software' },
  { name: 'GITHUB INC', kind: 'merchant', categoryKey: 'software' },
  { name: 'ATLASSIAN PTY LTD', kind: 'merchant', categoryKey: 'software' },
  { name: 'SLACK TECHNOLOGIES', kind: 'merchant', categoryKey: 'software' },
  { name: 'AGILEBITS 1PASSWORD', kind: 'merchant', categoryKey: 'software' },
  { name: 'VANTA INC', kind: 'merchant', categoryKey: 'software' },
  { name: 'AMAZON WEB SERVICES', kind: 'merchant', categoryKey: 'cloud' },
  { name: 'VERCEL INC', kind: 'merchant', categoryKey: 'cloud' },
  { name: 'CLOUDFLARE INC', kind: 'merchant', categoryKey: 'cloud' },
  { name: 'DATADOG INC', kind: 'merchant', categoryKey: 'cloud' },
  { name: 'NEON TECH INC', kind: 'merchant', categoryKey: 'cloud' },
  { name: 'TWILIO INC', kind: 'merchant', categoryKey: 'cloud' },
  { name: 'SENTRY SOFTWARE INC', kind: 'merchant', categoryKey: 'cloud' },
  { name: 'GOOGLE ADS', kind: 'merchant', categoryKey: 'marketing' },
  { name: 'META PLATFORMS ADS', kind: 'merchant', categoryKey: 'marketing' },
  { name: 'LINKEDIN MARKETING', kind: 'merchant', categoryKey: 'marketing' },
  { name: 'WEBFLOW INC', kind: 'merchant', categoryKey: 'marketing' },
  { name: 'INTUIT MAILCHIMP', kind: 'merchant', categoryKey: 'marketing' },
  { name: 'BLUE BOTTLE COFFEE', kind: 'merchant', categoryKey: 'meals' },
  { name: 'SWEETGREEN', kind: 'merchant', categoryKey: 'meals' },
  { name: 'CHIPOTLE MEXICAN GRILL', kind: 'merchant', categoryKey: 'meals' },
  { name: 'JOE AND THE JUICE', kind: 'merchant', categoryKey: 'meals' },
  { name: 'DIG INN', kind: 'merchant', categoryKey: 'meals' },
  { name: 'PRET A MANGER', kind: 'merchant', categoryKey: 'meals' },
  { name: 'SHAKE SHACK', kind: 'merchant', categoryKey: 'meals' },
  { name: 'STARBUCKS STORE 2184', kind: 'merchant', categoryKey: 'meals' },
  { name: 'DELTA AIR LINES', kind: 'merchant', categoryKey: 'travel' },
  { name: 'UNITED AIRLINES', kind: 'merchant', categoryKey: 'travel' },
  { name: 'AMTRAK NORTHEAST', kind: 'merchant', categoryKey: 'travel' },
  { name: 'LYFT RIDE', kind: 'merchant', categoryKey: 'travel' },
  { name: 'UBER TECHNOLOGIES', kind: 'merchant', categoryKey: 'travel' },
  { name: 'MARRIOTT HOTELS', kind: 'merchant', categoryKey: 'travel' },
  { name: 'HILTON GARDEN INN', kind: 'merchant', categoryKey: 'travel' },
  { name: 'STAPLES BUSINESS', kind: 'merchant', categoryKey: 'other' },
  { name: 'APPLE STORE R158', kind: 'merchant', categoryKey: 'other' },
  { name: 'BEST BUY BUSINESS', kind: 'merchant', categoryKey: 'other' },
  { name: 'FEDEX OFFICE 1902', kind: 'merchant', categoryKey: 'other' },
  { name: 'US POSTAL SERVICE', kind: 'merchant', categoryKey: 'other' },
  { name: 'MERIDIAN TRUST BANK', kind: 'merchant', categoryKey: 'fees' },
  { name: 'HARTFORD BUSINESS INSURANCE', kind: 'merchant', categoryKey: 'insurance' },
  { name: 'GRAMERCY REALTY PARTNERS', kind: 'recipient', categoryKey: 'rent' },
  { name: 'GUSTO PAYROLL SERVICES', kind: 'recipient', categoryKey: 'payroll' },
  { name: 'Ardent Design Studio', kind: 'recipient', categoryKey: 'contractors' },
  { name: 'Northbeam Analytics LLC', kind: 'recipient', categoryKey: 'contractors' },
  { name: 'Rivet Engineering LLC', kind: 'recipient', categoryKey: 'contractors' },
  { name: 'Copperline Consulting', kind: 'recipient', categoryKey: 'contractors' },
  { name: 'Halcyon Legal PLLC', kind: 'recipient', categoryKey: 'contractors' },
  { name: 'Mesa Accounting Group', kind: 'recipient', categoryKey: 'contractors' },
  { name: 'Bright Harbor Recruiting', kind: 'recipient', categoryKey: 'contractors' },
  { name: 'US TREASURY EFTPS', kind: 'recipient', categoryKey: 'taxes' },
  { name: 'NY STATE DEPT OF TAXATION', kind: 'recipient', categoryKey: 'taxes' },
  { name: 'Summit Logistics Co', kind: 'recipient', categoryKey: 'revenue' },
  { name: 'Bayline Medical Group', kind: 'recipient', categoryKey: 'revenue' },
  { name: 'Orchard and Vine Foods', kind: 'recipient', categoryKey: 'revenue' },
  { name: 'Tessera Robotics Inc', kind: 'recipient', categoryKey: 'revenue' },
  { name: 'Lantern Health Systems', kind: 'recipient', categoryKey: 'revenue' },
  { name: 'Pinewood Freight LLC', kind: 'recipient', categoryKey: 'revenue' },
  { name: 'Castlegate Retail Group', kind: 'recipient', categoryKey: 'revenue' },
  { name: 'Verity Analytics Inc', kind: 'recipient', categoryKey: 'revenue' },
];

/** Indexes into `COUNTERPARTIES` whose default category is `categoryKey`. */
export const counterpartyIndexesByCategory = (categoryKey: string): number[] =>
  COUNTERPARTIES.reduce<number[]>((indexes, counterparty, index) => {
    if (counterparty.categoryKey === categoryKey) {
      indexes.push(index);
    }

    return indexes;
  }, []);

export const counterpartyIndexByName = (name: string): number => {
  const index = COUNTERPARTIES.findIndex((counterparty) => counterparty.name === name);

  if (index < 0) {
    throw new Error(`catalog: no counterparty named ${name}`);
  }

  return index;
};

export type SeedMethod = 'ach' | 'wire' | 'card' | 'internal' | 'check' | 'fee' | 'interest';

/** Recurring monthly outflows, in cents, on the Operating account. */
export const MONTHLY_OUTFLOWS: readonly {
  readonly counterpartyName: string;
  readonly categoryKey: string;
  readonly method: SeedMethod;
  /** Day of the ET month the charge lands on. */
  readonly dayOfMonth: number;
  readonly minCents: number;
  readonly maxCents: number;
  readonly cardIndex: number | null;
  readonly memo: string;
}[] = [
  {
    counterpartyName: 'GRAMERCY REALTY PARTNERS',
    categoryKey: 'rent',
    method: 'ach',
    dayOfMonth: 1,
    minCents: 1_850_000,
    maxCents: 1_850_000,
    cardIndex: null,
    memo: 'Office lease',
  },
  {
    counterpartyName: 'AMAZON WEB SERVICES',
    categoryKey: 'cloud',
    method: 'card',
    dayOfMonth: 3,
    minCents: 1_050_000,
    maxCents: 1_620_000,
    cardIndex: CARD_SUBSCRIPTIONS,
    memo: 'Cloud infrastructure',
  },
  {
    counterpartyName: 'HARTFORD BUSINESS INSURANCE',
    categoryKey: 'insurance',
    method: 'ach',
    dayOfMonth: 5,
    minCents: 318_000,
    maxCents: 322_000,
    cardIndex: null,
    memo: 'Business liability policy',
  },
  {
    counterpartyName: 'GOOGLE ADS',
    categoryKey: 'marketing',
    method: 'card',
    dayOfMonth: 7,
    minCents: 720_000,
    maxCents: 1_140_000,
    cardIndex: CARD_SUBSCRIPTIONS,
    memo: 'Paid acquisition',
  },
  {
    counterpartyName: 'ATLASSIAN PTY LTD',
    categoryKey: 'software',
    method: 'card',
    dayOfMonth: 11,
    minCents: 580_000,
    maxCents: 700_000,
    cardIndex: CARD_SUBSCRIPTIONS,
    memo: 'Team seats, annualised monthly',
  },
  {
    counterpartyName: 'MERIDIAN TRUST BANK',
    categoryKey: 'fees',
    method: 'fee',
    dayOfMonth: 28,
    minCents: 8_500,
    maxCents: 8_500,
    cardIndex: null,
    memo: 'Account maintenance',
  },
];

/** Quarterly tax payments, by ET month index (0 = January). */
export const TAX_MONTHS: readonly number[] = [0, 3, 6, 9];
export const TAX_DAY_OF_MONTH = 15;
export const TAX_MIN_CENTS = 1_900_000;
export const TAX_MAX_CENTS = 2_500_000;

/** Semi-monthly payroll run, on the Payroll account. */
export const PAYROLL_DAYS: readonly number[] = [1, 16];
export const PAYROLL_MIN_CENTS = 9_100_000;
export const PAYROLL_MAX_CENTS = 9_800_000;

/** Customer receipts on the Operating account. */
export const REVENUE_PER_MONTH = 10;
export const REVENUE_MIN_CENTS = 1_200_000;
export const REVENUE_MAX_CENTS = 3_500_000;

/** Contractor invoices on the Operating account. */
export const CONTRACTORS_PER_MONTH = 3;
export const CONTRACTOR_MIN_CENTS = 400_000;
export const CONTRACTOR_MAX_CENTS = 900_000;

/** Monthly interest credit on Reserve and Treasury. */
export const INTEREST_ACCOUNTS: readonly number[] = [ACCOUNT_RESERVE, ACCOUNT_TREASURY];
export const INTEREST_MIN_CENTS = 180_000;
export const INTEREST_MAX_CENTS = 430_000;

/** Everyday card spend. */
export const CARD_SPEND_WEEKDAY_MIN = 3;
export const CARD_SPEND_WEEKDAY_MAX = 4;
export const CARD_SPEND_WEEKEND_MIN = 0;
export const CARD_SPEND_WEEKEND_MAX = 2;
/** Weighted by repetition: meals are the common case, travel the rare one. */
export const CARD_SPEND_CATEGORY_KEYS: readonly string[] = [
  'meals',
  'meals',
  'meals',
  'other',
  'travel',
  'software',
];
export const CARD_SPEND_RANGES: Readonly<Record<string, readonly [number, number]>> = {
  meals: [1_400, 18_500],
  other: [2_500, 46_000],
  travel: [12_000, 94_000],
  software: [1_900, 29_000],
};

/** The 2–4 external payments still in flight on the run day (spec §6.4). */
export const PENDING_PAYMENTS: readonly {
  readonly counterpartyName: string;
  readonly categoryKey: string;
  readonly method: SeedMethod;
  readonly amountCents: number;
  /** Days after the run day the payment is expected to settle. */
  readonly settleInDays: number;
  readonly memo: string;
}[] = [
  {
    counterpartyName: 'Rivet Engineering LLC',
    categoryKey: 'contractors',
    method: 'ach',
    amountCents: 742_500,
    settleInDays: 1,
    memo: 'Integration work, final milestone',
  },
  {
    counterpartyName: 'GRAMERCY REALTY PARTNERS',
    categoryKey: 'rent',
    method: 'wire',
    amountCents: 1_850_000,
    settleInDays: 2,
    memo: 'Next month lease',
  },
  {
    counterpartyName: 'Halcyon Legal PLLC',
    categoryKey: 'contractors',
    method: 'ach',
    amountCents: 318_000,
    settleInDays: 4,
    memo: 'Trademark filing',
  },
];

/** A handful of non-settling rows, so `canceled` and `failed` are not theoretical. */
export const UNSETTLED_PAYMENTS: readonly {
  readonly counterpartyName: string;
  readonly categoryKey: string;
  readonly method: SeedMethod;
  readonly status: 'canceled' | 'failed';
  readonly amountCents: number;
  /** Days before the run day the attempt was made. */
  readonly daysAgo: number;
  readonly memo: string;
}[] = [
  {
    counterpartyName: 'Mesa Accounting Group',
    categoryKey: 'contractors',
    method: 'ach',
    status: 'canceled',
    amountCents: 455_000,
    daysAgo: 23,
    memo: 'Duplicate invoice, cancelled',
  },
  {
    counterpartyName: 'Bright Harbor Recruiting',
    categoryKey: 'contractors',
    method: 'ach',
    status: 'canceled',
    amountCents: 612_000,
    daysAgo: 48,
    memo: 'Search paused',
  },
  {
    counterpartyName: 'Copperline Consulting',
    categoryKey: 'contractors',
    method: 'wire',
    status: 'failed',
    amountCents: 289_000,
    daysAgo: 37,
    memo: 'Beneficiary details rejected',
  },
];
