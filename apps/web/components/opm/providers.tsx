'use client';

import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';

/** `session` is read on the server, so the first client render already knows who is signed in. */
export function Providers({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
