import { expect, test, type Page } from '@playwright/test';
import type { Profile } from '@opm/shared-types';
import { fetchProfiles } from '../utils/api';
import { actAs, openApp, openTab } from '../utils/app';
import { stubMatchmaking } from '../utils/matchmaking-stub';

// Intros are persisted in the shared e2e database, so each journey uses its own pair.
const ACCEPT_PAIR = { requester: 'Anna Kowalska', target: 'James Whitfield' };
const DECLINE_PAIR = { requester: 'Marcus Feldman', target: 'Priya Raman' };

async function requestIntroTo(page: Page, profiles: Profile[], target: string, message?: string) {
  // The matchmaker is stubbed so the intro (real API + real DB) can be requested deterministically.
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await stubMatchmaking(page, profiles, async (route) => {
    const targetProfile = profiles.find((p) => p.fullName === target)!;
    await route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*' },
      contentType: 'application/json',
      body: JSON.stringify({
        matches: [
          {
            profile: targetProfile,
            similarityScore: 0.93,
            matchReason: 'Strong overlap.',
            mutualSynergy: 'Great mutual fit.',
            suggestedIcebreaker: 'Hi! Loved your background.',
          },
        ],
      }),
    });
  });
  await openTab(page, 'AI Matchmaker');
  await page.getByRole('textbox', { name: 'What are you looking for?' }).fill('Series A advice');
  await page.getByRole('button', { name: 'Find matches' }).click();

  const card = page.getByRole('heading', { name: target, level: 3 });
  await expect(card).toBeVisible();
  await page.getByRole('button', { name: 'Request Intro' }).click();

  const dialog = page.getByRole('dialog', { name: 'Request an intro' });
  if (message) await dialog.getByLabel('Your message').fill(message);
  await dialog.getByRole('button', { name: 'Send request' }).click();
  return dialog;
}

test.describe('Intro request closed loop', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test('A requests B, B sees the badge and accepts, A sees ACCEPTED', async ({ page, request }) => {
    const profiles = await fetchProfiles(request);
    const { requester, target } = ACCEPT_PAIR;
    const message = 'Hi James, I would love to learn how you scaled product at LedgerWise.';

    // --- A sends the request
    await actAs(page, requester);
    await requestIntroTo(page, profiles, target, message);
    await expect(page.getByRole('button', { name: 'Intro Requested' })).toBeDisabled();

    await openTab(page, 'My Intros');
    await page.getByRole('tab', { name: /^Sent/ }).click();
    await expect(page.getByRole('heading', { name: target, level: 3 })).toBeVisible();
    await expect(page.getByText(message)).toBeVisible();
    await expect(page.getByText('Pending', { exact: true })).toBeVisible();
    await expect(page.getByLabel(/pending$/)).toHaveCount(0); // A has nothing incoming

    // --- B sees the pending badge in the header, then accepts
    await actAs(page, target);
    await expect(
      page.getByRole('tab', { name: /^My Intros/ }).getByLabel('1 pending'),
    ).toBeVisible();

    await openTab(page, 'My Intros');
    await page.getByRole('tab', { name: /^Received/ }).click();
    await expect(page.getByRole('tab', { name: /^Received/ })).toContainText('1 new');
    await expect(page.getByRole('heading', { name: requester, level: 3 })).toBeVisible();
    await expect(page.getByText(message)).toBeVisible();

    await page.getByRole('button', { name: 'Accept' }).click();
    await expect(page.getByText('Accepted', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accept' })).toHaveCount(0);
    await expect(page.getByLabel('1 pending')).toHaveCount(0);

    // --- back to A: the request is now ACCEPTED
    await actAs(page, requester);
    await openTab(page, 'My Intros');
    await page.getByRole('tab', { name: /^Sent/ }).click();
    await expect(page.getByRole('heading', { name: target, level: 3 })).toBeVisible();
    await expect(page.getByText('Accepted', { exact: true })).toBeVisible();
    await expect(page.getByText('Pending', { exact: true })).toHaveCount(0);
  });

  test('rejects a duplicate pending request and shows DECLINED to the requester', async ({
    page,
    request,
  }) => {
    const profiles = await fetchProfiles(request);
    const { requester, target } = DECLINE_PAIR;

    await actAs(page, requester);
    await requestIntroTo(page, profiles, target);
    await expect(page.getByRole('button', { name: 'Intro Requested' })).toBeDisabled();

    // A fresh search offers the same person again; the server refuses the duplicate.
    const dialog = await requestIntroTo(page, profiles, target);
    await expect(dialog.getByRole('alert')).toContainText('A pending intro already exists');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();

    await actAs(page, target);
    await openTab(page, 'My Intros');
    await page.getByRole('tab', { name: /^Received/ }).click();
    await expect(page.getByRole('heading', { name: requester, level: 3 })).toHaveCount(1);
    await page.getByRole('button', { name: 'Decline' }).click();
    await expect(page.getByText('Declined', { exact: true })).toBeVisible();
    await expect(page.getByLabel('1 pending')).toHaveCount(0);

    await actAs(page, requester);
    await openTab(page, 'My Intros');
    await page.getByRole('tab', { name: /^Sent/ }).click();
    await expect(page.getByText('Declined', { exact: true })).toBeVisible();
  });
});
