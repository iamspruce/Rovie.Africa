import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Code } from '../Code/Code';
import { ROUTE_URL } from '../../content/navLinks';

describe('Rovie Code page', () => {
  it('describes the agent-focused product and links to Route while it is in development', () => {
    render(<MemoryRouter><Code /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: /rovie code/i })).toBeInTheDocument();
    expect(screen.getByText(/a home for ai coding agents/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore rovie route/i })).toHaveAttribute('href', ROUTE_URL);
  });
});
