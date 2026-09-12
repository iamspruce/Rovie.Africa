import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RouteProduct } from '../Route/Route';

describe('Rovie Route page', () => {
  it('explains Route as a product and directs visitors to build or compare models', () => {
    render(
      <MemoryRouter>
        <RouteProduct />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /rovie route/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /build with route/i })).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('link', { name: /browse models and pricing/i })).toHaveAttribute(
      'href',
      '/models'
    );
    expect(screen.getByRole('heading', { level: 2, name: /what route does/i })).toBeInTheDocument();
  });
});
