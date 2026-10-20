import type { Page, Route } from '@playwright/test';
import type { MatchmakingRequest, MatchmakingResponse, Profile } from '@opm/shared-types';
import { MATCH_COUNT } from '../constants';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

/**
 * Builds the response the real service would return for the same request, honouring its
 * documented contract: requester excluded, travel mode restricted to the destination city,
 * and an in-person icebreaker when a travel context is present. The LLM itself is not called
 * (paid, non-deterministic); the service's own behaviour is covered by the API unit tests.
 */
export function buildMatchmakingResponse(
  profiles: Profile[],
  req: MatchmakingRequest,
): MatchmakingResponse {
  const city = req.travelContext?.city.toLowerCase();
  const candidates = profiles
    .filter((p) => p.id !== req.currentUserId)
    .filter((p) => !city || p.city.toLowerCase() === city)
    .slice(0, MATCH_COUNT);

  return {
    matches: candidates.map((profile, i) => ({
      profile,
      similarityScore: 0.9 - i * 0.05,
      matchReason: `${profile.fullName} has hands-on experience relevant to "${req.query || 'your goals'}".`,
      mutualSynergy: req.travelContext
        ? `Meeting face to face in ${req.travelContext.city} turns a shared background into a local connection.`
        : `You and ${profile.fullName} can trade perspectives across ${profile.industry}.`,
      suggestedIcebreaker: req.travelContext
        ? `Hi ${profile.fullName.split(' ')[0]}, I'll be visiting ${req.travelContext.city}${
            req.travelContext.dates ? ` around ${req.travelContext.dates}` : ' soon'
          } and would love to grab a 20-min coffee in person.`
        : `Hi ${profile.fullName.split(' ')[0]}, I would love to hear how you approached ${req.query}.`,
    })),
  };
}

/**
 * Intercepts POST /matchmaking. Returns the captured request bodies so tests can assert the
 * frontend sends the right contract.
 */
export async function stubMatchmaking(
  page: Page,
  profiles: Profile[],
  respond: (route: Route, body: MatchmakingRequest) => Promise<void> = async (route, body) => {
    await route.fulfill({
      status: 200,
      headers: CORS,
      contentType: 'application/json',
      body: JSON.stringify(buildMatchmakingResponse(profiles, body)),
    });
  },
) {
  const requests: MatchmakingRequest[] = [];
  await page.route('**/matchmaking', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    const body = request.postDataJSON() as MatchmakingRequest;
    requests.push(body);
    await respond(route, body);
  });
  return requests;
}

export function failMatchmaking(route: Route) {
  return route.fulfill({
    status: 502,
    headers: CORS,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'AI matchmaking failed' }),
  });
}
