import { SignJWT } from 'jose';
import { JWT_ALGORITHM } from '../common/constants/auth';

interface TokenOptions {
  secret?: string;
  expiresIn?: string;
}

/** Mints an access token exactly like the web app does. */
export async function signTestToken(userId: string, opts: TokenOptions = {}): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(opts.expiresIn ?? '1h')
    .sign(new TextEncoder().encode(opts.secret ?? process.env.AUTH_SECRET));
}

export async function bearer(userId: string, opts?: TokenOptions): Promise<[string, string]> {
  return ['Authorization', `Bearer ${await signTestToken(userId, opts)}`];
}
