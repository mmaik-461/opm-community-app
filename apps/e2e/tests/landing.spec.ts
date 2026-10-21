import { expect, test, type Page } from '@playwright/test';
import { DEFAULT_USER, LOGIN_PATH, MATCHMAKER_PATH } from '../constants';
import { expectSignedInAs, openApp } from '../utils/app';

const heroHeading = (page: Page) =>
  page.getByRole('heading', { level: 1, name: 'Find the right alumni, instantly.' });

test.describe('Public landing page', () => {
  test('shows the landing page to an anonymous visitor instead of redirecting to /login', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(heroHeading(page)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Smart Semantic Matchmaking' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Who is in the network' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Trust is the product' })).toBeVisible();
    await expect(page.getByRole('contentinfo')).toContainText('©');
  });

  test('"Join the Network" leads to registration', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Join the Network' }).first().click();
    await expect(page).toHaveURL('/register');
  });

  test('"Sign In" leads to the sign-in page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Sign In' }).first().click();
    await expect(page).toHaveURL(LOGIN_PATH);
  });

  test('keeps protected pages behind sign-in', async ({ page }) => {
    await page.goto('/directory');
    await expect(page).toHaveURL('/login?callbackUrl=%2Fdirectory');
  });

  test('routes a signed-in user from / into the application', async ({ page }) => {
    await openApp(page);
    await page.goto('/');
    await expect(page).toHaveURL(MATCHMAKER_PATH);
    await expect(heroHeading(page)).toHaveCount(0);
    await expectSignedInAs(page, DEFAULT_USER);
  });
});
