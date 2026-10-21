import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from './page';

describe('LandingPage', () => {
  beforeEach(() => {
    // jsdom has no canvas; the graph is a progressive enhancement and simply does not draw.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  it('renders the hero heading with Join and Sign In calls to action', () => {
    render(<LandingPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Find the right alumni, instantly.' }),
    ).toBeInTheDocument();

    const hero = screen.getByRole('region', { name: 'Find the right alumni, instantly.' });
    expect(within(hero).getByRole('link', { name: 'Join the Network' })).toHaveAttribute(
      'href',
      '/register',
    );
    expect(within(hero).getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/login');
  });

  it('presents the three pillars', () => {
    render(<LandingPage />);
    for (const name of [
      'Smart Semantic Matchmaking',
      'Verified Alumni Only',
      'Double-Opt-In Introductions',
    ]) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument();
    }
  });

  it('showcases the network, the trust banner and a footer with the current year', () => {
    render(<LandingPage />);
    expect(screen.getByRole('heading', { name: 'Who is in the network' })).toBeInTheDocument();
    expect(screen.getByText('Fintech')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Trust is the product' })).toBeInTheDocument();
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent(`© ${new Date().getFullYear()}`);
    expect(within(footer).getByRole('link', { name: 'Sign up' })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('keeps the animated hero visual accessible', () => {
    render(<LandingPage />);
    expect(screen.getByRole('img', { name: /animated graph of connected alumni/i })).toBeVisible();
  });
});
