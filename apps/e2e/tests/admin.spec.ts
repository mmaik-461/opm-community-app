import { expect, test } from '@playwright/test';
import { ADMIN_USER, APPLICANT, DEFAULT_USER } from '../constants';
import { fetchProfiles } from '../utils/api';
import { actAs, openApp, openSection } from '../utils/app';
import { stubMatchmaking } from '../utils/matchmaking-stub';

const SWITCHER = 'Switch current user';

test.describe('Admin verification panel', () => {
  test('members see no Verifications tab and are denied at /admin', async ({ page }) => {
    await openApp(page, DEFAULT_USER);
    await expect(page.getByRole('link', { name: /^Verifications/ })).toHaveCount(0);

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Approve/ })).toHaveCount(0);
  });

  test('an admin approves a new registration and the applicant is then verified', async ({
    page,
    request,
  }) => {
    // 1. Register: the new alumnus lands in the app as pending.
    await page.goto('/');
    await page.getByRole('link', { name: 'Sign up' }).click();
    await page.getByLabel('Full name').fill(APPLICANT.fullName);
    await page.getByLabel('Email').fill(APPLICANT.email);
    await page.getByLabel('Password', { exact: true }).fill(APPLICANT.password);
    await page.getByLabel('Confirm password', { exact: true }).fill(APPLICANT.password);
    await page.getByLabel('City').fill(APPLICANT.city);
    await page.getByLabel('Industry').fill(APPLICANT.industry);
    await page.getByLabel('Graduation year').fill(APPLICANT.graduationYear);
    await page.getByLabel('Diploma ID (optional)').fill(APPLICANT.diplomaNumber);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('button', { name: SWITCHER })).toContainText(APPLICANT.fullName);
    await expect(page.getByRole('status')).toContainText('awaiting alumni verification');
    await expect(page.getByRole('link', { name: /^Verifications/ })).toHaveCount(0);

    // 2. Act as the admin: the tab shows up with the pending count and lists the applicant.
    await actAs(page, ADMIN_USER);
    await expect(page.getByRole('status')).toHaveCount(0);
    const tab = page.getByRole('link', { name: /^Verifications/ });
    await expect(tab).toBeVisible();
    await expect(tab.getByLabel(/pending$/)).toBeVisible();
    await openSection(page, 'Verifications');

    const row = page.getByRole('row', { name: new RegExp(APPLICANT.fullName) });
    await expect(row).toContainText(APPLICANT.email);
    await expect(row).toContainText(APPLICANT.graduationYear);
    await expect(row).toContainText(APPLICANT.diplomaNumber);

    // 3. Approve: the row leaves the queue immediately and the admin gets feedback.
    await page.getByRole('button', { name: `Approve ${APPLICANT.fullName}` }).click();
    await expect(page.getByRole('status')).toContainText(`${APPLICANT.fullName} approved`);
    await expect(row).toHaveCount(0);

    // 4. Back as the applicant: verified, banner gone, matchmaking answers.
    await actAs(page, APPLICANT.fullName);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^Verifications/ })).toHaveCount(0);

    // The real API now accepts this user; matchmaking's LLM is stubbed like in the matchmaker journey.
    await openSection(page, 'AI Matchmaker');
    await stubMatchmaking(page, await fetchProfiles(request));
    await page.getByRole('button', { name: 'Fintech in London' }).click();
    await expect(page.getByText(/Top 3 for .Fintech in London./)).toBeVisible();
    await expect(
      page.getByRole('alert').filter({ hasText: 'awaiting alumni verification' }),
    ).toHaveCount(0);
  });
});
