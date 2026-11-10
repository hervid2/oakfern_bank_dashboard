import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/server/repositories/client';
import { findAccountById, listAccounts } from '@/server/repositories/accounts';
import { countTransactions, listBalanceRows } from '@/server/repositories/transactions';
import { DEMO_USER_EMAIL, findDemoUser, findUserById } from '@/server/repositories/users';
import { getAccountBalances } from '@/server/services/accounts';

import {
  createTwoBusinessFixture,
  destroyTwoBusinessFixture,
  loadLocalEnv,
  type TwoBusinessFixture,
} from '../helpers/db';

/**
 * NFR-005 / AC-001-10 — anti-IDOR, proven **against a real database** rather
 * than against a call shape.
 *
 * Two complete workspaces are created with identical shapes, and then every
 * repository method added in 001 is called with business A's `businessId` for a
 * row owned by business B. Each must return **nothing** — never business B's
 * row, never a 403 that would confirm the row exists.
 *
 * One test per repository method, which is what the AC asks for:
 *
 *   - `users.findUserById`
 *   - `users.findDemoUser` (the documented unscoped exception — tested for the
 *     property that actually protects it: it is hard-scoped to one email and
 *     takes no caller input at all)
 *   - `accounts.listAccounts`
 *   - `accounts.findAccountById`
 *   - `transactions.listBalanceRows` (including the `accountId` narrowing form,
 *     which is the classic IDOR shape: a narrower filter must not widen access)
 *   - `transactions.countTransactions`
 *   - plus `services.accounts.getAccountBalances`, the composed read, because a
 *     service that forgot to pass `businessId` through would otherwise be the
 *     hole left by seven green repository tests.
 *
 * **The "route answers 404" half of AC-001-10.** 001 ships no id-bearing route:
 * `/accounts/[id]` and `/transactions/[id]` arrive with features 002 and 003.
 * What 001 can prove, and does, is the condition that makes the 404 inevitable —
 * a cross-business read resolves to `null` / `[]`, so the adapter has nothing to
 * render and calls `notFound()`. The shell's 404 path itself is asserted by
 * AC-001-17 in `tests/e2e/shell.spec.ts`.
 */

let fixture: TwoBusinessFixture;

beforeAll(async () => {
  loadLocalEnv();
  fixture = await createTwoBusinessFixture();
});

afterAll(async () => {
  await destroyTwoBusinessFixture(fixture);
  await prisma.$disconnect();
});

describe('repository scoping by businessId (integration)', () => {
  it('AC-001-10: the fixture is not vacuous — each business sees exactly its own rows', async () => {
    // If this is red, every negative assertion below could pass for the wrong
    // reason (an empty database returns nothing too).
    await expect(listAccounts(fixture.a.businessId)).resolves.toHaveLength(2);
    await expect(listAccounts(fixture.b.businessId)).resolves.toHaveLength(2);
    await expect(countTransactions(fixture.a.businessId)).resolves.toBe(5);
    await expect(
      findAccountById(fixture.a.businessId, fixture.a.accountAId),
    ).resolves.not.toBeNull();
    await expect(findUserById(fixture.a.businessId, fixture.a.userId)).resolves.not.toBeNull();
  });

  it('AC-001-10: users.findUserById with the wrong businessId returns null', async () => {
    await expect(findUserById(fixture.a.businessId, fixture.b.userId)).resolves.toBeNull();
    await expect(findUserById(fixture.b.businessId, fixture.a.userId)).resolves.toBeNull();
  });

  it('AC-001-10: users.findDemoUser takes no caller input and is hard-scoped to one email', async () => {
    // The single documented exception to the businessId rule. It cannot be
    // steered, because it accepts no argument at all...
    expect(findDemoUser).toHaveLength(0);

    const demo = await findDemoUser();

    // ...and whatever it returns is that one seeded identity, never a fixture user.
    if (demo !== null) {
      expect(demo.email).toBe(DEMO_USER_EMAIL);
      expect(demo.businessId).not.toBe(fixture.a.businessId);
      expect(demo.businessId).not.toBe(fixture.b.businessId);
    }
  });

  it('AC-001-10: accounts.listAccounts never leaks another business’s accounts', async () => {
    const forA = await listAccounts(fixture.a.businessId);
    const idsOfB = [fixture.b.accountAId, fixture.b.accountBId];

    expect(forA.map((account) => account.id).sort()).toEqual(
      [fixture.a.accountAId, fixture.a.accountBId].sort(),
    );

    for (const id of idsOfB) {
      expect(forA.map((account) => account.id)).not.toContain(id);
    }
  });

  it('AC-001-10: accounts.findAccountById with the wrong businessId returns null', async () => {
    await expect(findAccountById(fixture.a.businessId, fixture.b.accountAId)).resolves.toBeNull();
    await expect(findAccountById(fixture.b.businessId, fixture.a.accountAId)).resolves.toBeNull();
  });

  it('AC-001-10: transactions.listBalanceRows is empty for a foreign account id, even when narrowed', async () => {
    const rows = await listBalanceRows(fixture.a.businessId, fixture.b.accountAId);

    // The narrowing `accountId` is an *additional* filter, never a replacement:
    // asking for business B's account inside business A's scope yields nothing.
    expect(rows).toEqual([]);

    const ownRows = await listBalanceRows(fixture.a.businessId, fixture.a.accountAId);

    expect(ownRows).toHaveLength(4);
    expect(ownRows.every((row) => row.accountId === fixture.a.accountAId)).toBe(true);
  });

  it('AC-001-10: transactions.countTransactions is 0 for a foreign account id', async () => {
    await expect(countTransactions(fixture.a.businessId, fixture.b.accountAId)).resolves.toBe(0);
    await expect(countTransactions(fixture.b.businessId, fixture.a.accountAId)).resolves.toBe(0);
  });

  it('AC-001-10: services.accounts.getAccountBalances is scoped end to end', async () => {
    const forA = await getAccountBalances(fixture.a.businessId);

    expect(forA.accounts.map((account) => account.id).sort()).toEqual(
      [fixture.a.accountAId, fixture.a.accountBId].sort(),
    );

    const accountA = forA.accounts.find((account) => account.id === fixture.a.accountAId);

    expect(accountA?.currentBalanceCents).toBe(fixture.a.accountACurrentBalanceCents);

    // BR-002 inside the fixture: the pending outflow reduces available only.
    expect(accountA?.availableBalanceCents).toBe(fixture.a.accountACurrentBalanceCents - 10_000);

    // The business total is A's money only: 180,000 + 30,000 = 210,000 cents.
    expect(forA.totalCurrentBalanceCents).toBe(210_000);

    const forB = await getAccountBalances(fixture.b.businessId);

    expect(forB.accounts.map((account) => account.id)).not.toContain(fixture.a.accountAId);
  });

  it('AC-001-10: an unknown businessId returns nothing rather than everything', async () => {
    // The degenerate IDOR: a missing or forged scope must not fall through to a
    // table scan.
    await expect(listAccounts('biz_does_not_exist')).resolves.toEqual([]);
    await expect(listBalanceRows('biz_does_not_exist')).resolves.toEqual([]);
    await expect(countTransactions('biz_does_not_exist')).resolves.toBe(0);
    await expect(findUserById('biz_does_not_exist', fixture.a.userId)).resolves.toBeNull();
    await expect(findAccountById('biz_does_not_exist', fixture.a.accountAId)).resolves.toBeNull();
  });
});
