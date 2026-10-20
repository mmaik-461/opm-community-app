import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { stubApi, type Handler } from '@/test/api-fake';
import { emptyIntros, makeIntro, makeProfile } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';
import { useUser } from './user-context';
import { Intros } from './intros';

const alice = makeProfile({ id: 'alice', fullName: 'Alice Active' });
const bob = makeProfile({ id: 'bob', fullName: 'Bob Receiver' });
const sentIntro = makeIntro({
  id: 'sent-1',
  requester: alice,
  requesterId: 'alice',
  target: bob,
  targetId: 'bob',
});
const receivedIntro = makeIntro({
  id: 'rec-1',
  requester: alice,
  requesterId: 'alice',
  target: bob,
  targetId: 'bob',
});
const page = (data: ReturnType<typeof makeIntro>[]) => ({
  data,
  meta: { total: data.length, page: 1, totalPages: 1 },
});

function Switcher() {
  const { setCurrentUserId } = useUser();
  return <button onClick={() => setCurrentUserId('bob')}>switch to bob</button>;
}

describe('Intros acting-user switch', () => {
  it('returns to the Received tab for the new user while keeping the badge in sync', async () => {
    const user = userEvent.setup();
    stubApi({
      'GET /profiles': [alice, bob],
      'GET /intros': (({ url }) =>
        url.searchParams.get('userId') === 'bob'
          ? { ...emptyIntros(), received: page([receivedIntro]), pendingIncoming: 1 }
          : { ...emptyIntros(), sent: page([sentIntro]) }) satisfies Handler,
    });
    renderWithProviders(
      <>
        <Switcher />
        <Intros />
      </>,
      { currentUserId: 'alice' },
    );

    const sentTab = await screen.findByRole('tab', { name: /^Sent/ });
    await user.click(sentTab);
    expect(sentTab).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('button', { name: 'switch to bob' }));

    const receivedTab = screen.getByRole('tab', { name: /^Received/ });
    await waitFor(() => expect(receivedTab).toHaveAttribute('aria-selected', 'true'));
    expect(screen.getByRole('tab', { name: /^Sent/ })).toHaveAttribute('aria-selected', 'false');
    expect(await screen.findByText('1 new')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /accept/i })).toBeInTheDocument();
  });
});
