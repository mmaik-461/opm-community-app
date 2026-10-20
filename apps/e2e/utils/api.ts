import type { APIRequestContext } from '@playwright/test';
import type { Profile } from '@opm/shared-types';
import { API_URL } from '../constants';

/** The real seeded directory, read through the real API; tests derive expectations from it. */
export async function fetchProfiles(request: APIRequestContext): Promise<Profile[]> {
  const res = await request.get(`${API_URL}/profiles`);
  if (!res.ok()) throw new Error(`GET /profiles failed with ${res.status()}`);
  return (await res.json()) as Profile[];
}
