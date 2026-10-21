import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { jsonError, stubApi } from '@/test/api-fake';
import { makeProfile } from '@/test/fixtures';
import { signIn } from '@/test/next-auth';
import { router } from '@/test/next-navigation';
import { RegisterForm } from './register-form';

const SIGN_IN_OK = { ok: true, error: undefined, status: 200, url: null };
const STRONG = 'Str0ng!Passw0rd';
const created = { accessToken: 'api-token', profile: makeProfile({ id: 'new' }) };

function openSignUp() {
  render(<RegisterForm />);
}

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Full name'), '  Nina Novak ');
  await user.type(screen.getByLabelText('Email'), 'nina@example.com');
  await user.type(screen.getByLabelText('Password'), STRONG);
  await user.type(screen.getByLabelText('Confirm password'), STRONG);
  await user.type(screen.getByLabelText('City'), 'Prague');
  await user.type(screen.getByLabelText('Industry'), 'Fintech');
  await user.type(screen.getByLabelText('Graduation year'), '2019');
}

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Create account' }));

describe('Sign up password', () => {
  it('ticks each requirement as the typed password satisfies it', async () => {
    const user = userEvent.setup();
    openSignUp();
    const password = screen.getByLabelText('Password');
    const met = () =>
      screen
        .getAllByRole('listitem')
        .filter((li) => li.textContent?.endsWith('(met)'))
        .map((li) => li.textContent);

    expect(met()).toEqual([]);
    await user.type(password, 'abcdefgh');
    expect(met()).toEqual(['At least 8 characters(met)', 'One lowercase letter (a-z)(met)']);
    await user.type(password, 'A');
    expect(met()).toContain('One uppercase letter (A-Z)(met)');
    await user.type(password, '1');
    expect(met()).toContain('One number (0-9)(met)');
    await user.type(password, '!');
    expect(met()).toHaveLength(5);
    await user.clear(password);
    expect(met()).toEqual([]);
  });

  it('blocks submission and flags a mismatching confirmation', async () => {
    const user = userEvent.setup();
    const api = stubApi({ 'POST /auth/register': created });
    openSignUp();
    await fillRequired(user);
    await user.clear(screen.getByLabelText('Confirm password'));
    await user.type(screen.getByLabelText('Confirm password'), 'Different1!');

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toBeInvalid();
    await submit(user);
    expect(api.calls).toHaveLength(0);
    expect(signIn).not.toHaveBeenCalled();
  });

  it('blocks submission of a password that misses a requirement', async () => {
    const user = userEvent.setup();
    const api = stubApi({ 'POST /auth/register': created });
    openSignUp();
    await fillRequired(user);
    for (const label of ['Password', 'Confirm password']) {
      await user.clear(screen.getByLabelText(label));
      await user.type(screen.getByLabelText(label), 'weakpassword');
    }
    await submit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(/meets every requirement/);
    expect(api.calls).toHaveLength(0);
  });

  it.each([
    ['Password', 'password'],
    ['Confirm password', 'confirm password'],
  ])('toggles the %s field between hidden and visible', async (label, subject) => {
    const user = userEvent.setup();
    openSignUp();
    const input = screen.getByLabelText(label);
    expect(input).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: `Show ${subject}` }));
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: `Hide ${subject}` })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: `Hide ${subject}` }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('toggles each field independently', async () => {
    const user = userEvent.setup();
    openSignUp();
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('type', 'password');
  });
});

describe('Sign up', () => {
  it('marks the graduation year required and the diploma ID optional', () => {
    openSignUp();
    expect(screen.getByLabelText('Graduation year')).toBeRequired();
    expect(screen.getByLabelText(/Diploma ID/)).not.toBeRequired();
  });

  it('registers with a trimmed payload, then signs in with the same credentials', async () => {
    const user = userEvent.setup();
    const api = stubApi({ 'POST /auth/register': created });
    signIn.mockResolvedValueOnce(SIGN_IN_OK);
    openSignUp();
    await fillRequired(user);
    await user.type(screen.getByLabelText(/Diploma ID/), ' D-42 ');
    await submit(user);

    expect(await screen.findByRole('button', { name: 'Create account' })).toBeEnabled();
    expect(router.replace).toHaveBeenCalledWith('/matchmaker');
    expect(api.calls).toHaveLength(1);
    expect(api.calls[0]).toMatchObject({
      method: 'POST',
      path: '/auth/register',
      body: {
        fullName: 'Nina Novak',
        email: 'nina@example.com',
        password: 'Str0ng!Passw0rd',
        city: 'Prague',
        industry: 'Fintech',
        graduationYear: 2019,
        diplomaNumber: 'D-42',
      },
    });
    expect(signIn).toHaveBeenCalledWith('credentials', {
      email: 'nina@example.com',
      password: 'Str0ng!Passw0rd',
      redirect: false,
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('omits a blank diploma ID from the payload', async () => {
    const user = userEvent.setup();
    const api = stubApi({ 'POST /auth/register': created });
    signIn.mockResolvedValueOnce(SIGN_IN_OK);
    openSignUp();
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
    openSignUp();
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
    openSignUp();
    await fillRequired(user);
    await submit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account with this email already exists',
    );
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
  });

  it('points to the Sign in page when the account exists but automatic sign-in fails', async () => {
    const user = userEvent.setup();
    stubApi({ 'POST /auth/register': created });
    openSignUp(); // the mock rejects credential sign-ins by default
    await fillRequired(user);
    await submit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Please use the Sign in page/);
  });
});
