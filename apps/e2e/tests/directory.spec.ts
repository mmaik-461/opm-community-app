import { expect, test } from '@playwright/test';
import { MAX_LAYOUT_SHIFT, MIN_DIRECTORY_GRID_HEIGHT_PX, SEARCH_DEBOUNCE_MS } from '../constants';
import { fetchProfiles } from '../utils/api';
import { openApp, openSection } from '../utils/app';
import { readLayoutShift, resetLayoutShift, trackLayoutShift } from '../utils/layout-shift';

test.describe('Alumni Directory', () => {
  test.beforeEach(async ({ page }) => {
    await trackLayoutShift(page);
    await openApp(page);
    await openSection(page, 'Alumni Directory');
  });

  test('filters by city and industry together, and clears', async ({ page, request }) => {
    const profiles = await fetchProfiles(request);
    const city = 'London';
    const industry = 'Fintech';
    const byCity = profiles.filter((p) => p.city === city);
    const both = byCity.filter((p) => p.industry === industry);
    expect(both.length, 'seed data should contain London + Fintech alumni').toBeGreaterThan(0);
    expect(both.length).toBeLessThan(byCity.length);

    await expect(
      page.getByRole('heading', { name: `${profiles.length} of ${profiles.length} alumni` }),
    ).toBeVisible();

    await page.getByRole('button', { name: city, exact: true }).click();
    await expect(page.getByRole('button', { name: city, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(
      page.getByRole('heading', { name: `${byCity.length} of ${profiles.length} alumni` }),
    ).toBeVisible();

    await page.getByRole('button', { name: industry, exact: true }).click();
    await expect(
      page.getByRole('heading', { name: `${both.length} of ${profiles.length} alumni` }),
    ).toBeVisible();
    for (const p of both) {
      await expect(page.getByRole('heading', { name: p.fullName, level: 3 })).toBeVisible();
    }
    const excluded = byCity.find((p) => p.industry !== industry)!;
    await expect(page.getByRole('heading', { name: excluded.fullName, level: 3 })).toHaveCount(0);

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(
      page.getByRole('heading', { name: `${profiles.length} of ${profiles.length} alumni` }),
    ).toBeVisible();
  });

  test('debounces search: results change only after typing pauses', async ({ page, request }) => {
    const profiles = await fetchProfiles(request);
    const target = profiles[0];
    const term = target.fullName.split(' ')[1].toLowerCase();
    const expected = profiles.filter((p) =>
      [p.fullName, p.headline, p.city, p.cohort, p.industry, ...p.skills].some((v) =>
        v.toLowerCase().includes(term),
      ),
    );
    const total = profiles.length;

    // A controlled browser clock makes the debounce window deterministic.
    await page.clock.install();
    await page.reload();
    await openApp(page);
    await openSection(page, 'Alumni Directory');
    await expect(page.getByRole('heading', { name: `${total} of ${total} alumni` })).toBeVisible();
    await page.clock.pauseAt(new Date(Date.now() + 5_000));

    await page.getByRole('textbox', { name: 'Search alumni' }).fill(term);
    await page.clock.runFor(SEARCH_DEBOUNCE_MS - 20);
    await expect(page.getByRole('heading', { name: `${total} of ${total} alumni` })).toBeVisible();

    await page.clock.runFor(40);
    await expect(
      page.getByRole('heading', { name: `${expected.length} of ${total} alumni` }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: target.fullName, level: 3 })).toBeVisible();
  });

  test('causes no layout shift while filtering, searching or hitting the empty state', async ({
    page,
    request,
  }) => {
    const profiles = await fetchProfiles(request);
    const total = profiles.length;
    await expect(page.getByRole('heading', { name: `${total} of ${total} alumni` })).toBeVisible();

    const search = page.getByRole('textbox', { name: 'Search alumni' });
    const topBefore = (await search.boundingBox())!.y;
    await resetLayoutShift(page);

    // populated -> few results
    const inWarsaw = profiles.filter((p) => p.city === 'Warsaw').length;
    await page.getByRole('button', { name: 'Warsaw', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: `${inWarsaw} of ${total} alumni` }),
    ).toBeVisible();
    expect((await search.boundingBox())!.y).toBe(topBefore);

    // few results -> empty state
    await search.fill('zzz-no-such-person');
    await expect(page.getByText('No alumni match your filters')).toBeVisible();
    expect((await search.boundingBox())!.y).toBe(topBefore);

    // the empty state keeps at least the reserved grid height instead of collapsing
    const empty = page.getByText('No alumni match your filters');
    const emptyCard = empty.locator('xpath=ancestor::div[contains(@class,"border-dashed")][1]');
    expect((await emptyCard.boundingBox())!.height).toBeGreaterThanOrEqual(
      MIN_DIRECTORY_GRID_HEIGHT_PX,
    );

    // empty -> populated again
    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await expect(page.getByRole('heading', { name: `${total} of ${total} alumni` })).toBeVisible();

    expect(await readLayoutShift(page)).toBeLessThanOrEqual(MAX_LAYOUT_SHIFT);
  });
});
