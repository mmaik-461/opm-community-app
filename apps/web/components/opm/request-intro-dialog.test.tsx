import { useState } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { emptyIntros, makeProfile } from '@/test/fixtures';
import { jsonError, stubApi } from '@/test/api-fake';
import { renderWithProviders } from '@/test/render';
import { RequestIntroDialog } from './request-intro-dialog';

const me = makeProfile({ id: 'me', fullName: 'Me Myself' });
const anna = makeProfile();

function Harness({
  target = anna,
  onSent = () => {},
  onOpenChange,
}: {
  target?: typeof anna;
  onSent?: () => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button onClick={() => setOpen(true)}>reopen</button>
      <RequestIntroDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          onOpenChange?.(o);
        }}
        target={target}
        query="Series A"
        icebreaker="Original icebreaker"
        onSent={onSent}
      />
    </>
  );
}

async function ready() {
  const send = await screen.findByRole('button', { name: /send request/i });
  await waitFor(() => expect(send).toBeEnabled());
  return send;
}

function setup(routes: Record<string, unknown> = {}, props: Parameters<typeof Harness>[0] = {}) {
  const api = stubApi({
    'GET /profiles': [me, anna],
    'GET /intros': emptyIntros(),
    ...routes,
  });
  renderWithProviders(<Harness {...props} />, { currentUserId: 'me' });
  return api;
}

describe('RequestIntroDialog', () => {
  it('is an accessible dialog describing the target and prefilled with the icebreaker', async () => {
    setup();
    const dialog = await screen.findByRole('dialog', { name: 'Request an intro' });
    expect(dialog).toHaveAccessibleDescription(/Anna will see your message/);
    expect(screen.getByLabelText('Your message')).toHaveValue('Original icebreaker');
    expect(screen.getByText('Co-founder & CEO, PayLoop')).toBeInTheDocument();
  });

  it('sends the edited, trimmed message and closes on success', async () => {
    const user = userEvent.setup();
    const onSent = vi.fn();
    const onOpenChange = vi.fn();
    const api = setup({ 'POST /intros': { id: 'x' } }, { onSent, onOpenChange });
    const send = await ready();

    const box = screen.getByLabelText('Your message');
    await user.clear(box);
    await user.type(box, '  Custom hello  ');
    await user.click(send);

    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(api.calls.find((c) => c.method === 'POST')?.body).toMatchObject({
      requesterId: 'me',
      targetId: 'p1',
      icebreaker: 'Custom hello',
    });
  });

  it('disables sending for a blank message', async () => {
    const user = userEvent.setup();
    setup();
    await ready();
    await user.clear(screen.getByLabelText('Your message'));
    expect(screen.getByRole('button', { name: /send request/i })).toBeDisabled();
  });

  it('shows the server error, stays open and does not report success', async () => {
    const user = userEvent.setup();
    const onSent = vi.fn();
    setup({ 'POST /intros': () => jsonError(409, 'Already pending') }, { onSent });
    await user.click(await ready());
    expect(await screen.findByRole('alert')).toHaveTextContent('Already pending');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onSent).not.toHaveBeenCalled();
  });

  it('blocks requesting an intro to yourself', async () => {
    setup({}, { target: me });
    expect(await screen.findByText(/can.t request an intro to yourself/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send request/i })).toBeDisabled();
  });

  it('closes via Cancel, the close button and Escape', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    setup({}, { onOpenChange });
    await ready();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'reopen' }));
    await user.click(await screen.findByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'reopen' }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('discards an unsent draft when reopened', async () => {
    const user = userEvent.setup();
    setup();
    await ready();
    const box = screen.getByLabelText('Your message');
    await user.clear(box);
    await user.type(box, 'draft that is never sent');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await user.click(screen.getByRole('button', { name: 'reopen' }));
    expect(await screen.findByLabelText('Your message')).toHaveValue('Original icebreaker');
  });
});
