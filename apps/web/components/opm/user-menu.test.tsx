import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubApi } from '@/test/api-fake';
import { makeProfile } from '@/test/fixtures';
import { signIn, signOut } from '@/test/next-auth';
import { renderWithProviders } from '@/test/render';
import { UserMenu } from './user-menu';

const alice = makeProfile({
  id: 'alice',
  fullName: 'Alice Active',
  email: 'alice@example.com',
  cohort: 'OPM 1',
});
const bob = makeProfile({ id: 'bob', fullName: 'Bob Receiver', cohort: 'OPM 2' });

afterEach(() => vi.unstubAllEnvs());

/** Every actionable entry, items and radio items alike, in DOM order. */
const entries = (menu: HTMLElement) =>
  Array.from(menu.querySelectorAll('[role^="menuitem"]')).map((el) => el.textContent?.trim());

async function openMenu(
  user: ReturnType<typeof userEvent.setup>,
  { as = 'alice', profiles = [alice, bob] } = {},
) {
  stubApi({ 'GET /profiles': profiles, 'GET /intros': {} });
  renderWithProviders(<UserMenu />, { currentUserId: as });
  await user.click(await screen.findByRole('button', { name: /^Account menu/ }));
  return screen.findByRole('menu');
}

describe('UserMenu', () => {
  it('is one circular avatar button showing initials, named after the signed-in user', async () => {
    stubApi({ 'GET /profiles': [alice], 'GET /intros': {} });
    renderWithProviders(<UserMenu />, { currentUserId: 'alice' });

    const trigger = await screen.findByRole('button', { name: 'Account menu, Alice Active' });
    expect(trigger).toHaveTextContent('AA');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows who is signed in with their role, and no status badge when verified', async () => {
    const menu = await openMenu(userEvent.setup());
    expect(within(menu).getByText('Alice Active', { selector: 'p' })).toBeInTheDocument();
    expect(within(menu).getByText('alice@example.com')).toBeInTheDocument();
    expect(within(menu).getByText('Member')).toBeInTheDocument();
    expect(within(menu).queryByText(/pending|rejected/i)).not.toBeInTheDocument();
    // The identity block is a label, not an action.
    expect(within(menu).queryByRole('menuitem', { name: /alice@example.com/ })).toBeNull();
  });

  it('shows the admin role', async () => {
    const admin = makeProfile({ id: 'ada', fullName: 'Ada Admin', role: 'ADMIN' });
    const menu = await openMenu(userEvent.setup(), { as: 'ada', profiles: [admin] });
    expect(within(menu).getByText('Admin')).toBeInTheDocument();
  });

  it('badges a pending applicant as awaiting verification', async () => {
    const pat = makeProfile({ id: 'pat', fullName: 'Pat P', status: 'PENDING_VERIFICATION' });
    const menu = await openMenu(userEvent.setup(), { as: 'pat', profiles: [pat] });
    expect(within(menu).getByText('Pending verification')).toBeInTheDocument();
  });

  it('badges a rejected user', async () => {
    const rex = makeProfile({ id: 'rex', fullName: 'Rex R', status: 'REJECTED' });
    const menu = await openMenu(userEvent.setup(), { as: 'rex', profiles: [rex] });
    expect(within(menu).getByText('Rejected')).toBeInTheDocument();
  });

  it('lists Edit profile, the dev switcher and Sign out in that order', async () => {
    const menu = await openMenu(userEvent.setup());
    expect(entries(menu)).toEqual([
      'Edit profile',
      'Alice Active (OPM 1)',
      'Bob Receiver (OPM 2)',
      'Sign out',
    ]);
    expect(within(menu).getAllByRole('separator')).toHaveLength(3);
    expect(within(menu).getByText('Acting as (Dev)')).toBeInTheDocument();
  });

  it('marks the current user in the switcher and switches by signing in again as the chosen one', async () => {
    const user = userEvent.setup();
    const menu = await openMenu(user);
    expect(within(menu).getByRole('menuitemradio', { name: /Alice Active/ })).toBeChecked();
    expect(within(menu).getByRole('menuitemradio', { name: /Bob Receiver/ })).not.toBeChecked();

    await user.click(within(menu).getByRole('menuitemradio', { name: /Bob Receiver/ }));
    expect(signIn).toHaveBeenCalledWith('dev-impersonate', { profileId: 'bob', redirect: false });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('omits the dev switcher entirely in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const menu = await openMenu(userEvent.setup());
    expect(within(menu).queryByText('Acting as (Dev)')).not.toBeInTheDocument();
    expect(within(menu).queryAllByRole('menuitemradio')).toHaveLength(0);
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((el) => el.textContent?.trim()),
    ).toEqual(['Edit profile', 'Sign out']);
    expect(within(menu).getAllByRole('separator')).toHaveLength(2);
  });

  it('opens the edit dialog from the menu and closes the menu', async () => {
    const user = userEvent.setup();
    const menu = await openMenu(user);
    await user.click(within(menu).getByRole('menuitem', { name: 'Edit profile' }));

    expect(await screen.findByRole('dialog', { name: 'Edit your profile' })).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveValue('Alice Active');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('signs out', async () => {
    const user = userEvent.setup();
    const menu = await openMenu(user);
    await user.click(within(menu).getByRole('menuitem', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalledWith({ redirect: false });
  });

  it('supports keyboard use: Enter opens, arrows move, Escape closes and returns focus', async () => {
    const user = userEvent.setup();
    stubApi({ 'GET /profiles': [alice, bob], 'GET /intros': {} });
    renderWithProviders(<UserMenu />, { currentUserId: 'alice' });
    const trigger = await screen.findByRole('button', { name: /^Account menu/ });

    trigger.focus();
    await user.keyboard('{Enter}');
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'Edit profile' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(within(menu).getByRole('menuitemradio', { name: /Alice Active/ })).toHaveFocus();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('closes when clicking outside', async () => {
    const user = userEvent.setup();
    await openMenu(user);
    await user.click(document.body);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('shows a placeholder, not a button, while the user is loading', () => {
    stubApi({ 'GET /profiles': new Promise(() => {}), 'GET /intros': {} });
    renderWithProviders(<UserMenu />, { currentUserId: 'alice' });
    expect(screen.queryByRole('button', { name: /^Account menu/ })).not.toBeInTheDocument();
  });
});
