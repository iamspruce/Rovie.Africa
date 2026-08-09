import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const healthCheck = vi.fn();
const getModels = vi.fn();
const getFxRates = vi.fn();

vi.mock('../../sdk', () => ({
  rovie: {
    litellm: { healthCheck: (...args: unknown[]) => healthCheck(...args) },
    account: {
      getModels: (...args: unknown[]) => getModels(...args),
      getFxRates: (...args: unknown[]) => getFxRates(...args),
    },
  },
}));

import { Support } from '../Support/Support';

function renderSupport() {
  return render(
    <MemoryRouter>
      <Support />
    </MemoryRouter>
  );
}

describe('Support page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    healthCheck.mockResolvedValue({ status: 'healthy', db: 'connected' });
    getModels.mockResolvedValue({ models: [{ litellmModelName: 'a' }] });
    getFxRates.mockResolvedValue({ supported: ['NGN'], currencies: {}, fetchedAt: 1 });
  });

  it('offers a route for each kind of problem', () => {
    renderSupport();
    ['Something is broken', 'A payment did not land', 'A key is exposed', 'Something else'].forEach(
      (title) => {
        expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
      }
    );
  });

  // The point of these links is that the first reply can be an answer rather
  // than a request for the details we already knew we'd need.
  it('pre-fills the subject and the questions we would otherwise have to ask', () => {
    renderSupport();
    const link = screen.getByRole('link', { name: /chase a top-up/i });
    const href = decodeURIComponent(link.getAttribute('href') ?? '');
    expect(href).toContain('mailto:hello@rovie.africa');
    expect(href).toContain('Top-up not credited');
    expect(href).toContain('Payment reference:');
  });

  it('tells someone reporting an exposed key not to paste the key itself', () => {
    renderSupport();
    const href = decodeURIComponent(
      screen.getByRole('link', { name: /report an exposed key/i }).getAttribute('href') ?? ''
    );
    expect(href).toContain('Do NOT paste the key itself');
  });

  // "Is it down?" decides whether writing an email is worth it, so the page
  // answers it from the same live probes the status page runs.
  it('answers "is it down" from the live checks before anyone writes in', async () => {
    renderSupport();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/all monitored systems are responding/i)
    );
    expect(screen.getByRole('link', { name: /see the live checks/i })).toHaveAttribute(
      'href',
      '/status'
    );
  });

  it('says so when a system is actually failing', async () => {
    healthCheck.mockRejectedValue(new Error('nope'));
    renderSupport();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/something is not responding/i)
    );
  });

  it('answers the common questions without needing an email at all', () => {
    renderSupport();
    expect(screen.getByText(/my call returns 401/i)).toBeInTheDocument();
    expect(screen.getByText(/is the problem me or you/i)).toBeInTheDocument();
  });
});
