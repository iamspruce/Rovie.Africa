import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Research } from '../Research/Research';
import { ROUTE_URL } from '../../content/navLinks';

describe('Rovie Research page', () => {
  it('sets out the purpose, areas of inquiry, and public research commitment', () => {
    render(<MemoryRouter><Research /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: /research for ai that serves africa/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /areas of inquiry/i })).toBeInTheDocument();
    expect(screen.getByText(/access and capability/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore rovie route/i })).toHaveAttribute('href', ROUTE_URL);
  });
});
