// @vitest-environment node
// jose needs Node's own Uint8Array, as in the real route handler (jsdom swaps the realm).
import { jwtVerify } from 'jose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEV_PROVIDER_ID } from '@/constants/auth';
import {
  authOptions,
  authorizeCredentials,
  authorizeDevLogin,
  jwtCallback,
  sessionCallback,
} from './auth';
import { makeProfile } from '@/test/fixtures';

const SECRET = 'web-test-secret-0123456789-abcdefghijklmnopqr';
const anna = makeProfile({ id: 'anna', fullName: 'Anna K', email: 'anna@example.com' });

function stubApiFetch(respond: (url: string, body: unknown) => Response) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    respond(String(input), JSON.parse(String(init?.body))),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const ok = (profile = anna) => new Response(JSON.stringify({ profile }), { status: 200 });
const denied = () => new Response(JSON.stringify({ message: 'nope' }), { status: 401 });

beforeEach(() => {
  vi.stubEnv('AUTH_SECRET', SECRET);
  vi.stubEnv('API_URL', 'http://api.test');
});
afterEach(() => vi.unstubAllEnvs());

describe('authorizeCredentials', () => {
  it('posts the credentials to the API and maps the profile to a NextAuth user', async () => {
    const fetchMock = stubApiFetch(() => ok());
    const user = await authorizeCredentials({ email: 'anna@example.com', password: 'pw' });
    expect(user).toEqual({ id: 'anna', name: 'Anna K', email: 'anna@example.com' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/auth/login');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      email: 'anna@example.com',
      password: 'pw',
    });
  });

  it('rejects when the API denies the credentials, is unreachable, or fields are missing', async () => {
    stubApiFetch(denied);
    expect(await authorizeCredentials({ email: 'a@b.co', password: 'bad' })).toBeNull();

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')));
    expect(await authorizeCredentials({ email: 'a@b.co', password: 'pw' })).toBeNull();

    const fetchMock = stubApiFetch(() => ok());
    expect(await authorizeCredentials({ email: 'a@b.co' })).toBeNull();
    expect(await authorizeCredentials(undefined)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('authorizeDevLogin', () => {
  it('signs in as the requested profile outside production', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const fetchMock = stubApiFetch(() => ok());
    expect(await authorizeDevLogin({ profileId: 'anna' })).toMatchObject({ id: 'anna' });
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/auth/dev/login');
  });

  it('is refused in production unless NEXT_PUBLIC_AUTH_DEV_LOGIN=true, without calling the API', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const fetchMock = stubApiFetch(() => ok());
    expect(await authorizeDevLogin({ profileId: 'anna' })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();

    vi.stubEnv('NEXT_PUBLIC_AUTH_DEV_LOGIN', 'true');
    expect(await authorizeDevLogin({ profileId: 'anna' })).toMatchObject({ id: 'anna' });
  });

  it('needs a profile id', async () => {
    expect(await authorizeDevLogin({})).toBeNull();
  });
});

describe('session callbacks', () => {
  it('keeps the profile id on the token at sign-in and leaves later refreshes untouched', () => {
    const signedIn = jwtCallback({ token: {}, user: { id: 'anna' } });
    expect(signedIn.sub).toBe('anna');
    expect(jwtCallback({ token: signedIn }).sub).toBe('anna');
  });

  it('issues a short-lived HS256 access token for the API, bound to the session user', async () => {
    const session = await sessionCallback({
      session: { user: { name: 'Anna K' }, expires: '2099-01-01' } as never,
      token: { sub: 'anna' },
    });
    expect(session.user.id).toBe('anna');

    const { payload, protectedHeader } = await jwtVerify(
      session.accessToken,
      new TextEncoder().encode(SECRET),
    );
    expect(protectedHeader.alg).toBe('HS256');
    expect(payload.sub).toBe('anna');
    expect(payload.exp! - payload.iat!).toBe(300);
  });

  it('refuses to mint tokens without a strong shared secret', async () => {
    vi.stubEnv('AUTH_SECRET', 'short');
    await expect(
      sessionCallback({ session: { user: {} } as never, token: { sub: 'anna' } }),
    ).rejects.toThrow(/AUTH_SECRET/);
  });
});

describe('authOptions', () => {
  it('uses stateless JWT sessions and registers both providers', () => {
    expect(authOptions.session?.strategy).toBe('jwt');
    // NextAuth merges `options.id` over the provider's default id when it initialises.
    const ids = authOptions.providers.map(
      (p) => (p as unknown as { options: { id: string } }).options.id,
    );
    expect(ids).toEqual(['credentials', DEV_PROVIDER_ID]);
  });
});
