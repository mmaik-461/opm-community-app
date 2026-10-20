import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { IntrosProvider } from '@/components/opm/intros-context';
import { UserProvider } from '@/components/opm/user-context';
import { setMockSession } from './next-auth';

/** Signed-in identity when a test does not care who is acting. */
const SIGNED_IN_USER_ID = 'test-user';

/**
 * Renders with the real user + intros providers, signed in as `currentUserId` (or a default user)
 * through the mocked NextAuth client; pair with `stubApi` for the network edge.
 */
export function renderWithProviders(ui: ReactElement, opts: { currentUserId?: string } = {}) {
  setMockSession(opts.currentUserId ?? SIGNED_IN_USER_ID);
  return render(
    <UserProvider>
      <IntrosProvider>{ui}</IntrosProvider>
    </UserProvider>,
  );
}
