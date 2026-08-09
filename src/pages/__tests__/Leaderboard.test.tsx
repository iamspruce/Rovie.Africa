import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Leaderboard } from '../Leaderboard/Leaderboard';

describe('Leaderboard page', () => {
  it('renders the heading immediately and a loading state', () => {
    render(
      <MemoryRouter>
        <Leaderboard />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /affordability leaderboard/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
  });

  it('reaches a terminal state (table or error) once the real request completes', async () => {
    render(
      <MemoryRouter>
        <Leaderboard />
      </MemoryRouter>
    );
    await waitFor(
      () => {
        const table = screen.queryByRole('table');
        const alert = screen.queryByRole('alert');
        expect(Boolean(table) || Boolean(alert)).toBe(true);
      },
      { timeout: 12000 }
    );
  });
});
