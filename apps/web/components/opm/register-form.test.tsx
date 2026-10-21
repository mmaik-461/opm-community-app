import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { jsonError, stubApi } from '@/test/api-fake';
import { makeProfile } from '@/test/fixtures';
import { signIn } from '@/test/next-auth';
import { SignIn } from './sign-in';

const SIGN_IN_OK = { ok: true, error: undefined, status: 200, url: null };
const created = { accessToken: 'api-token', profile: makeProfile({ id: 'new' }) };

async function openSignUp(user: ReturnType<typeof userEvent.setup>) {
  render(<SignIn devLoginEnabled={false} />);
  await user.click(screen.getByRole('tab', { name: 'Sign up' }));
}

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Full name'), '  Nina Novak ');
  await user.type(screen.getByLabelText('Email'), 'nina@example.com');
  await user.type(screen.getByLabelText('Password'), 'a-long-password');
  await user.type(screen.getByLabelText('City'), 'Prague');
  await user.type(screen.getByLabelText('Industry'), 'Fintech');
  await user.type(screen.getByLabelText('Graduation year'), '2019');
}

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Create account' }));

describe('Sign up', () => {
  it('shows Sign in by default and switches to the registration form', async () => {
    const user = userEvent.setup();
    render(<SignIn devLoginEnabled={false} />);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Graduation year')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Sign up' }));
    expect(screen.getByLabelText('Graduation year')).toBeInTheDocument();
    expect(screen.getByLabelText(/Diploma ID/)).not.toBeRequired();
    expect(screen.getByLabelText('Graduation year')).toBeRequired();
  });

  it('registers with a trimmed payload, then signs in with the same credentials', async () => {
    const user = userEvent.setup();
    const api = stubApi({ 'POST /auth/register': created });
    signIn.mockResolvedValueOnce(SIGN_IN_OK);
    await openSignUp(user);
    await fillRequired(user);
    await user.type(screen.getByLabelText(/Diploma ID/), ' D-42 ');
    await submit(user);

    expect(await screen.findByRole('button', { name: 'Create account' })).toBeEnabled();
    expect(api.calls).toHaveLength(1);
    expect(api.calls[0]).toMatchObject({
      method: 'POST',
      path: '/auth/register',
      body: {
        fullName: 'Nina Novak',
        email: 'nina@example.com',
        password: 'a-long-password',
        city: 'Prague',
        industry: 'Fintech',
        graduationYear: 2019,
        diplomaNumber: 'D-42',
      },
    });
    expect(signIn).toHaveBeenCalledWith('credentials', {
      email: 'nina@example.com',
      password: 'a-long-password',
      redirect: false,
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('omits a blank diploma ID from the payload', async () => {
    const user = userEvent.setup();
    const api = stubApi({ 'POST /auth/register': created });
    signIn.mockResolvedValueOnce(SIGN_IN_OK);
    await openSignUp(user);
    await fillRequired(user);
    await submit(user);

    await screen.findByRole('button', { name: 'Create account' });
    expect(api.calls[0].body).not.toHaveProperty('diplomaNumber');
  });

  it('disables the button while the account is being created and signed in', async () => {
    const user = userEvent.setup();
    stubApi({ 'POST /auth/register': created });
    let finish: (value: typeof SIGN_IN_OK) => void = () => undefined;
    signIn.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    await openSignUp(user);
    await fillRequired(user);
    await submit(user);

    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
    finish(SIGN_IN_OK);
    expect(await screen.findByRole('button', { name: 'Create account' })).toBeEnabled();
  });

  it('shows the API error for a duplicate email and does not sign in', async () => {
    const user = userEvent.setup();
    stubApi({
      'POST /auth/register': () => jsonError(409, 'An account with this email already exists'),
    });
    await openSignUp(user);
    await fillRequired(user);
    await submit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account with this email already exists',
    );
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
  });

  it('points to the Sign in tab when the account exists but automatic sign-in fails', async () => {
    const user = userEvent.setup();
    stubApi({ 'POST /auth/register': created });
    await openSignUp(user); // the mock rejects credential sign-ins by default
    await fillRequired(user);
    await submit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Please use the Sign in tab/);
  });
});
