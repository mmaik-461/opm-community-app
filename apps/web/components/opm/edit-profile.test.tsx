import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { jsonError, stubApi } from '@/test/api-fake';
import { makeProfile } from '@/test/fixtures';
import { testAccessToken } from '@/test/next-auth';
import { renderWithProviders } from '@/test/render';
import { UserMenu } from './user-menu';
import { useUser } from './user-context';

const me = makeProfile({
  id: 'me',
  fullName: 'Me Myself',
  headline: 'CEO, PayLoop',
  bio: 'Payments founder.',
  city: 'Warsaw',
  industry: 'Fintech',
  skills: ['payments', 'fundraising'],
});

/** The account menu opens the dialog; the paragraph shows what the directory now holds. */
function Harness() {
  const { currentUser } = useUser();
  if (!currentUser) return null;
  return (
    <>
      <UserMenu />
      <p data-testid="live-bio">{currentUser.bio}</p>
    </>
  );
}

function setup(routes: Record<string, unknown> = {}) {
  const api = stubApi({ 'GET /profiles': [me], 'GET /intros': {}, ...routes });
  renderWithProviders(<Harness />, { currentUserId: 'me' });
  return api;
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /^Account menu/ }));
  await user.click(await screen.findByRole('menuitem', { name: 'Edit profile' }));
  return screen.findByRole('dialog', { name: 'Edit your profile' });
}

describe('Edit profile', () => {
  it('opens a dialog prefilled with the current profile', async () => {
    const user = userEvent.setup();
    setup();
    const dialog = await openDialog(user);

    expect(within(dialog).getByLabelText('Full name')).toHaveValue('Me Myself');
    expect(within(dialog).getByLabelText('Headline')).toHaveValue('CEO, PayLoop');
    expect(within(dialog).getByLabelText('Bio')).toHaveValue('Payments founder.');
    expect(within(dialog).getByLabelText('City')).toHaveValue('Warsaw');
    expect(within(dialog).getByLabelText('Industry')).toHaveValue('Fintech');
    expect(within(dialog).getByLabelText('Skills')).toHaveValue('payments, fundraising');
    expect(within(dialog).getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('saves the edits, closes, announces success and updates the profile everywhere', async () => {
    const user = userEvent.setup();
    const api = setup({
      'PATCH /profiles/me': ({ body }: { body: unknown }) => ({ ...me, ...(body as object) }),
    });
    const dialog = await openDialog(user);

    const bio = within(dialog).getByLabelText('Bio');
    await user.clear(bio);
    await user.type(bio, '  Now investing in climate.  ');
    const skills = within(dialog).getByLabelText('Skills');
    await user.clear(skills);
    await user.type(skills, 'climate, payments, Climate');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Profile saved')).toBeInTheDocument();
    expect(screen.getByTestId('live-bio')).toHaveTextContent('Now investing in climate.');

    const patch = api.calls.find((c) => c.method === 'PATCH');
    expect(patch?.path).toBe('/profiles/me');
    expect(patch?.headers.get('Authorization')).toBe(`Bearer ${testAccessToken('me')}`);
    expect(patch?.body).toEqual({
      fullName: 'Me Myself',
      headline: 'CEO, PayLoop',
      bio: 'Now investing in climate.',
      city: 'Warsaw',
      industry: 'Fintech',
      skills: ['climate', 'payments'],
    });
    expect(patch?.body).not.toHaveProperty('id');
  });

  it('shows a saving state and blocks closing while the request is in flight', async () => {
    const user = userEvent.setup();
    let release!: (r: Response) => void;
    const pending = new Promise<Response>((resolve) => (release = resolve));
    setup({ 'PATCH /profiles/me': () => pending });
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText('City'), ' Centrum');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await within(dialog).findByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    release(new Response(JSON.stringify({ ...me, city: 'Warsaw Centrum' }), { status: 200 }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps the dialog open with the server error and does not change the profile', async () => {
    const user = userEvent.setup();
    setup({ 'PATCH /profiles/me': () => jsonError(502, 'Embedding service failed') });
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText('City'), 'X');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Embedding service failed');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('live-bio')).toHaveTextContent('Payments founder.');
    expect(within(dialog).getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });

  it('blocks saving when a required field is blank', async () => {
    const user = userEvent.setup();
    setup();
    const dialog = await openDialog(user);
    await user.clear(within(dialog).getByLabelText('Headline'));
    expect(within(dialog).getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('discards an unsaved draft when reopened', async () => {
    const user = userEvent.setup();
    setup();
    let dialog = await openDialog(user);
    await user.type(within(dialog).getByLabelText('City'), ' draft');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    dialog = await openDialog(user);
    expect(within(dialog).getByLabelText('City')).toHaveValue('Warsaw');
  });
});
