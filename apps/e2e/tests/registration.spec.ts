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
    const password = page.getByLabel('Password', { exact: true });
    const confirm = page.getByLabel('Confirm password', { exact: true });
    await page.getByLabel('City').fill(REGISTRANT.city);
    await page.getByLabel('Industry').fill(REGISTRANT.industry);
    await page.getByLabel('Graduation year').fill(REGISTRANT.graduationYear);
    await page.getByLabel('Diploma ID (optional)').fill(REGISTRANT.diplomaNumber);

    // A weak password ticks only the rules it meets and is blocked before reaching the API.
    const metRules = page
      .getByRole('list', { name: 'Password requirements' })
      .getByRole('listitem')
      .filter({ hasText: '(met)' });
    await password.fill('weakpass');
    await expect(metRules).toHaveCount(2);
    await confirm.fill('weakpass');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'meets every requirement' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: SWITCHER })).toHaveCount(0);

    // A strong password satisfies every rule, but a mismatching confirmation still blocks sign-up.
    await password.fill(REGISTRANT.password);
    await expect(metRules).toHaveCount(5);
    await confirm.fill(`${REGISTRANT.password}x`);
    await expect(page.getByText('Passwords do not match.')).toBeVisible();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('button', { name: SWITCHER })).toHaveCount(0);

    // The eye toggle reveals what was typed.
    await page.getByRole('button', { name: 'Show password', exact: true }).click();
    await expect(password).toHaveAttribute('type', 'text');

    await confirm.fill(REGISTRANT.password);
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
    await page.getByLabel('Password', { exact: true }).fill(REGISTRANT.password);
    await page.getByLabel('Confirm password', { exact: true }).fill(REGISTRANT.password);
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
