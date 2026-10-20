import type { LoginResponse } from '@opm/shared-types';
import { SignJWT } from 'jose';
import type { NextAuthOptions, Session, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  AUTH_SECRET_MISSING_MESSAGE,
  CREDENTIALS_PROVIDER_ID,
  DEV_PROVIDER_ID,
  JWT_ALGORITHM,
  MIN_AUTH_SECRET_LENGTH,
  SESSION_MAX_AGE_SECONDS,
} from '@/constants/auth';
import { DEFAULT_API_URL } from '@/constants/api';
import { isDevLoginEnabled } from '@/utils/auth';

type Credentials = Record<string, string> | undefined;

/** Server-side base URL; the browser-facing `NEXT_PUBLIC_API_URL` is the fallback. */
function apiUrl(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;
}

export function authSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < MIN_AUTH_SECRET_LENGTH)
    throw new Error(AUTH_SECRET_MISSING_MESSAGE);
  return secret;
}

async function postToApi(path: string, body: unknown): Promise<User | null> {
  let res: Response;
  try {
    res = await fetch(`${apiUrl()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const { profile } = (await res.json()) as LoginResponse;
  return { id: profile.id, name: profile.fullName, email: profile.email };
}

/** The API owns the credential check; returning null makes NextAuth reject the sign-in. */
export function authorizeCredentials(credentials: Credentials): Promise<User | null> {
  const { email, password } = credentials ?? {};
  if (!email || !password) return Promise.resolve(null);
  return postToApi('/auth/login', { email, password });
}

export function authorizeDevLogin(credentials: Credentials): Promise<User | null> {
  const profileId = credentials?.profileId;
  if (!isDevLoginEnabled() || !profileId) return Promise.resolve(null);
  return postToApi('/auth/dev/login', { profileId });
}

export function jwtCallback({ token, user }: { token: JWT; user?: User | null }): JWT {
  if (user) token.sub = user.id;
  return token;
}

/** Signs the bearer token `apps/api` verifies; it carries only the profile id. */
export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(new TextEncoder().encode(authSecret()));
}

export async function sessionCallback({
  session,
  token,
}: {
  session: Session;
  token: JWT;
}): Promise<Session> {
  const id = token.sub ?? '';
  return { ...session, user: { ...session.user, id }, accessToken: await signAccessToken(id) };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE_SECONDS },
  providers: [
    CredentialsProvider({
      id: CREDENTIALS_PROVIDER_ID,
      name: 'Email and password',
      credentials: { email: {}, password: {} },
      authorize: authorizeCredentials,
    }),
    CredentialsProvider({
      id: DEV_PROVIDER_ID,
      name: 'Development quick login',
      credentials: { profileId: {} },
      authorize: authorizeDevLogin,
    }),
  ],
  callbacks: { jwt: jwtCallback, session: sessionCallback },
};
