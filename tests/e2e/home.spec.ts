import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';

/**
 * Feature 002 — the overview, in a real browser against a built production
 * server (`webServer` of `playwright.config.ts`).
 *
 * **Every assertion here is structural**: signs, formats, counts, masking,
 * absence and overflow. Not one hard-coded dollar figure appears, because `now`
 * is real and the 30-day window moves between runs (plan §11 R-8). A test that
 * pinned `$913,518.54` would go red tomorrow for a reason that is not a defect.
 *
 * **The authority is CI on Linux, not this laptop.** `MEMORY.md` records
 * AC-001-15 passing on Windows and failing on CI by 3 px, which is why the
 * 375 px sweep below was never traded away for time (cut L-3, rejected by the
 * Technical Director).
 */

const SECTION_DIR = join(process.cwd(), 'src', 'app', '(app)', 'home', '(section)');

/** `+$1,234.56`, `−$1,234.56` or `$0.00` — the only shapes `Amount` may emit. */
const MONEY = /^[+−]?\$[\d,]+\.\d{2}$/;

function recordConsole(page: Page): { messages: ConsoleMessage[]; pageErrors: Error[] } {
  const messages: ConsoleMessage[] = [];
  const pageErrors: Error[] = [];

  page.on('console', (message) => messages.push(message));
  page.on('pageerror', (error) => pageErrors.push(error));

  return { messages, pageErrors };
}

async function signIn(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue as demo' }).click();
  await page.waitForURL('/home');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
}

test.describe('home overview', () => {
  test('AC-002-02 + AC-002-10: the four tiles render money with a sign, tabular figures and no NaN', async ({
    page,
  }) => {
    await signIn(page);

    // Total cash: a plain currency string, never blank, `NaN` or `undefined`.
    const tile = (label: string) => page.locator(`[data-testid="kpi-tile"][data-label="${label}"]`);

    const valueOf = async (label: string): Promise<string> =>
      (await tile(label).locator('[data-testid="kpi-value"]').innerText()).trim();

    await expect(tile('Total cash')).toHaveCount(1);
    const totalText = await valueOf('Total cash');
    expect(totalText).toMatch(MONEY);
    expect(totalText).not.toContain('NaN');

    // All four tiles of the amended wireframe ship, and nothing else.
    await expect(page.getByTestId('kpi-tile')).toHaveCount(4);
    for (const label of ['Total cash', 'Money in', 'Money out', 'Runway']) {
      await expect(tile(label)).toHaveCount(1);
    }

    const body = await page.locator('main').innerText();
    expect(body).not.toContain('NaN');
    expect(body).not.toContain('undefined');
    expect(body).not.toContain('Infinity');

    // Money in carries `+` and the positive tone; money out carries `−` and the
    // **neutral** foreground — spending is not an error (ui-brief §1.1).
    const inflow = page.locator('[data-direction="in"]').first();
    const outflow = page.locator('[data-direction="out"]').first();

    await expect(inflow).toBeVisible();
    expect(await inflow.innerText()).toMatch(/^\+\$/);
    await expect(inflow).toHaveClass(/text-positive/);
    await expect(inflow).toHaveClass(/tabular-nums/);

    await expect(outflow).toBeVisible();
    expect(await outflow.innerText()).toMatch(/^−\$/);
    await expect(outflow).toHaveClass(/text-foreground/);
    await expect(outflow).not.toHaveClass(/text-destructive/);

    // Runway: either a month figure to one decimal, or the honest branch.
    const runwayText = await valueOf('Runway');
    expect(runwayText).toMatch(/(\d+\.\d months|Cash-flow positive)/);
    expect(runwayText).not.toMatch(/Infinity|NaN|-\d|0\.0 months/);
  });

  test('AC-002-18: account numbers are masked and no full account number reaches the DOM', async ({
    page,
  }) => {
    await signIn(page);

    const accounts = page.getByRole('region', { name: 'Accounts' });
    await expect(accounts).toBeVisible();

    const cards = accounts.getByRole('listitem');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    for (let index = 0; index < cardCount; index += 1) {
      const text = await cards.nth(index).innerText();
      expect(text).toMatch(/••••\d{4}/);
      expect(text).toContain('Current');
      expect(text).toContain('Available');
    }

    // The invariant, not just the masked rendering: the seeded account numbers
    // are 12 digits, so **no run of 8+ digits may exist anywhere** in the
    // document. Formatted money carries commas, so it cannot trip this.
    const html = await page.content();
    const digitRuns = html.match(/\d{8,}/g) ?? [];
    expect(digitRuns, `long digit runs found: ${digitRuns.join(', ')}`).toEqual([]);
  });

  test('AC-002-23 + AC-002-24: at least 8 recent rows with signed amounts, and "View all" reaches /transactions', async ({
    page,
  }) => {
    await signIn(page);

    const rows = page.getByTestId('recent-transaction-row');
    expect(await rows.count()).toBeGreaterThanOrEqual(8);

    const count = await rows.count();

    for (let index = 0; index < count; index += 1) {
      const row = rows.nth(index);
      const amount = row.locator('[data-direction]');

      await expect(amount).toHaveCount(1);
      expect(await amount.innerText()).toMatch(MONEY);
      await expect(amount).toHaveClass(/tabular-nums/);

      // Counterparty or label, plus an ET date and a method, on every row.
      const text = await row.innerText();
      expect(text.trim().length).toBeGreaterThan(0);
      expect(text).toMatch(/[A-Z][a-z]{2} \d{1,2}, \d{4}/);
    }

    await page.getByRole('link', { name: 'View all' }).click();
    await page.waitForURL('/transactions');
    expect(new URL(page.url()).pathname).toBe('/transactions');
  });

  test('AC-002-21 + AC-002-22: pending payments are rows of the recent list, read-only, with no cancel affordance', async ({
    page,
  }) => {
    await signIn(page);

    const pending = page.locator('[data-status="pending"]');
    expect(await pending.count()).toBeGreaterThan(0);

    const badge = await pending.first().innerText();
    expect(badge).toMatch(/^pending · Expected [A-Z][a-z]{2} \d{1,2}, \d{4}$/);

    // Cut L-2: the rows live inside the recent list and there is no panel,
    // heading or count of their own.
    const pendingRows = page
      .getByTestId('recent-transaction-row')
      .filter({ has: page.locator('[data-status="pending"]') });

    // Every pending badge sits inside a row of the recent list — there is no
    // panel, heading or count of their own (cut L-2).
    await expect(pendingRows).toHaveCount(await pending.count());
    await expect(page.getByRole('heading', { name: /pending/i })).toHaveCount(0);

    // The one honest sentence (OQ-002-01 A).
    await expect(page.getByText('read-only', { exact: false })).toBeVisible();

    // And zero ways to act on it. Scoped to `main`: the shell's own sidebar
    // legitimately links to /move-money, Home never does.
    const main = page.locator('main');
    await expect(main.getByRole('button', { name: /cancel|stop|void/i })).toHaveCount(0);
    await expect(main.getByRole('link', { name: /cancel|stop|void/i })).toHaveCount(0);
    await expect(main.locator('a[href*="/move-money"]')).toHaveCount(0);
    await expect(main.locator('button[disabled]')).toHaveCount(0);
  });

  test('AC-002-25: internal transfer legs are shown in the list and labelled as internal', async ({
    page,
  }) => {
    await signIn(page);

    // BR-011 excludes internal legs from the **metrics**, not from the list. The
    // trailing window of 8 rows may or may not contain one on any given day, so
    // the deterministic proof of the mapping lives in
    // `tests/integration/overview.test.ts`. What is asserted here is the
    // rendering contract when one is present: it is labelled, not hidden.
    const internal = page
      .getByTestId('recent-transaction-row')
      .filter({ hasText: 'Internal transfer' });

    if ((await internal.count()) > 0) {
      const text = await internal.first().innerText();
      expect(text).toContain('Internal transfer');
      expect(await internal.first().locator('[data-direction]').innerText()).toMatch(MONEY);
    }

    // Whatever today's window holds, the recent list itself never announces an
    // exclusion: BR-011 is a rule about metrics, and the two KPI footnotes that
    // *do* read "Internal transfers excluded" are the only place it is claimed.
    const list = await page.getByTestId('recent-transactions').innerText();
    expect(list.toLowerCase()).not.toContain('excluded');
  });

  test('AC-002-26: the skeleton is content-shaped, announced sr-only, and carries no chart box', async () => {
    // Asserted against the source, as AC-001-18 is: a production server streams
    // this skeleton in milliseconds, so racing it in a browser would measure the
    // network rather than the markup.
    // Block comments are stripped first: the file's own prose *describes* the
    // sparkline and chart boxes that were removed, so asserting over it would
    // fail on the explanation rather than on the markup.
    const loading = readFileSync(join(SECTION_DIR, 'loading.tsx'), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );

    expect(loading).toContain('role="status"');
    expect(loading).toContain('Loading the overview.');
    expect(loading).toContain('aria-hidden');

    // The final layout's boxes: 4 tiles and the 2fr/1fr split the page uses.
    expect(loading).toContain('sm:grid-cols-2 xl:grid-cols-4');
    expect(loading).toContain('lg:grid-cols-[2fr_1fr]');

    // No chart plot area (004 is cut), no sparkline (L-4), no pending panel (L-2).
    expect(loading).not.toContain('h-48');
    expect(loading.toLowerCase()).not.toContain('sparkline');
    expect(loading.toLowerCase()).not.toContain('chart');

    // And no full-page spinner anywhere.
    expect(loading.toLowerCase()).not.toContain('spinner');
  });

  test('AC-002-28: a failing segment renders a human error state with no stack frame, message or digest', async ({
    page,
  }) => {
    const { messages } = recordConsole(page);

    await signIn(page);
    await page.goto('/_dev/shell-boom');

    const alert = page.locator('main [role="alert"]');
    await expect(alert).toBeVisible();

    const retry = page.getByRole('button', { name: 'Try again' });
    await expect(retry).toBeEnabled();
    await expect(page.getByRole('link', { name: 'Go to Home' })).toBeVisible();

    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body).not.toContain('deliberate failure');
    expect(body).not.toContain('.js:');
    expect(body).not.toContain('digest');
    expect(body).not.toContain('select');
    expect(body).not.toContain('prisma');

    // The overview's **own** boundary, asserted at the source: it destructures
    // only `reset`, so `ErrorState` cannot be handed a message, a digest or a
    // stack even by mistake.
    const errorSource = readFileSync(join(SECTION_DIR, 'error.tsx'), 'utf8');
    expect(errorSource).toContain('<ErrorState');
    expect(errorSource).not.toContain('{error');
    expect(errorSource).not.toContain('error.message');
    expect(errorSource).not.toContain('error.digest');

    expect(
      messages
        .filter((message) => message.type() === 'error')
        .map((message) => message.text())
        .filter((text) => text.toLowerCase().includes('deliberate failure')),
    ).toEqual([]);
  });

  test('AC-002-31: no horizontal overflow at 375 and 1280 px, and the console is clean', async ({
    page,
  }) => {
    const { messages, pageErrors } = recordConsole(page);
    const failedResponses: string[] = [];

    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedResponses.push(`${String(response.status())} ${response.url()}`);
      }
    });

    await signIn(page);

    // 375 px is **not** negotiable: the one real defect of feature 001 was a
    // 3 px overflow at exactly this width that Windows did not reproduce.
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: width === 1280 ? 900 : 812 });
      await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));

      expect(
        overflow.scrollWidth,
        `horizontal overflow at ${String(width)} px`,
      ).toBeLessThanOrEqual(overflow.innerWidth);

      // No figure is clipped to nothing: every amount still renders its string.
      const amounts = page.locator('[data-direction]');
      const amountCount = await amounts.count();
      expect(amountCount).toBeGreaterThan(0);

      for (let index = 0; index < amountCount; index += 1) {
        expect(await amounts.nth(index).innerText()).toMatch(MONEY);
      }
    }

    expect(failedResponses).toEqual([]);
    expect(
      messages
        .filter((message) => ['error', 'warning'].includes(message.type()))
        .map((message) => `${message.type()}: ${message.text()}`),
    ).toEqual([]);
    expect(pageErrors.map((error) => error.message)).toEqual([]);
  });

  test('AC-002-31: light and dark screenshots of the overview at 1280 px and 375 px', async ({
    page,
  }, testInfo) => {
    await signIn(page);

    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: width === 1280 ? 900 : 812 });

      for (const scheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme: scheme });
        await page.evaluate((value) => {
          window.localStorage.setItem('theme', value);
        }, scheme);
        await page.reload();
        await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();

        const name = `overview-${String(width)}-${scheme}.png`;
        const path = testInfo.outputPath(name);
        await page.screenshot({ path, fullPage: true });
        await testInfo.attach(name, { path, contentType: 'image/png' });
      }
    }
  });
});
