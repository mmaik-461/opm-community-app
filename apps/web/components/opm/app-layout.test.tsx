import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonError, stubApi } from '@/test/api-fake';
import { emptyIntros, makeProfile, makeVerification } from '@/test/fixtures';
import { setMockSession, signIn, signOut, testAccessToken } from '@/test/next-auth';
import { router, setMockLocation } from '@/test/next-navigation';
import { AppLayout } from './app-layout';
import { Verifications } from './verifications';

const alice = makeProfile({ id: 'alice', fullName: 'Alice Active', cohort: 'OPM 1' });
const bob = makeProfile({ id: 'bob', fullName: 'Bob Receiver', cohort: 'OPM 2' });

const signedInRoutes = { 'GET /profiles': [alice, bob], 'GET /intros': emptyIntros() };

const renderLayout = (
  props: Partial<Parameters<typeof AppLayout>[0]> = {},
  page: React.ReactNode = <p>page content</p>,
) => render(<AppLayout {...props}>{page}</AppLayout>);

const link = (name: RegExp) => screen.findAllByRole('link', { name });

afterEach(() => vi.unstubAllEnvs());

describe('AppLayout', () => {
  it('loads the app with the bearer token and renders the page inside the frame', async () => {
    const api = stubApi(signedInRoutes);
    setMockSession('alice');
    renderLayout();

    expect((await link(/alumni directory/i))[0]).toBeInTheDocument();
    expect(screen.getByText('page content')).toBeInTheDocument();
    await waitFor(() => expect(api.calls.map((c) => c.path)).toContain('/intros'));
    for (const call of api.calls) {
      expect(call.headers.get('Authorization')).toBe(`Bearer ${testAccessToken('alice')}`);
    }
    // The acting user is never sent as a query parameter.
    expect(api.calls.every((c) => !c.path.includes('userId'))).toBe(true);
  });

  it('uses the directory the server already loaded instead of fetching it again', async () => {
    const api = stubApi({ 'GET /intros': emptyIntros() });
    setMockSession('alice');
    renderLayout({ initialProfiles: [alice, bob] });

    // Rendered immediately, with no loading state and no /profiles request.
    expect(screen.getByRole('button', { name: 'Switch current user' })).toHaveTextContent(
      'Alice Active',
    );
    await waitFor(() => expect(api.calls.map((c) => c.path)).toContain('/intros'));
    expect(api.calls.map((c) => c.path)).not.toContain('/profiles');
  });

  it('falls back to loading the directory in the browser when the server could not', async () => {
    const api = stubApi(signedInRoutes);
    setMockSession('alice');
    renderLayout({ initialProfiles: null });

    await waitFor(() => expect(api.calls.map((c) => c.path)).toContain('/profiles'));
    expect(await screen.findByRole('button', { name: 'Switch current user' })).toHaveTextContent(
      'Alice Active',
    );
  });

  it('shows a retryable error when the directory cannot be loaded', async () => {
    const user = userEvent.setup();
    let fail = true;
    stubApi({
      'GET /profiles': () => (fail ? jsonError(500, 'Directory down') : [alice]),
      'GET /intros': emptyIntros(),
    });
    setMockSession('alice');
    renderLayout();

    expect(await screen.findByRole('alert')).toHaveTextContent('Directory down');
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('signs out and sends the user to the login page', async () => {
    const user = userEvent.setup();
    stubApi(signedInRoutes);
    setMockSession('alice');
    renderLayout();

    await user.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    expect(router.refresh).toHaveBeenCalled();
  });
});

describe('primary navigation', () => {
  it('links every section with its own URL', async () => {
    stubApi(signedInRoutes);
    setMockSession('alice');
    renderLayout();

    for (const [name, href] of [
      [/ai matchmaker/i, '/'],
      [/alumni directory/i, '/directory'],
      [/my intros/i, '/intros'],
    ] as const) {
      for (const el of await link(name)) expect(el).toHaveAttribute('href', href);
    }
  });

  it('marks the section matching the current URL', async () => {
    stubApi(signedInRoutes);
    setMockSession('alice');
    setMockLocation('/directory');
    renderLayout();

    for (const el of await link(/alumni directory/i)) {
      expect(el).toHaveAttribute('aria-current', 'page');
    }
    for (const el of await link(/ai matchmaker/i)) expect(el).not.toHaveAttribute('aria-current');
  });

  it('badges My Intros with the pending incoming count', async () => {
    stubApi({
      ...signedInRoutes,
      'GET /intros': { ...emptyIntros(), pendingIncoming: 3, received: emptyIntros().received },
    });
    setMockSession('alice');
    renderLayout();

    const [intros] = await link(/my intros/i);
    expect(await within(intros).findByLabelText('3 pending')).toBeInTheDocument();
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
    renderLayout();

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your account is awaiting alumni verification',
    );
  });

  it('shows no banner to a verified user', async () => {
    stubApi({ 'GET /profiles': [alice, pending], 'GET /intros': emptyIntros() });
    setMockSession('alice');
    renderLayout();

    await link(/alumni directory/i);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows a rejected user the rejection banner', async () => {
    const rejected = makeProfile({ id: 'rex', fullName: 'Rex Rejected', status: 'REJECTED' });
    stubApi({ 'GET /profiles': [alice, rejected], 'GET /intros': emptyIntros() });
    setMockSession('rex');
    renderLayout();

    expect(await screen.findByRole('status')).toHaveTextContent('not approved');
  });
});

describe('development impersonation', () => {
  it('switches the acting user by signing in again as them, and sends their token afterwards', async () => {
    const user = userEvent.setup();
    const api = stubApi(signedInRoutes);
    setMockSession('alice');
    renderLayout();

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
    renderLayout();

    expect(await screen.findByText('Alice Active')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Switch current user' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });
});

describe('admin verification section', () => {
  const admin = makeProfile({ id: 'admin', fullName: 'Ada Admin', role: 'ADMIN' });
  const applicants = [
    makeVerification({ id: 'v1' }),
    makeVerification({ id: 'v2', fullName: 'Oscar Older', email: 'oscar@example.com' }),
  ];
  const adminRoutes = {
    'GET /profiles': [alice, admin],
    'GET /intros': emptyIntros(),
    'GET /admin/verifications': { data: applicants },
  };

  it('shows admins a Verifications link to /admin with the pending count', async () => {
    stubApi(adminRoutes);
    setMockSession('admin');
    renderLayout();

    const links = await link(/verifications/i);
    expect(links[0]).toHaveAttribute('href', '/admin');
    expect(await within(links[0]).findByLabelText('2 pending')).toBeInTheDocument();
  });

  it('hides the link from members and never calls the admin API', async () => {
    const api = stubApi(adminRoutes);
    setMockSession('alice');
    renderLayout();

    await link(/alumni directory/i);
    expect(screen.queryByRole('link', { name: /verifications/i })).not.toBeInTheDocument();
    expect(api.calls.map((c) => c.path)).not.toContain('/admin/verifications');
  });

  it('shows members who open /admin an access-denied page', async () => {
    stubApi({ 'GET /profiles': [alice, admin], 'GET /intros': emptyIntros() });
    setMockSession('alice');
    setMockLocation('/admin');
    renderLayout({}, <Verifications />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied');
  });

  it('shows admins the verification panel at /admin', async () => {
    stubApi(adminRoutes);
    setMockSession('admin');
    setMockLocation('/admin');
    renderLayout({}, <Verifications />);

    expect(
      await screen.findByRole('heading', { name: 'Pending verifications' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Oscar Older')).toBeInTheDocument();
  });
});
