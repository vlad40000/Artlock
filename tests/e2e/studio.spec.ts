import { test, expect } from '@playwright/test';

const TEST_SESSION_ID = '80e091b4-5604-4aaf-80df-aa19bc67f70d';
const TEST_AUTH_TOKEN = 'test-session-token';

test.describe('Artlock Studio', () => {
  test.beforeEach(async ({ context }) => {
    // Set the auth cookie
    await context.addCookies([
      {
        name: 'tls_session',
        value: TEST_AUTH_TOKEN,
        domain: '127.0.0.1',
        path: '/',
      },
    ]);
  });

  test('should load the studio interface for a valid session', async ({ page }) => {
    // Navigate to the studio page
    await page.goto(`/studio/${TEST_SESSION_ID}`);

    // Wait for the main canvas stage to be visible
    const mainStage = page.locator('main.rounded-tls-34');
    await expect(mainStage).toBeVisible({ timeout: 15000 });

    // Check for the Dynamic Phase badge in the TopBar (starts with EXTRACT or SURGICAL)
    const dynamicBadge = page.locator('header').locator('span.inline-flex');
    await expect(dynamicBadge).toBeVisible();
    const badgeText = await dynamicBadge.innerText();
    expect(['EXTRACT', 'SURGICAL']).toContain(badgeText);

    // Check for the Quick Menu trigger
    const quickMenuTrigger = page.locator('aside.left-7').getByRole('button', { name: '▦' });
    await expect(quickMenuTrigger).toBeVisible();

    // Check for Bottom Command strip
    const bottomCommand = page.locator('section.bottom-\\[22px\\]');
    await expect(bottomCommand).toBeVisible();
  });

  test('should show 404 for an invalid session ID', async ({ page }) => {
    const invalidId = '00000000-0000-0000-0000-000000000000';
    const response = await page.goto(`/studio/${invalidId}`);
    expect(response?.status()).toBe(404);
  });
});
