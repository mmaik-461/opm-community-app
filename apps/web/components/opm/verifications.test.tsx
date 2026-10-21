import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { jsonError, stubApi } from '@/test/api-fake';
import { makeProfile, makeVerification } from '@/test/fixtures';
import { formatDate } from '@/utils/format';
import { renderWithProviders } from '@/test/render';
import { Verifications } from './verifications';

const admin = makeProfile({ id: 'admin', fullName: 'Ada Admin', role: 'ADMIN' });
const member = makeProfile({ id: 'member', fullName: 'Mia Member' });
const nina = makeVerification();
const oscar = makeVerification({
  id: 'v2',
  fullName: 'Oscar Older',
  email: 'oscar@example.com',
  graduationYear: 2015,
  diplomaNumber: null,
  createdAt: '2026-03-03T10:00:00.000Z',
});

const adminRoutes = {
  'GET /profiles': [admin, member],
  'GET /admin/verifications': { data: [nina, oscar] },
};

describe('Verifications', () => {
  it('lists each applicant with name, email, graduation year, diploma ID and date', async () => {
    stubApi(adminRoutes);
    renderWithProviders(<Verifications />, { currentUserId: 'admin' });

    const ninaRow = (await screen.findByRole('row', { name: /Nina Newbie/ })) as HTMLElement;
    for (const text of ['nina@example.com', '2019', 'DIP-42', formatDate(nina.createdAt)]) {
      expect(within(ninaRow).getByText(text)).toBeInTheDocument();
    }
    expect(
      within(screen.getByRole('row', { name: /Oscar Older/ })).getByText('Not provided'),
    ).toBeInTheDocument();
  });

  it('Approve sends the APPROVE decision and removes the row before the API answers', async () => {
    const user = userEvent.setup();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const api = stubApi({
      ...adminRoutes,
      'PATCH /admin/verifications/v1': async () => {
        await gate;
        return { id: 'v1', status: 'ACTIVE' };
      },
    });
    renderWithProviders(<Verifications />, { currentUserId: 'admin' });

    await user.click(await screen.findByRole('button', { name: 'Approve Nina Newbie' }));

    // Optimistic: gone while the request is still in flight.
    await waitFor(() => expect(screen.queryByText('Nina Newbie')).not.toBeInTheDocument());
    expect(screen.getByText('Oscar Older')).toBeInTheDocument();
    release();

    expect(await screen.findByRole('status')).toHaveTextContent('Nina Newbie approved');
    const patch = api.calls.find((c) => c.method === 'PATCH');
    expect(patch).toMatchObject({ path: '/admin/verifications/v1', body: { decision: 'APPROVE' } });
  });

  it('Reject sends the REJECT decision', async () => {
    const user = userEvent.setup();
    const api = stubApi({
      ...adminRoutes,
      'PATCH /admin/verifications/v2': { id: 'v2', status: 'REJECTED' },
    });
    renderWithProviders(<Verifications />, { currentUserId: 'admin' });

    await user.click(await screen.findByRole('button', { name: 'Reject Oscar Older' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Oscar Older rejected');
    expect(api.calls.find((c) => c.method === 'PATCH')?.body).toEqual({ decision: 'REJECT' });
    expect(screen.queryByText('Oscar Older')).not.toBeInTheDocument();
  });

  it('puts the row back in order and shows the error when the decision fails', async () => {
    const user = userEvent.setup();
    stubApi({
      ...adminRoutes,
      'PATCH /admin/verifications/v1': () => jsonError(500, 'Database unavailable'),
    });
    renderWithProviders(<Verifications />, { currentUserId: 'admin' });

    await user.click(await screen.findByRole('button', { name: 'Approve Nina Newbie' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable');
    const names = screen.getAllByRole('row').map((r) => r.textContent);
    expect(names[1]).toContain('Nina Newbie'); // restored above Oscar (older application first)
    expect(names[2]).toContain('Oscar Older');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows an empty state when nothing is pending', async () => {
    stubApi({ ...adminRoutes, 'GET /admin/verifications': { data: [] } });
    renderWithProviders(<Verifications />, { currentUserId: 'admin' });
    expect(await screen.findByText('No pending applications')).toBeInTheDocument();
  });

  it('shows access denied to members and never requests the queue', async () => {
    const api = stubApi(adminRoutes);
    renderWithProviders(<Verifications />, { currentUserId: 'member' });

    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied');
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(api.calls.map((c) => c.path)).not.toContain('/admin/verifications');
  });
});
