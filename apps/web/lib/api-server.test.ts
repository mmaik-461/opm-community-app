// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeProfile } from '@/test/fixtures';
import { fetchProfilesServer } from './api-server';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('fetchProfilesServer', () => {
  it('reads the directory from the API with the bearer token and no caching', async () => {
    vi.stubEnv('API_URL', 'http://api.internal:4000');
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify([makeProfile()]), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchProfilesServer('tok')).toEqual([makeProfile()]);
    expect(fetchMock).toHaveBeenCalledWith('http://api.internal:4000/profiles', {
      headers: { Authorization: 'Bearer tok' },
      cache: 'no-store',
    });
  });

  it('resolves to null on an API error so the browser can load (and report) it instead', async () => {
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 401 }));
    expect(await fetchProfilesServer('tok')).toBeNull();
  });

  it('resolves to null when the API cannot be reached', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('fetch failed');
    });
    expect(await fetchProfilesServer('tok')).toBeNull();
  });
});
