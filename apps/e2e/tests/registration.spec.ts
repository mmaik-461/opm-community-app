import { expect, test } from '@playwright/test';
import { REGISTRANT } from '../constants';

const SWITCHER = 'Switch current user';

test.describe('Registration and verification', () => {
  test('a new alumnus signs up, lands in the app as pending, and is blocked from matchmaking', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Sign up' }).click();
    await page.getByLabel('Full name').fill(REGISTRANT.fullName);
    await page.getByLabel('Email').fill(REGISTRANT.email);
    await page.getByLabel('Password').fill('short');
    await page.getByLabel('City').fill(REGISTRANT.city);
    await page.getByLabel('Industry').fill(REGISTRANT.industry);
    await page.getByLabel('Graduation year').fill(REGISTRANT.graduationYear);
    await page.getByLabel('Diploma ID (optional)').fill(REGISTRANT.diplomaNumber);

    // The browser enforces the password length before anything reaches the API.
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('button', { name: SWITCHER })).toHaveCount(0);

    await page.getByLabel('Password').fill(REGISTRANT.password);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByRole('button', { name: SWITCHER })).toContainText(REGISTRANT.fullName);
    await expect(page.getByRole('status')).toContainText('awaiting alumni verification');

    // The pending state survives a reload (the session is a cookie).
    await page.reload();
    await expect(page.getByRole('status')).toContainText('awaiting alumni verification');

    // The real API refuses matchmaking until the alumnus is verified.
    await page.getByRole('button', { name: 'Fintech in London' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'awaiting alumni verification' }),
    ).toBeVisible();
  });

  test('the registered credentials sign in again, and a taken email is rejected', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByLabel('Email').fill(REGISTRANT.email);
    await page.getByLabel('Password').fill(REGISTRANT.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: SWITCHER })).toContainText(REGISTRANT.fullName);
    await page.getByRole('button', { name: 'Sign out' }).click();

    await page.getByRole('tab', { name: 'Sign up' }).click();
    await page.getByLabel('Full name').fill('Someone Else');
    await page.getByLabel('Email').fill(REGISTRANT.email);
    await page.getByLabel('Password').fill(REGISTRANT.password);
    await page.getByLabel('City').fill(REGISTRANT.city);
    await page.getByLabel('Industry').fill(REGISTRANT.industry);
    await page.getByLabel('Graduation year').fill(REGISTRANT.graduationYear);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'An account with this email already exists' }),
    ).toBeVisible();
  });

  test('quick-login alumni are verified and see no banner', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^Continue as Anna Kowalska/ }).click();
    await expect(page.getByRole('button', { name: SWITCHER })).toBeEnabled();
    await expect(page.getByRole('status')).toHaveCount(0);
  });
});
