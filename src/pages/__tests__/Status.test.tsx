import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const healthCheck = vi.fn();
const getModels = vi.fn();
const getFxRates = vi.fn();

// importOriginal rather than a bare object: statusFailures.ts classifies a
// failure with `error instanceof RovieApiError`, so the real class has to come
// through or every classification silently falls back to "unreachable".
vi.mock('../../sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../sdk')>();
  return {
    ...actual,
    rovie: {
      litellm: { healthCheck: (...args: unknown[]) => healthCheck(...args) },
      account: {
        getModels: (...args: unknown[]) => getModels(...args),
        getFxRates: (...args: unknown[]) => getFxRates(...args),
      },
    },
  };
});

import { Status } from '../Status/Status';
import { STORAGE_KEY } from '../../lib/statusHistory';

import { stubImageLoader } from '../../test/stubImageLoader';

function renderStatus() {
  return render(
    <MemoryRouter>
      <Status />
    </MemoryRouter>
  );
}

/**
 * The service's row in the status list.
 *
 * Scoped to that list rather than searched page-wide: each service now names
 * itself twice, once in its row and again over its timeline strip further down,
 * so a bare heading query matches both.
 */
function rowFor(name: RegExp) {
  const list = screen.getByRole('list', { name: /service status/i });
  return within(list).getByRole('heading', { name }).closest('li') as HTMLElement;
}

describe('Status page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.removeItem(STORAGE_KEY);
    stubImageLoader('load');
    healthCheck.mockResolvedValue({ status: 'healthy', db: 'connected' });
    getModels.mockResolvedValue({ models: [{ litellmModelName: 'a' }, { litellmModelName: 'b' }] });
    getFxRates.mockResolvedValue({ supported: ['NGN', 'KES'], currencies: {}, fetchedAt: 1 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.removeItem(STORAGE_KEY);
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
    const row = rowFor(/model gateway/i);
    expect(within(row).getByText(/not responding/i)).toBeInTheDocument();
    // The probe's own message survives alongside the classification - it is the
    // only part that says what actually happened.
    expect(within(row).getByText(/connection refused/i)).toBeInTheDocument();
  });

  it('treats an unhealthy readiness response as down, not as a pass', async () => {
    healthCheck.mockResolvedValue({ status: 'unhealthy', db: 'disconnected' });
    renderStatus();
    await waitFor(() =>
      expect(within(rowFor(/model gateway/i)).getByText(/reported "unhealthy"/i)).toBeInTheDocument()
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

  describe('the documentation site', () => {
    it('reports it operational when the health asset loads', async () => {
      renderStatus();
      await waitFor(() =>
        expect(within(rowFor(/documentation/i)).getByText(/site reachable/i)).toBeInTheDocument()
      );
    });

    it('reports it down when the asset does not load', async () => {
      stubImageLoader('error');
      renderStatus();

      await waitFor(() =>
        expect(within(rowFor(/documentation/i)).getByText(/not responding/i)).toBeInTheDocument()
      );
    });

    // Without a cache-buster the browser answers the second poll from its own
    // cache in about a millisecond, and the page reports a confident 1 ms for a
    // host that has been down for an hour.
    it('cache-busts the probe so a repeat check is a real request', async () => {
      const { requested: seen } = stubImageLoader('load');

      const user = userEvent.setup();
      renderStatus();
      await waitFor(() => expect(seen).toHaveLength(1));

      await user.click(screen.getByRole('button', { name: /check again/i }));
      await waitFor(() => expect(seen).toHaveLength(2));

      expect(seen[0]).toMatch(/\/health\.svg\?t=\d+/);
      expect(seen[0]).not.toBe(seen[1]);
    });
  });

  describe('explaining a failure', () => {
    it('says whose problem a server error is', async () => {
      const { RovieApiError } = await import('../../sdk');
      healthCheck.mockRejectedValue(new RovieApiError('upstream exploded', { status: 503 }));
      renderStatus();

      const row = await waitFor(() => rowFor(/model gateway/i));
      expect(within(row).getByText(/server error/i)).toBeInTheDocument();
      expect(within(row).getByText(/this one is ours/i)).toBeInTheDocument();
    });

    // The failure an uptime monitor calls green. It is not.
    it('distinguishes a useless answer from no answer', async () => {
      getFxRates.mockResolvedValue({ supported: [] });
      renderStatus();

      const row = await waitFor(() => rowFor(/exchange rates/i));
      expect(within(row).getByText(/answered, but wrongly/i)).toBeInTheDocument();
    });

    it('does not blame the visitor when one service is down and the rest are fine', async () => {
      healthCheck.mockRejectedValue(new Error('Failed to fetch'));
      renderStatus();

      await waitFor(() =>
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/not responding/i)
      );
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    // Four independent services rarely break at the same instant, and the one
    // thing they share is the connection used to reach them.
    it('suggests the local network when every service fails the same way', async () => {
      healthCheck.mockRejectedValue(new Error('Failed to fetch'));
      getModels.mockRejectedValue(new Error('Failed to fetch'));
      getFxRates.mockRejectedValue(new Error('Failed to fetch'));
      stubImageLoader('error');
      renderStatus();

      const banner = await screen.findByRole('alert');
      expect(banner).toHaveTextContent(/check your connection first/i);
    });

    // Getting this wrong during a real outage talks somebody out of reporting
    // it, so a provably-ours failure has to suppress the banner even when
    // everything is red.
    it('stays quiet when everything is down but one failure is provably ours', async () => {
      const { RovieApiError } = await import('../../sdk');
      healthCheck.mockRejectedValue(new RovieApiError('boom', { status: 500 }));
      getModels.mockRejectedValue(new Error('Failed to fetch'));
      getFxRates.mockRejectedValue(new Error('Failed to fetch'));
      stubImageLoader('error');
      renderStatus();

      await waitFor(() =>
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/not responding/i)
      );
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  // Nobody reads a status page they cannot see, and the catalog probe pulls
  // the whole model list every minute. A forgotten background tab spending
  // someone's mobile data all afternoon buys a chart no one is looking at.
  describe('while the tab is hidden', () => {
    function setVisibility(state: DocumentVisibilityState) {
      Object.defineProperty(document, 'visibilityState', {
        value: state,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    }

    afterEach(() => setVisibility('visible'));

    it('runs no checks at all if the page starts hidden', async () => {
      setVisibility('hidden');
      renderStatus();

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(healthCheck).not.toHaveBeenCalled();
    });

    it('checks immediately on return rather than waiting out the interval', async () => {
      renderStatus();
      await waitFor(() => expect(healthCheck).toHaveBeenCalledTimes(1));

      setVisibility('hidden');
      setVisibility('visible');

      await waitFor(() => expect(healthCheck).toHaveBeenCalledTimes(2));
    });
  });

  describe('the window it reports on', () => {
    it('offers every charted figure as a table too', async () => {
      const user = userEvent.setup();
      renderStatus();
      await waitFor(() => expect(healthCheck).toHaveBeenCalled());

      await user.click(screen.getByRole('button', { name: /show table/i }));

      const table = screen.getByRole('table');
      expect(within(table).getByRole('columnheader', { name: /median/i })).toBeInTheDocument();
      expect(within(table).getByRole('rowheader', { name: /documentation/i })).toBeInTheDocument();
    });

    it('says out loud that the figures are this browser only', async () => {
      renderStatus();
      await waitFor(() => expect(healthCheck).toHaveBeenCalled());
      expect(screen.getByText(/not an uptime record/i)).toBeInTheDocument();
    });

    it('lets the visitor clear the history it stored on their device', async () => {
      const user = userEvent.setup();
      renderStatus();
      await waitFor(() => expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull());

      await user.click(screen.getByRole('button', { name: /clear this history/i }));
      expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({});
    });

    it('carries a stored window across a remount', async () => {
      const { unmount } = renderStatus();
      await waitFor(() => expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull());
      unmount();

      const user = userEvent.setup();
      renderStatus();
      await waitFor(() => expect(healthCheck).toHaveBeenCalledTimes(2));

      await user.click(screen.getByRole('button', { name: /show table/i }));
      const row = screen.getByRole('rowheader', { name: /model gateway/i }).closest('tr')!;
      // Two rounds recorded, not one - the first survived the unmount.
      expect(within(row).getByText('2')).toBeInTheDocument();
    });
  });
});
