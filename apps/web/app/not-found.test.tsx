import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Loading from './loading';
import NotFound from './not-found';

describe('NotFound', () => {
  it('shows the 404 status, an explanation and a link home', () => {
    render(<NotFound />);
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByText(/does not exist or may have been moved/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the community' })).toHaveAttribute(
      'href',
      '/',
    );
  });
});

describe('Loading', () => {
  it('announces a busy status to assistive tech', () => {
    render(<Loading />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent('Loading the community');
  });
});
