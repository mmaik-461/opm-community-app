import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { jsonError, stubApi } from '@/test/api-fake';
import { makeProfile } from '@/test/fixtures';
import { signIn } from '@/test/next-auth';
import { router, setMockLocation } from '@/test/next-navigation';
import { CredentialsForm, DevQuickLogin } from './login-form';

const anna = makeProfile({ id: 'anna', fullName: 'Anna K', cohort: 'OPM 48' });
const SIGNED_IN = { ok: true, error: undefined, status: 200, url: null };

async function submitCredentials(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'anna@example.com');
  await user.type(screen.getByLabelText('Password'), 's3cret');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('CredentialsForm', () => {
  it('submits to the credentials provider without redirecting, then goes home', async () => {
    const user = userEvent.setup();
    render(<CredentialsForm />);
    signIn.mockResolvedValueOnce(SIGNED_IN);

    await submitCredentials(user);
    expect(signIn).toHaveBeenCalledWith('credentials', {
      email: 'anna@example.com',
      password: 's3cret',
      redirect: false,
    });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/matchmaker'));
    expect(router.refresh).toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('returns to the page the visitor originally asked for', async () => {
    const user = userEvent.setup();
    setMockLocation('/login?callbackUrl=%2Fintros');
    render(<CredentialsForm />);
    signIn.mockResolvedValueOnce(SIGNED_IN);

    await submitCredentials(user);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/intros'));
  });

  it('ignores a callback that leaves the site', async () => {
    const user = userEvent.setup();
    setMockLocation('/login?callbackUrl=https%3A%2F%2Fevil.example');
    render(<CredentialsForm />);
    signIn.mockResolvedValueOnce(SIGNED_IN);

    await submitCredentials(user);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/matchmaker'));
  });

  it('shows a generic error and stays on the page when the credentials are rejected', async () => {
    const user = userEvent.setup();
    render(<CredentialsForm />);

    await submitCredentials(user); // the mock rejects credential sign-ins by default
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('DevQuickLogin', () => {
  it('lists quick-login profiles, signs in as the chosen one and goes home', async () => {
    const user = userEvent.setup();
    stubApi({ 'GET /auth/dev/profiles': [anna] });
    render(<DevQuickLogin />);

    await user.click(await screen.findByRole('button', { name: /Continue as Anna K/ }));
    expect(signIn).toHaveBeenCalledWith('dev-impersonate', { profileId: 'anna', redirect: false });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/matchmaker'));
  });

  it('explains when quick login is unavailable on the API', async () => {
    stubApi({ 'GET /auth/dev/profiles': () => jsonError(404, 'Not Found') });
    render(<DevQuickLogin />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/dev login enabled/i);
  });
});
