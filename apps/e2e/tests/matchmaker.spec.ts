import { expect, test } from '@playwright/test';
import { MATCH_COUNT, MAX_LAYOUT_SHIFT } from '../constants';
import { fetchProfiles } from '../utils/api';
import { actAs, openApp } from '../utils/app';
import { readLayoutShift, resetLayoutShift, trackLayoutShift } from '../utils/layout-shift';
import {
  buildMatchmakingResponse,
  failMatchmaking,
  stubMatchmaking,
} from '../utils/matchmaking-stub';

const REQUESTER = 'Anna Kowalska';

test.describe('AI Matchmaker', () => {
  test.beforeEach(async ({ page }) => {
    await trackLayoutShift(page);
    await openApp(page);
    await actAs(page, REQUESTER);
  });

  test('runs a search and renders ranked matches with synergy and icebreakers', async ({
    page,
    request,
  }) => {
    const profiles = await fetchProfiles(request);
    const requester = profiles.find((p) => p.fullName === REQUESTER)!;
    const requests = await stubMatchmaking(page, profiles);

    await page.getByRole('button', { name: 'Fintech in London' }).click();

    await expect(page.getByText(/Top 3 for .Fintech in London./)).toBeVisible();
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ query: 'Fintech in London', currentUserId: requester.id });
    expect(requests[0].travelContext).toBeUndefined();

    await expect(page.getByText('Mutual synergy')).toHaveCount(MATCH_COUNT);
    await expect(page.getByText(/% Match$/)).toHaveCount(MATCH_COUNT);
    await expect(page.getByRole('button', { name: 'Copy Message' })).toHaveCount(MATCH_COUNT);
    await expect(page.getByRole('heading', { name: REQUESTER, level: 3 })).toHaveCount(0);
  });

  test('submits a typed query and shows a retryable error when matchmaking fails', async ({
    page,
    request,
  }) => {
    const profiles = await fetchProfiles(request);
    let failing = true;
    await stubMatchmaking(page, profiles, async (route, body) => {
      if (failing) return failMatchmaking(route);
      return route.fulfill({
        status: 200,
        headers: { 'access-control-allow-origin': '*' },
        contentType: 'application/json',
        body: JSON.stringify(buildMatchmakingResponse(profiles, body)),
      });
    });

    await page.getByRole('textbox', { name: 'What are you looking for?' }).fill('Series A advice');
    await page.getByRole('button', { name: 'Find matches' }).click();

    // Next.js also renders a route-announcer alert, so scope to ours.
    const alert = page.getByRole('alert').filter({ hasText: 'Matchmaking failed' });
    await expect(alert).toContainText('Matchmaking failed');
    await expect(alert).toContainText('AI matchmaking failed');

    failing = false;
    await alert.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByText('Mutual synergy')).toHaveCount(MATCH_COUNT);
  });

  test('Travel Mode restricts to the destination and proposes in-person meetups', async ({
    page,
    request,
  }) => {
    const profiles = await fetchProfiles(request);
    const requester = profiles.find((p) => p.fullName === REQUESTER)!;
    const destination = 'Berlin';
    const local = profiles.filter((p) => p.city === destination && p.id !== requester.id);
    expect(local.length).toBeGreaterThanOrEqual(MATCH_COUNT);
    const requests = await stubMatchmaking(page, profiles);

    const travel = page.getByRole('button', { name: 'Travel Mode' });
    const submit = page.getByRole('button', { name: 'Find matches' });
    await expect(travel).toHaveAttribute('aria-pressed', 'false');

    const submitBefore = (await submit.boundingBox())!;
    await resetLayoutShift(page);

    await travel.click();
    await expect(travel).toHaveAttribute('aria-pressed', 'true');
    // Travel mode needs a destination, so one is preselected; pick Berlin explicitly.
    await page.getByRole('button', { name: /^Destination:/ }).click();
    await page.getByRole('menuitemradio', { name: destination }).click();
    await expect(page.getByRole('button', { name: `Destination: ${destination}` })).toBeVisible();
    await expect(
      page.getByText(`Travel Mode: matching alumni living in ${destination}`),
    ).toBeVisible();

    await page.getByRole('textbox', { name: 'Travel dates (optional)' }).fill('Nov 14-18');

    // Layout stays put when the mode toggles: the primary action keeps its position.
    const submitAfter = (await page
      .getByRole('button', { name: 'Find local alumni' })
      .boundingBox())!;
    expect(submitAfter.y).toBe(submitBefore.y);
    expect(await readLayoutShift(page)).toBeLessThanOrEqual(MAX_LAYOUT_SHIFT);

    // An empty query is allowed in Travel Mode.
    await page.getByRole('button', { name: 'Find local alumni' }).click();
    await expect(page.getByText(`Top ${MATCH_COUNT} for`)).toContainText(
      `Meetups in ${destination}`,
    );

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      query: '',
      currentUserId: requester.id,
      targetCity: destination,
      travelContext: { city: destination, dates: 'Nov 14-18' },
    });

    // Every result lives in the destination and carries an in-person icebreaker.
    await expect(page.getByText(new RegExp(`Living in ${destination}`))).toHaveCount(MATCH_COUNT);
    await expect(
      page.getByText(
        new RegExp(
          `I'll be visiting ${destination} around Nov 14-18 and would love to grab a 20-min coffee`,
        ),
      ),
    ).toHaveCount(MATCH_COUNT);
    await expect(page.getByText(/face to face in Berlin/)).toHaveCount(MATCH_COUNT);
  });

  test('turning Travel Mode off returns to a normal, city-agnostic search', async ({
    page,
    request,
  }) => {
    const profiles = await fetchProfiles(request);
    const requests = await stubMatchmaking(page, profiles);
    const travel = page.getByRole('button', { name: 'Travel Mode' });

    await travel.click();
    await travel.click();
    await expect(travel).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('button', { name: 'Target city: Any' })).toBeVisible();

    await page.getByRole('textbox', { name: 'What are you looking for?' }).fill('B2B SaaS growth');
    await page.getByRole('button', { name: 'Find matches' }).click();
    await expect(page.getByText('Mutual synergy')).toHaveCount(MATCH_COUNT);
    expect(requests[0].travelContext).toBeUndefined();
    expect(requests[0].targetCity).toBeUndefined();
  });
});
