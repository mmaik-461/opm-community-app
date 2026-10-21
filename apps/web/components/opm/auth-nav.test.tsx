import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthNav } from './auth-nav';

describe('AuthNav', () => {
  it('links the sign-in and sign-up pages and marks the current one', () => {
    render(<AuthNav active="register" />);
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Sign in' })).not.toHaveAttribute('aria-current');
  });

  it('carries a safe post-sign-in destination across both pages and drops an unsafe one', () => {
    const { unmount } = render(<AuthNav active="login" callbackUrl="/directory" />);
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login?callbackUrl=%2Fdirectory',
    );
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute(
      'href',
      '/register?callbackUrl=%2Fdirectory',
    );
    unmount();

    render(<AuthNav active="login" callbackUrl="https://evil.example" />);
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/register');
  });
});
