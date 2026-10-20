import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { jsonError, stubApi } from '@/test/api-fake';
import { makeProfile } from '@/test/fixtures';
import { signIn } from '@/test/next-auth';
import { SignIn } from './sign-in';

const anna = makeProfile({ id: 'anna', fullName: 'Anna K', cohort: 'OPM 48' });

async function submitCredentials(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'anna@example.com');
  await user.type(screen.getByLabelText('Password'), 's3cret');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('SignIn', () => {
  it('submits email and password to the credentials provider without redirecting', async () => {
    const user = userEvent.setup();
    render(<SignIn devLoginEnabled={false} />);
    signIn.mockResolvedValueOnce({ ok: true, error: undefined, status: 200, url: null });

    await submitCredentials(user);
    expect(signIn).toHaveBeenCalledWith('credentials', {
      email: 'anna@example.com',
      password: 's3cret',
      redirect: false,
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a generic error when the credentials are rejected', async () => {
    const user = userEvent.setup();
    render(<SignIn devLoginEnabled={false} />);

    await submitCredentials(user); // the mock rejects credential sign-ins by default
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('does not offer quick login, nor fetch its profiles, when dev login is off', () => {
    const api = stubApi({});
    render(<SignIn devLoginEnabled={false} />);
    expect(screen.queryByText(/quick login/i)).not.toBeInTheDocument();
    expect(api.calls).toHaveLength(0);
  });

  it('lists quick-login profiles and signs in as the chosen one', async () => {
    const user = userEvent.setup();
    stubApi({ 'GET /auth/dev/profiles': [anna] });
    render(<SignIn devLoginEnabled />);

    await user.click(await screen.findByRole('button', { name: /Continue as Anna K/ }));
    expect(signIn).toHaveBeenCalledWith('dev-impersonate', { profileId: 'anna', redirect: false });
  });

  it('explains when quick login is unavailable on the API', async () => {
    stubApi({ 'GET /auth/dev/profiles': () => jsonError(404, 'Not Found') });
    render(<SignIn devLoginEnabled />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/dev login enabled/i);
  });
});
