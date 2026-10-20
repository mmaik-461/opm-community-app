import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { IntrosProvider } from '@/components/opm/intros-context';
import { UserProvider } from '@/components/opm/user-context';
import { CURRENT_USER_STORAGE_KEY } from '@/constants/storage';

/** Renders with the real user + intros providers; pair with `stubApi` for the network edge. */
export function renderWithProviders(ui: ReactElement, opts: { currentUserId?: string } = {}) {
  if (opts.currentUserId) localStorage.setItem(CURRENT_USER_STORAGE_KEY, opts.currentUserId);
  return render(
    <UserProvider>
      <IntrosProvider>{ui}</IntrosProvider>
    </UserProvider>,
  );
}
