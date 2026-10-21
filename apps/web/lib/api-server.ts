import type { Profile } from '@opm/shared-types';
import { apiUrl } from '@/lib/auth';
import { bearerHeader } from '@/utils/auth';

/**
 * Server-side directory read used to render the app shell with data. Any failure resolves to null so
 * the page still renders and the browser loads the directory itself (with its own error handling).
 */
export async function fetchProfilesServer(accessToken: string): Promise<Profile[] | null> {
  try {
    const res = await fetch(`${apiUrl()}/profiles`, {
      headers: { Authorization: bearerHeader(accessToken) },
      cache: 'no-store',
    });
    return res.ok ? ((await res.json()) as Profile[]) : null;
  } catch {
    return null;
  }
}
