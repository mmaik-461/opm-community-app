import type { APIRequestContext } from '@playwright/test';
import type { Profile } from '@opm/shared-types';
import { API_URL } from '../constants';

/** The real seeded directory, read through the real API (the public dev quick-login listing, so no
 * token is needed); tests derive expectations from it. */
export async function fetchProfiles(request: APIRequestContext): Promise<Profile[]> {
  const res = await request.get(`${API_URL}/auth/dev/profiles`);
  if (!res.ok()) throw new Error(`GET /auth/dev/profiles failed with ${res.status()}`);
  return (await res.json()) as Profile[];
}
