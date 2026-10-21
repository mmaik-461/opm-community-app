import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthHeading } from './auth-heading';

describe('AuthHeading', () => {
  it('links the brand logo and a "Back to home" link to the landing page', () => {
    render(<AuthHeading title="Sign in" subtitle="Welcome back" />);
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'OPM Community Hub home' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
  });
});
