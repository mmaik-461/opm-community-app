import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonError, stubApi } from '@/test/api-fake';
import { emptyIntros, makeProfile } from '@/test/fixtures';
import { setMockSession, signIn, signOut, testAccessToken } from '@/test/next-auth';
import { AppShell } from './app-shell';

const alice = makeProfile({ id: 'alice', fullName: 'Alice Active', cohort: 'OPM 1' });
const bob = makeProfile({ id: 'bob', fullName: 'Bob Receiver', cohort: 'OPM 2' });

const signedInRoutes = { 'GET /profiles': [alice, bob], 'GET /intros': emptyIntros() };

afterEach(() => vi.unstubAllEnvs());

describe('AppShell authentication gate', () => {
  it('shows the sign-in form instead of the app, and calls no protected endpoint', async () => {
    const api = stubApi({ 'GET /auth/dev/profiles': [] });
    render(<AppShell />);

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryAllByRole('tab', { name: /alumni directory/i })).toHaveLength(0);
    expect(api.calls.map((c) => c.path)).not.toContain('/profiles');
    expect(api.calls.map((c) => c.path)).not.toContain('/intros');
  });

  it('loads the app with the bearer token once signed in', async () => {
    const api = stubApi(signedInRoutes);
    setMockSession('alice');
    render(<AppShell />);

    expect(
      (await screen.findAllByRole('tab', { name: /alumni directory/i }))[0],
    ).toBeInTheDocument();
    await waitFor(() => expect(api.calls.map((c) => c.path)).toContain('/intros'));
    for (const call of api.calls) {
      expect(call.headers.get('Authorization')).toBe(`Bearer ${testAccessToken('alice')}`);
    }
    // The acting user is never sent as a query parameter any more.
    expect(api.calls.every((c) => !c.path.includes('userId'))).toBe(true);
  });

  it('signs out back to the sign-in form', async () => {
    const user = userEvent.setup();
    stubApi({ ...signedInRoutes, 'GET /auth/dev/profiles': [] });
    setMockSession('alice');
    render(<AppShell />);

    await user.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });
});

describe('verification status', () => {
  const pending = makeProfile({
    id: 'pat',
    fullName: 'Pat Pending',
    status: 'PENDING_VERIFICATION',
  });

  it('tells a PENDING_VERIFICATION user their account is awaiting alumni verification', async () => {
    stubApi({ 'GET /profiles': [alice, pending], 'GET /intros': emptyIntros() });
    setMockSession('pat');
    render(<AppShell />);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your account is awaiting alumni verification',
    );
  });

  it('shows no banner to a verified user', async () => {
    stubApi({ 'GET /profiles': [alice, pending], 'GET /intros': emptyIntros() });
    setMockSession('alice');
    render(<AppShell />);

    await screen.findAllByRole('tab', { name: /alumni directory/i });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('development impersonation', () => {
  it('switches the acting user by signing in again as them, and sends their token afterwards', async () => {
    const user = userEvent.setup();
    const api = stubApi(signedInRoutes);
    setMockSession('alice');
    render(<AppShell />);

    await user.click(await screen.findByRole('button', { name: 'Switch current user' }));
    await user.click(await screen.findByRole('menuitem', { name: /Bob Receiver/ }));

    expect(signIn).toHaveBeenCalledWith('dev-impersonate', { profileId: 'bob', redirect: false });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Switch current user' })).toHaveTextContent(
        'Bob Receiver',
      ),
    );
    await waitFor(() =>
      expect(
        api.calls.some(
          (c) =>
            c.path === '/intros' &&
            c.headers.get('Authorization') === `Bearer ${testAccessToken('bob')}`,
        ),
      ).toBe(true),
    );
  });

  it('is hidden in production, where the header shows the signed-in user instead', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    stubApi({ ...signedInRoutes, 'GET /auth/dev/profiles': jsonError(404, 'Not Found') });
    setMockSession('alice');
    render(<AppShell />);

    expect(await screen.findByText('Alice Active')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Switch current user' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });
});
