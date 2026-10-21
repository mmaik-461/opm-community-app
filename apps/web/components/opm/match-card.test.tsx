import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { emptyIntros, makeMatch, makeProfile } from '@/test/fixtures';
import { jsonError, stubApi } from '@/test/api-fake';
import { testAccessToken } from '@/test/next-auth';
import { renderWithProviders } from '@/test/render';
import { MatchCard } from './match-card';

const me = makeProfile({ id: 'me', fullName: 'Me Myself', cohort: 'OPM 50' });
const anna = makeProfile();

function setup(match = makeMatch(), extraRoutes: Record<string, unknown> = {}) {
  const api = stubApi({
    'GET /profiles': [me, anna],
    'GET /intros': emptyIntros(),
    ...extraRoutes,
  });
  renderWithProviders(<MatchCard match={match} rank={1} query="Series A" />, {
    currentUserId: 'me',
  });
  return api;
}

describe('MatchCard', () => {
  it('shows the candidate, rounded match percentage and reasoning', async () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Anna Kowalska' })).toBeInTheDocument();
    expect(screen.getByText('OPM 48')).toBeInTheDocument();
    expect(screen.getByText('87% Match')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('Raised a Series A in the same space.')).toBeInTheDocument();
    expect(screen.getByText(/Living in/)).toHaveTextContent('Living in Warsaw');
  });

  it('renders the mutual synergy callout with its content when provided', () => {
    setup();
    const label = screen.getByText('Mutual synergy');
    const callout = label.closest('div')!;
    expect(
      within(callout).getByText('You bring product depth; she brings fundraising playbooks.'),
    ).toBeInTheDocument();
  });

  it('omits the mutual synergy callout when the match has none', () => {
    setup(makeMatch({ mutualSynergy: undefined }));
    expect(screen.queryByText('Mutual synergy')).not.toBeInTheDocument();
  });

  it('shows the icebreaker as a quote', () => {
    const match = makeMatch({ suggestedIcebreaker: 'Coffee in Warsaw next week?' });
    setup(match);
    expect(screen.getByText('Suggested icebreaker')).toBeInTheDocument();
    expect(screen.getByText('Coffee in Warsaw next week?').tagName).toBe('BLOCKQUOTE');
  });

  describe('icebreaker actions', () => {
    it('copies the icebreaker to the clipboard and confirms', async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByRole('button', { name: /copy message/i }));
      expect(await screen.findByRole('button', { name: /copied!/i })).toBeInTheDocument();
      await expect(navigator.clipboard.readText()).resolves.toBe(
        'Hi Anna, I would love to hear how you raised your Series A.',
      );
    });

    it('offers an email link carrying the icebreaker as the body', () => {
      setup();
      const href = screen.getByRole('link', { name: /email/i }).getAttribute('href')!;
      expect(href.startsWith('mailto:anna@example.com?')).toBe(true);
      expect(new URLSearchParams(href.split('?')[1]).get('body')).toBe(
        'Hi Anna, I would love to hear how you raised your Series A.',
      );
    });

    it('opens LinkedIn safely in a new tab', () => {
      setup();
      const link = screen.getByRole('link', { name: /linkedin/i });
      expect(link).toHaveAttribute('href', 'https://www.linkedin.com/in/anna');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    });

    it('hides contact links that are missing or unsafe', () => {
      setup(
        makeMatch({
          profile: makeProfile({ linkedinUrl: 'javascript:alert(1)', email: null }),
        }),
      );
      expect(screen.queryByRole('link', { name: /linkedin/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /email/i })).not.toBeInTheDocument();
    });
  });

  describe('Request Intro', () => {
    it('is disabled when the match is the acting user', async () => {
      stubApi({ 'GET /profiles': [me, anna], 'GET /intros': emptyIntros() });
      renderWithProviders(<MatchCard match={makeMatch({ profile: me })} rank={1} query="x" />, {
        currentUserId: 'me',
      });
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /request intro/i })).toBeDisabled(),
      );
    });

    it('opens the dialog, sends the intro with the acting user and marks it requested', async () => {
      const user = userEvent.setup();
      const api = setup(makeMatch(), {
        'POST /intros': { id: 'new-intro' },
      });
      const open = screen.getByRole('button', { name: /request intro/i });
      await waitFor(() => expect(open).toBeEnabled());
      await user.click(open);

      const dialog = await screen.findByRole('dialog', { name: /request an intro/i });
      await user.click(within(dialog).getByRole('button', { name: /send request/i }));

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /intro requested/i })).toBeDisabled(),
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      const post = api.calls.find((c) => c.method === 'POST');
      // The requester is the authenticated user, so it is never part of the payload.
      expect(post?.headers.get('Authorization')).toBe(`Bearer ${testAccessToken('me')}`);
      expect(post?.body).toEqual({
        targetId: 'p1',
        query: 'Series A',
        icebreaker: 'Hi Anna, I would love to hear how you raised your Series A.',
      });
    });

    it('keeps the card actionable when the server rejects the request', async () => {
      const user = userEvent.setup();
      setup(makeMatch(), {
        'POST /intros': () =>
          jsonError(409, 'A pending intro already exists between these two people'),
      });
      const open = screen.getByRole('button', { name: /request intro/i });
      await waitFor(() => expect(open).toBeEnabled());
      await user.click(open);
      const dialog = await screen.findByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: /send request/i }));
      expect(await within(dialog).findByRole('alert')).toHaveTextContent(/already exists/i);
      // Not marked as requested: the same button is still enabled for another attempt.
      expect(open).toBeEnabled();
      expect(open).toHaveTextContent('Request Intro');
    });
  });

  describe('feedback', () => {
    const rate = (name: RegExp) => screen.getByRole('button', { name });

    it('sends a thumbs up for the candidate and query, then confirms', async () => {
      const user = userEvent.setup();
      const api = setup(makeMatch(), { 'POST /matchmaker/feedback': { id: 'fb-1' } });
      await user.click(rate(/^relevant$/i));

      expect(await screen.findByRole('status')).toHaveTextContent('Thanks for your feedback');
      expect(screen.queryByRole('button', { name: /relevant/i })).not.toBeInTheDocument();
      const post = api.calls.find((c) => c.path === '/matchmaker/feedback');
      expect(post?.headers.get('Authorization')).toBe(`Bearer ${testAccessToken('me')}`);
      // The reviewer is the token owner, never part of the payload.
      expect(post?.body).toEqual({
        candidateId: 'p1',
        query: 'Series A',
        rating: 'POSITIVE',
        reason: 'GREAT_MATCH',
      });
    });

    it('asks for a reason on a thumbs down and sends reason and comment', async () => {
      const user = userEvent.setup();
      const api = setup(makeMatch(), { 'POST /matchmaker/feedback': { id: 'fb-2' } });
      await user.click(rate(/not relevant/i));

      const dialog = await screen.findByRole('dialog', { name: /what was off/i });
      expect(api.calls.some((c) => c.path === '/matchmaker/feedback')).toBe(false);
      expect(within(dialog).queryByLabelText('Great match')).not.toBeInTheDocument();
      await user.click(within(dialog).getByLabelText('Skill mismatch'));
      await user.type(within(dialog).getByLabelText(/comment/i), '  No fundraising background ');
      await user.click(within(dialog).getByRole('button', { name: /submit feedback/i }));

      expect(await screen.findByRole('status')).toHaveTextContent('Thanks for your feedback');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(api.calls.find((c) => c.path === '/matchmaker/feedback')?.body).toEqual({
        candidateId: 'p1',
        query: 'Series A',
        rating: 'NEGATIVE',
        reason: 'SKILL_MISMATCH',
        comment: 'No fundraising background',
      });
    });

    it('allows a thumbs down without a reason or comment', async () => {
      const user = userEvent.setup();
      const api = setup(makeMatch(), { 'POST /matchmaker/feedback': { id: 'fb-3' } });
      await user.click(rate(/not relevant/i));
      await user.click(
        within(await screen.findByRole('dialog')).getByRole('button', { name: /submit feedback/i }),
      );
      await screen.findByRole('status');
      expect(api.calls.find((c) => c.path === '/matchmaker/feedback')?.body).toEqual({
        candidateId: 'p1',
        query: 'Series A',
        rating: 'NEGATIVE',
      });
    });

    it('cancelling the dialog sends nothing and keeps the buttons', async () => {
      const user = userEvent.setup();
      const api = setup();
      await user.click(rate(/not relevant/i));
      await user.click(
        within(await screen.findByRole('dialog')).getByRole('button', { name: /cancel/i }),
      );
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(api.calls.some((c) => c.path === '/matchmaker/feedback')).toBe(false);
      expect(rate(/^relevant$/i)).toBeEnabled();
    });

    it('shows the server error in the dialog and stays retryable', async () => {
      const user = userEvent.setup();
      setup(makeMatch(), {
        'POST /matchmaker/feedback': () =>
          jsonError(403, 'Your account is awaiting alumni verification.'),
      });
      await user.click(rate(/not relevant/i));
      const dialog = await screen.findByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: /submit feedback/i }));
      expect(await within(dialog).findByRole('alert')).toHaveTextContent(/awaiting alumni/i);
      expect(within(dialog).getByRole('button', { name: /submit feedback/i })).toBeEnabled();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('shows a thumbs up failure next to the buttons without confirming', async () => {
      const user = userEvent.setup();
      setup(makeMatch(), { 'POST /matchmaker/feedback': () => jsonError(500, 'Database down') });
      await user.click(rate(/^relevant$/i));
      expect(await screen.findByRole('alert')).toHaveTextContent('Database down');
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(rate(/^relevant$/i)).toBeEnabled();
    });
  });
});
