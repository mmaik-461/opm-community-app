import { expect, test, type Page } from '@playwright/test';
import { ADMIN_USER, DEFAULT_USER } from '../constants';
import { fetchProfiles } from '../utils/api';
import { actAs, openApp, openSection } from '../utils/app';
import { stubMatchmaking } from '../utils/matchmaking-stub';

const POSITIVE_QUERY = 'Feedback journey: seed round intros';
const NEGATIVE_QUERY = 'Feedback journey: biotech founders';
const NEGATIVE_COMMENT = 'Works in a different sector entirely';

const thanks = (page: Page) =>
  page.getByRole('status').filter({ hasText: 'Thanks for your feedback' });

test.describe('Matchmaker feedback loop', () => {
  test('feedback left on a match shows up in the admin Feedback Analytics table', async ({
    page,
    request,
  }) => {
    await openApp(page, DEFAULT_USER);
    const profiles = await fetchProfiles(request);
    await stubMatchmaking(page, profiles);
    const searchBox = page.getByRole('textbox', { name: 'What are you looking for?' });

    // 1. A thumbs up on the top match of the first search.
    await searchBox.fill(POSITIVE_QUERY);
    await page.getByRole('button', { name: 'Find matches' }).click();
    await expect(page.getByText('Mutual synergy')).toHaveCount(3);
    const liked = page.getByRole('heading', { level: 3 }).first();
    const likedName = (await liked.textContent())!;
    // The first card's controls come first in the DOM; the others keep theirs until rated.
    await page.getByRole('button', { name: 'Relevant', exact: true }).first().click();
    await expect(thanks(page)).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Relevant', exact: true })).toHaveCount(2);

    // 2. A thumbs down with a reason and a comment on a second search.
    await searchBox.fill(NEGATIVE_QUERY);
    await page.getByRole('button', { name: 'Find matches' }).click();
    await expect(page.getByText('Mutual synergy')).toHaveCount(3);
    const disliked = page.getByRole('heading', { level: 3 }).first();
    const dislikedName = (await disliked.textContent())!;
    await page.getByRole('button', { name: 'Not relevant' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'What was off about this match?' });
    await dialog.getByLabel('Different industry').check();
    await dialog.getByLabel('Comment (optional)').fill(NEGATIVE_COMMENT);
    await dialog.getByRole('button', { name: 'Submit feedback' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(thanks(page)).toHaveCount(1);

    // 3. The admin sees both reviews, newest first, with the reviewer, candidate and details.
    await actAs(page, ADMIN_USER);
    await openSection(page, 'Verifications');
    await openSection(page, 'Feedback Analytics');
    await expect(page.getByRole('heading', { name: 'Feedback analytics' })).toBeVisible();
    await expect(page.getByText('Total reviews')).toBeVisible();
    await expect(page.getByText('Satisfaction rate')).toBeVisible();

    const badRow = page.getByRole('row', { name: new RegExp(NEGATIVE_QUERY) });
    await expect(badRow).toContainText(DEFAULT_USER);
    await expect(badRow).toContainText(dislikedName);
    await expect(badRow).toContainText('Not relevant');
    await expect(badRow).toContainText('Different industry');
    await expect(badRow).toContainText(NEGATIVE_COMMENT);

    const goodRow = page.getByRole('row', { name: new RegExp(POSITIVE_QUERY) });
    await expect(goodRow).toContainText(DEFAULT_USER);
    await expect(goodRow).toContainText(likedName);
    await expect(goodRow).toContainText('Relevant');
    await expect(goodRow).toContainText('Great match');

    const rows = page.getByRole('row').filter({ hasText: 'Feedback journey' });
    await expect(rows.first()).toContainText(NEGATIVE_QUERY); // newest first
  });

  test('members are denied at /admin/feedback', async ({ page }) => {
    await openApp(page, DEFAULT_USER);
    await page.goto('/admin/feedback');
    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
    await expect(page.getByText('Total reviews')).toHaveCount(0);
  });
});
