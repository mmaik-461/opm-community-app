'use client';

import type { Profile } from '@opm/shared-types';
import { AppFrame } from './app-frame';
import { Header } from './header';
import { IntrosProvider } from './intros-context';
import { UserProvider } from './user-context';
import { VerificationsProvider } from './verifications-context';

/**
 * Persistent frame of the signed-in app. It lives in a layout, so the providers (and the header
 * badges they feed) survive navigation between sections; only the page content swaps.
 */
export function AppLayout({
  initialProfiles,
  children,
}: {
  initialProfiles?: Profile[] | null;
  children: React.ReactNode;
}) {
  return (
    <UserProvider initialProfiles={initialProfiles}>
      <IntrosProvider>
        <VerificationsProvider>
          <Header />
          <AppFrame>{children}</AppFrame>
        </VerificationsProvider>
      </IntrosProvider>
    </UserProvider>
  );
}
