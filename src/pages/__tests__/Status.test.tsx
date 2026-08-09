import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

import { Status } from '../Status/Status';

function renderStatus() {
  return render(
    <MemoryRouter>
      <Status />
    </MemoryRouter>
  );
}

function rowFor(name: RegExp) {
  return screen.getByRole('heading', { name }).closest('li') as HTMLElement;
}

describe('Status page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    healthCheck.mockResolvedValue({ status: 'healthy', db: 'connected' });
    getModels.mockResolvedValue({ models: [{ litellmModelName: 'a' }, { litellmModelName: 'b' }] });
    getFxRates.mockResolvedValue({ supported: ['NGN', 'KES'], currencies: {}, fetchedAt: 1 });
  });

  it('reports everything operational when every probe answers', async () => {
    renderStatus();
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/all systems operational/i)
    );
  });

  it('runs a real probe against each service rather than assuming', async () => {
    renderStatus();
    await waitFor(() => expect(healthCheck).toHaveBeenCalled());
    expect(getModels).toHaveBeenCalled();
    expect(getFxRates).toHaveBeenCalled();
  });

  it('surfaces detail the probe itself reported', async () => {
    renderStatus();
    await waitFor(() =>
      expect(within(rowFor(/model gateway/i)).getByText(/database connected/i)).toBeInTheDocument()
    );
    expect(within(rowFor(/model catalog/i)).getByText(/2 models listed/i)).toBeInTheDocument();
  });

  // A failing probe has to read as failing. This is the whole point of the
  // page - a status page that goes green when a service is down is worse than
  // no status page.
  it('marks a service down when its probe rejects', async () => {
    healthCheck.mockRejectedValue(new Error('Connection refused'));
    renderStatus();

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/not responding/i)
    );
    expect(within(rowFor(/model gateway/i)).getByText(/not responding/i)).toBeInTheDocument();
    expect(within(rowFor(/model gateway/i)).getByText(/connection refused/i)).toBeInTheDocument();
  });

  it('treats an unhealthy readiness response as down, not as a pass', async () => {
    healthCheck.mockResolvedValue({ status: 'unhealthy', db: 'disconnected' });
    renderStatus();
    await waitFor(() =>
      expect(within(rowFor(/model gateway/i)).getByText(/reported unhealthy/i)).toBeInTheDocument()
    );
  });

  it('treats an empty catalog as a failure rather than a healthy empty list', async () => {
    getModels.mockResolvedValue({ models: [] });
    renderStatus();
    await waitFor(() =>
      expect(within(rowFor(/model catalog/i)).getByText(/returned no models/i)).toBeInTheDocument()
    );
  });

  // We can't probe the Payment Service without charging someone, so it must
  // say so rather than show a green light it didn't earn.
  it('declares the unprobeable service unmonitored instead of green', async () => {
    renderStatus();
    const row = rowFor(/top-ups/i);
    expect(within(row).getByText(/not monitored/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/all systems operational/i)
    );
  });

  it('rechecks on demand', async () => {
    const user = userEvent.setup();
    renderStatus();
    await waitFor(() => expect(healthCheck).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: /check again/i }));
    await waitFor(() => expect(healthCheck).toHaveBeenCalledTimes(2));
  });
});
