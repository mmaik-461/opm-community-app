import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    /** Short-lived bearer token for `apps/api`; see `sessionCallback` in `lib/auth.ts`. */
    accessToken: string;
    user: { id: string; name?: string | null; email?: string | null };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub?: string;
  }
}
