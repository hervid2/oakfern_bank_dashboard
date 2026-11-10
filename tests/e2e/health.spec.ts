import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';

/**
 * End-to-end verification of feature 000 against a locally **built production**
 * server (AC-000-06, AC-000-08, AC-000-09).
 *
 * Two of these assertions exist specifically because `curl` cannot make them:
 * the root `error.tsx` boundary renders on the **client**, after hydration, so
 * the forced-error response body is only Next's minimal
 * `<html id="__next_error__">` document. The heading, the sentence and the
 * retry affordance are facts about the hydrated DOM and nothing else can see
 * them. `h1` counting is the same kind of fact.
 *
 * **No axe scan** — deferred to feature 003 (spec v0.3).
 */

/** Collects everything the page writes to the console, for the clean-console assertion. */
function recordConsole(page: Page): { messages: ConsoleMessage[]; pageErrors: Error[] } {
  const messages: ConsoleMessage[] = [];
  const pageErrors: Error[] = [];

  page.on('console', (message) => messages.push(message));
  page.on('pageerror', (error) => pageErrors.push(error));

  return { messages, pageErrors };
}

const describeMessage = (message: ConsoleMessage): string => `${message.type()}: ${message.text()}`;

test.describe('walking skeleton', () => {
  test('AC-000-09: / renders the placeholder inside a valid document shell, with a clean console', async ({
    page,
  }) => {
    const { messages, pageErrors } = recordConsole(page);

    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    // The placeholder itself (spec §7 copy).
    await expect(page.getByRole('heading', { level: 1, name: 'Oakfern' })).toBeVisible();
    await expect(page.getByText('Banking dashboard — setup in progress.')).toBeVisible();

    // Document shell — the only UI criterion 000 verifies (CL-07).
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect((await page.title()).trim().length).toBeGreaterThan(0);
    expect(await page.locator('h1').count()).toBe(1);

    // Clean console: no errors, no warnings, nothing at all.
    expect(
      messages
        .filter((message) => ['error', 'warning'].includes(message.type()))
        .map(describeMessage),
    ).toEqual([]);
    expect(pageErrors.map((error) => error.message)).toEqual([]);
  });

  test('AC-000-06: GET /api/health returns 200 with exactly the four frozen keys', async ({
    request,
  }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(response.headers()['cache-control']).toContain('no-store');

    const body = (await response.json()) as Record<string, unknown>;

    // The key set of spec §8.1 is closed, which is what proves non-leakage.
    expect(Object.keys(body).sort()).toEqual(['database', 'latencyMs', 'status', 'timestamp']);
    expect(body.status).toBe('ok');
    expect(body.database).toBe('ok');
    expect(typeof body.latencyMs).toBe('number');
    expect(typeof body.timestamp).toBe('string');
  });

  test('AC-000-08: an unknown path renders the not-found screen at 404 with a link home', async ({
    page,
  }) => {
    const { pageErrors } = recordConsole(page);

    const response = await page.goto('/no-such-page');
    expect(response?.status()).toBe(404);

    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    await expect(page.getByText("We couldn't find that page.")).toBeVisible();

    const home = page.getByRole('link', { name: 'Back to home' });
    await expect(home).toBeVisible();
    await expect(home).toHaveAttribute('href', '/');

    expect(pageErrors.map((error) => error.message)).toEqual([]);
  });

  test('AC-000-08: a forced render error renders error.tsx with its retry affordance and no stack trace', async ({
    page,
  }) => {
    const { messages } = recordConsole(page);

    await page.goto('/_dev/boom');

    // These three only exist after hydration swaps in the client error
    // boundary, which is exactly why this assertion cannot be made with curl.
    await expect(
      page.getByRole('heading', { level: 1, name: 'Something went wrong' }),
    ).toBeVisible();
    await expect(page.getByText('Something went wrong loading this page.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();

    // Nothing from the thrown error reaches the page: no message, no stack.
    const rendered = (await page.locator('body').innerText()).toLowerCase();
    expect(rendered).not.toContain('deliberate failure');
    expect(rendered).not.toContain('.js:');
    expect(rendered).not.toContain('at boompage');

    // Nor does it reach the console. Next.js logs a generic production notice
    // here on purpose; what must never appear is the original message or a
    // stack frame.
    const consoleText = messages.map(describeMessage).join('\n').toLowerCase();
    expect(consoleText).not.toContain('deliberate failure');
    expect(consoleText).not.toContain('at boompage');
  });
});
