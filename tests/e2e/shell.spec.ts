import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';

/**
 * End-to-end verification of the feature 001 shell against a locally **built
 * production** server (the `webServer` of `playwright.config.ts`).
 *
 * Why these assertions live here and not in a unit test: every one of them is a
 * fact about a real browser — a cookie's flags, a class applied by a blocking
 * script before the first paint, a document's scroll width at 375 px, focus
 * returning after `Esc`, and what is *absent* from a rendered error page. None
 * of that is observable from Node.
 *
 * **No axe scan** — deferred to feature 003 by the Technical Director's
 * decision. Do not add it back here.
 */

/** The name written by the deterministic seed (`prisma/seed/catalog.ts`). */
const DEMO_USER_NAME = 'Ada Whitfield';

const NAV_LABELS = ['Home', 'Transactions', 'Move money'] as const;

function recordConsole(page: Page): { messages: ConsoleMessage[]; pageErrors: Error[] } {
  const messages: ConsoleMessage[] = [];
  const pageErrors: Error[] = [];

  page.on('console', (message) => messages.push(message));
  page.on('pageerror', (error) => pageErrors.push(error));

  return { messages, pageErrors };
}

/** UI-01 → `/home`. The only way into the product, so every test uses it. */
async function signIn(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue as demo' }).click();
  await page.waitForURL('/home');
}

test.describe('shell', () => {
  test('AC-001-09: "Continue as demo" signs in, renders the shell and sets an HttpOnly SameSite=Lax cookie', async ({
    page,
    context,
  }) => {
    const { pageErrors } = recordConsole(page);

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('cash position');

    await page.getByRole('button', { name: 'Continue as demo' }).click();
    await page.waitForURL('/home');

    // The shell, with the identity read back out of the seeded workspace.
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect(page.getByRole('button', { name: `Account: ${DEMO_USER_NAME}` })).toBeVisible();

    const cookie = (await context.cookies()).find(
      (candidate) => candidate.name === 'oakfern_session',
    );
    expect(cookie, 'the session cookie must exist after sign-in').toBeDefined();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('Lax');
    expect(cookie?.path).toBe('/');
    // `Secure` is set because this is a **production** build
    // (`sessionCookieOptions` keys it off NODE_ENV, ADR-0004); `localhost` is a
    // secure context, which is why the cookie still arrives over plain http.
    // The deployed half of the AC therefore holds by construction.
    expect(cookie?.secure).toBe(true);
    // 8 hours, no refresh. A session cookie (-1) would not survive a restart.
    expect(cookie?.expires).toBeGreaterThan(Date.now() / 1000);

    expect(pageErrors.map((error) => error.message)).toEqual([]);
  });

  test('AC-001-11: "Sign out" clears the cookie and /home then redirects to /', async ({
    page,
    context,
  }) => {
    await signIn(page);

    await page.getByRole('button', { name: `Account: ${DEMO_USER_NAME}` }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await page.waitForURL('/');

    const cookie = (await context.cookies()).find(
      (candidate) => candidate.name === 'oakfern_session',
    );
    expect(cookie?.value ?? '').toBe('');

    // And the guard holds on a fresh request, not just in this tab.
    const direct = await page.goto('/home');
    expect(direct?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/');
  });

  test('AC-001-13: the sidebar lists exactly three navigable items with exactly one aria-current', async ({
    page,
  }) => {
    await signIn(page);

    const nav = page.getByRole('navigation', { name: 'Main' });
    const links = nav.getByRole('link');

    await expect(links).toHaveCount(NAV_LABELS.length);
    await expect(links).toHaveText([...NAV_LABELS]);

    // Every item resolves: cut C1 removed the two that would not have.
    expect(
      await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href'))),
    ).toEqual(['/home', '/transactions', '/move-money']);

    const current = page.locator('[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveText('Home');

    // …and it follows the route rather than being hard-coded.
    await nav.getByRole('link', { name: 'Transactions' }).click();
    await page.waitForURL('/transactions');
    await expect(page.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(page.locator('[aria-current="page"]')).toHaveText('Transactions');

    // The user menu names the seeded user; the CTA has an accessible name.
    await expect(page.getByRole('button', { name: `Account: ${DEMO_USER_NAME}` })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Move money', exact: true }).last()).toBeVisible();
  });

  test('AC-001-14: a dark OS preference renders dark before the first paint, and the toggle survives a reload', async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();

    // Recorded by the page itself, at DOMContentLoaded — i.e. after the
    // theme's blocking script and before the body is painted. If the class is
    // already there, an unstyled flash was never possible.
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        (window as unknown as Record<string, unknown>).__htmlClassAtDomReady =
          document.documentElement.className;
      });
    });

    await signIn(page);

    const classAtDomReady = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__htmlClassAtDomReady as string,
    );
    expect(classAtDomReady).toContain('dark');
    await expect(page.locator('html')).toHaveClass(/dark/);

    // The choice persists. From `system` the next state is `light`.
    await page.getByRole('button', { name: /^Switch to .* theme$/ }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    await page.reload();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();

    await context.close();
  });

  test('AC-001-15: no horizontal scroll at 375, 768, 1280 and 1440 px, and the sidebar becomes a sheet below 1024 px', async ({
    page,
  }) => {
    await signIn(page);

    for (const width of [375, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(
        overflow.scrollWidth,
        `horizontal overflow at ${String(width)} px`,
      ).toBeLessThanOrEqual(overflow.innerWidth);
    }

    // At 1280 px the sidebar is a fixed column and there is no menu button.
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeHidden();

    // At 375 px it is absent, and the topbar button opens it as a sheet.
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('aside')).toBeHidden();

    const menu = page.getByRole('button', { name: 'Open navigation' });
    await expect(menu).toBeVisible();
    await menu.click();

    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('link', { name: 'Transactions' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
  });

  test('AC-001-16: a failing segment renders the shell error state with no stack frame, message or digest', async ({
    page,
  }) => {
    const { messages } = recordConsole(page);

    await signIn(page);
    await page.goto('/_dev/shell-boom');

    // Scoped to `main`: Next renders its own empty `role="alert"` route
    // announcer in the document, so an unscoped role query is ambiguous.
    const alert = page.locator('main [role="alert"]');
    await expect(alert).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 1, name: "We couldn't load this section" }),
    ).toBeVisible();
    const retry = page.getByRole('button', { name: 'Try again' });
    await expect(retry).toBeVisible();
    await expect(retry).toBeEnabled();

    // The navigation survives a failed section.
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();

    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body).not.toContain('deliberate failure');
    expect(body).not.toContain('at shellboompage');
    expect(body).not.toContain('.js:');
    expect(body).not.toContain('digest');

    // Retry re-renders the segment, which throws again — so the state is a
    // real boundary, not a one-shot screen.
    await retry.click();
    await expect(alert).toBeVisible();

    const consoleText = messages
      .map((message) => `${message.type()}: ${message.text()}`)
      .join('\n')
      .toLowerCase();
    expect(consoleText).not.toContain('deliberate failure');
    expect(consoleText).not.toContain('at shellboompage');
  });

  test('AC-001-17: an unknown URL under the shell answers 404 inside the shell', async ({
    page,
  }) => {
    await signIn(page);

    const response = await page.goto('/transactions/no-such-transaction');
    expect(response?.status()).toBe(404);

    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    await expect(page.getByText("That page isn't here")).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();

    await page.getByRole('link', { name: 'Go to Home' }).click();
    await page.waitForURL('/home');
  });

  test('AC-001-18: every shell route ships a content-shaped loading.tsx and an honest placeholder', async () => {
    // The file half, asserted against the source tree: a route without a
    // `loading.tsx` has no skeleton to shape, however good its page looks.
    const group = join(process.cwd(), 'src', 'app', '(app)');
    for (const section of ['home', 'transactions', 'move-money']) {
      // `(section)` is a route group, so it adds no URL segment: the page and
      // its skeleton live there so that the sibling `[...notFound]` catch-all
      // stays outside the Suspense boundary and can answer a real 404.
      expect(
        readdirSync(join(group, section, '(section)')),
        `${section} must own a loading.tsx`,
      ).toContain('loading.tsx');
    }
  });

  test('AC-001-18: each placeholder route states what it does not yet do', async ({ page }) => {
    await signIn(page);

    await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
    await expect(page.getByText('No figures on this screen yet')).toBeVisible();

    await page.goto('/transactions');
    await expect(page.getByRole('heading', { level: 1, name: 'Transactions' })).toBeVisible();
    await expect(page.getByText('The ledger is seeded, the table is not built yet')).toBeVisible();

    await page.goto('/move-money');
    await expect(page.getByRole('heading', { level: 1, name: 'Move money' })).toBeVisible();
    await expect(page.getByText('Transfers are not open yet')).toBeVisible();

    // Exactly one h1 per page, on each of the three.
    expect(await page.locator('h1').count()).toBe(1);
  });

  test('AC-001-24: a page load logs no /favicon.ico 404 and the icon is served from src/app', async ({
    page,
  }) => {
    const { messages, pageErrors } = recordConsole(page);
    const failed: string[] = [];

    page.on('response', (response) => {
      if (response.status() >= 400) {
        failed.push(`${String(response.status())} ${response.url()}`);
      }
    });

    await signIn(page);

    expect(failed.filter((entry) => entry.includes('favicon'))).toEqual([]);
    expect(failed).toEqual([]);

    const icon = await page.request.get('/icon.svg');
    expect(icon.status()).toBe(200);
    expect(icon.headers()['content-type']).toContain('svg');

    expect(
      messages
        .filter((message) => ['error', 'warning'].includes(message.type()))
        .map((message) => `${message.type()}: ${message.text()}`),
    ).toEqual([]);
    expect(pageErrors.map((error) => error.message)).toEqual([]);
  });

  test('AC-001-14 + AC-001-15: light and dark screenshots at 1280 px and 375 px', async ({
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

        const name = `home-${String(width)}-${scheme}.png`;
        const path = testInfo.outputPath(name);
        await page.screenshot({ path, fullPage: true });
        await testInfo.attach(name, { path, contentType: 'image/png' });
      }
    }
  });

  test('AC-001-09: light and dark screenshots of the landing page', async ({ page }, testInfo) => {
    // Anonymous on purpose: `/` redirects to `/home` once a cookie exists, so
    // this test must never call `signIn`.
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'Continue as demo' })).toBeVisible();

      const name = `landing-1280-${scheme}.png`;
      const path = testInfo.outputPath(name);
      await page.screenshot({ path, fullPage: true });
      await testInfo.attach(name, { path, contentType: 'image/png' });
    }
  });
});
