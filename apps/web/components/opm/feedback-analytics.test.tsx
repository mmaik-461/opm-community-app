import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { jsonError, stubApi } from '@/test/api-fake';
import { makeFeedback, makeFeedbackAnalytics, makeProfile } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';
import { formatDate } from '@/utils/format';
import { FeedbackAnalytics } from './feedback-analytics';

const admin = makeProfile({ id: 'admin', fullName: 'Ada Admin', role: 'ADMIN' });
const member = makeProfile({ id: 'member', fullName: 'Mia Member' });

const liked = makeFeedback();
const disliked = makeFeedback({
  id: 'fb-2',
  query: 'CleanTech in Berlin',
  rating: 'NEGATIVE',
  reason: 'DIFFERENT_INDUSTRY',
  comment: 'Works in biotech',
  createdAt: '2026-03-04T10:00:00.000Z',
  user: { id: 'u2', fullName: 'Una Reviewer', email: null },
  candidate: { id: 'c2', fullName: 'Bruno Candidate', email: 'bruno@example.com' },
});
const bare = makeFeedback({
  id: 'fb-3',
  rating: 'NEGATIVE',
  reason: null,
  comment: null,
  query: 'Anything',
});

const routes = (feedback: unknown) => ({
  'GET /profiles': [admin, member],
  'GET /admin/feedback': feedback,
});

describe('FeedbackAnalytics', () => {
  it('shows total reviews and the satisfaction rate from the summary', async () => {
    stubApi(routes(makeFeedbackAnalytics([liked, disliked, bare])));
    renderWithProviders(<FeedbackAnalytics />, { currentUserId: 'admin' });

    const total = (await screen.findByText('Total reviews')).parentElement!;
    expect(total).toHaveTextContent('3');
    expect(screen.getByText('Satisfaction rate').parentElement).toHaveTextContent('33%');
  });

  it('reports the API summary, which covers reviews beyond the listed rows', async () => {
    stubApi(
      routes(
        makeFeedbackAnalytics([liked], {
          total: 250,
          positive: 200,
          negative: 50,
          satisfactionRate: 80,
        }),
      ),
    );
    renderWithProviders(<FeedbackAnalytics />, { currentUserId: 'admin' });
    expect((await screen.findByText('Total reviews')).parentElement).toHaveTextContent('250');
    expect(screen.getByText('Satisfaction rate').parentElement).toHaveTextContent('80%');
  });

  it('renders one row per review with date, people, query, rating badge, reason and comment', async () => {
    stubApi(routes(makeFeedbackAnalytics([liked, disliked, bare])));
    renderWithProviders(<FeedbackAnalytics />, { currentUserId: 'admin' });

    expect((await screen.findAllByRole('columnheader')).map((h) => h.textContent)).toEqual([
      'Date',
      'Reviewer',
      'Search query',
      'Recommended candidate',
      'Rating',
      'Reason & comment',
    ]);

    const bad = screen.getByRole('row', { name: /CleanTech in Berlin/ });
    for (const text of [
      formatDate(disliked.createdAt),
      'Una Reviewer',
      'Bruno Candidate',
      'bruno@example.com',
      'Not relevant',
      'Different industry',
      'Works in biotech',
    ]) {
      expect(within(bad).getByText(text)).toBeInTheDocument();
    }

    const good = screen.getByRole('row', { name: /Series A/ });
    expect(within(good).getByText('Me Myself')).toBeInTheDocument();
    expect(within(good).getByText('Anna Kowalska')).toBeInTheDocument();
    expect(within(good).getByText('Relevant')).toBeInTheDocument();
    expect(within(good).getByText('Great match')).toBeInTheDocument();

    // No reason and no comment: a dash instead of an empty cell.
    const cells = within(screen.getByRole('row', { name: /Anything/ })).getAllByRole('cell');
    expect(cells[5]).toHaveTextContent('—');
  });

  it('keeps the order the API returned (newest first)', async () => {
    stubApi(routes(makeFeedbackAnalytics([liked, disliked])));
    renderWithProviders(<FeedbackAnalytics />, { currentUserId: 'admin' });
    await screen.findByText('CleanTech in Berlin');
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Series A');
    expect(rows[1]).toHaveTextContent('CleanTech in Berlin');
  });

  it('shows a loading state until the data arrives', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    stubApi({
      'GET /profiles': [admin],
      'GET /admin/feedback': async () => {
        await gate;
        return makeFeedbackAnalytics([liked]);
      },
    });
    renderWithProviders(<FeedbackAnalytics />, { currentUserId: 'admin' });

    expect(await screen.findByRole('status', { name: 'Loading feedback' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    release();
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Loading feedback' })).not.toBeInTheDocument();
  });

  it('shows an empty state with no table and a dash for the satisfaction rate', async () => {
    stubApi(routes(makeFeedbackAnalytics([])));
    renderWithProviders(<FeedbackAnalytics />, { currentUserId: 'admin' });
    expect(await screen.findByText('No feedback yet')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('Total reviews').parentElement).toHaveTextContent('0');
    expect(screen.getByText('Satisfaction rate').parentElement).toHaveTextContent('—');
  });

  it('shows the error and retries', async () => {
    const user = userEvent.setup();
    let failing = true;
    stubApi({
      'GET /profiles': [admin],
      'GET /admin/feedback': () =>
        failing ? jsonError(500, 'Database unavailable') : makeFeedbackAnalytics([liked]),
    });
    renderWithProviders(<FeedbackAnalytics />, { currentUserId: 'admin' });

    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable');
    failing = false;
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('links the admin sections', async () => {
    stubApi(routes(makeFeedbackAnalytics([])));
    renderWithProviders(<FeedbackAnalytics />, { currentUserId: 'admin' });
    const nav = await screen.findByRole('navigation', { name: 'Admin sections' });
    expect(within(nav).getByRole('link', { name: 'Verifications' })).toHaveAttribute(
      'href',
      '/admin',
    );
    expect(within(nav).getByRole('link', { name: 'Feedback Analytics' })).toHaveAttribute(
      'href',
      '/admin/feedback',
    );
  });

  it('shows access denied to members and never requests the analytics', async () => {
    const api = stubApi(routes(makeFeedbackAnalytics([liked])));
    renderWithProviders(<FeedbackAnalytics />, { currentUserId: 'member' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(api.calls.map((c) => c.path)).not.toContain('/admin/feedback');
  });
});
