import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { rovie } from '../sdk';
import { DOCS_URL } from '../content/navLinks';
import { classifyFailure, MalformedResponseError } from '../lib/statusFailures';
import type { FailureExplanation } from '../lib/statusFailures';
import {
  appendSample,
  DEGRADED_ABOVE_MS,
  loadHistory,
  saveHistory,
} from '../lib/statusHistory';
import type { History, RecordedState, Sample } from '../lib/statusHistory';

export type ServiceState = RecordedState | 'unmonitored' | 'checking';

export interface ServiceCheck {
  id: string;
  name: string;
  /** What this row is actually telling you about. */
  description: string;
  state: ServiceState;
  /** Round-trip time of the probe in ms, when one ran. */
  latencyMs: number | null;
  /** Extra detail the probe itself reported, e.g. the gateway's db field. */
  detail: string | null;
  /** Present only on a failure. What went wrong, and whose problem it is. */
  failure: FailureExplanation | null;
  /** This service's samples over the window, oldest first. Drives its sparkline and strip. */
  samples: Sample[];
}

/**
 * A probe that reaches a service and reports how it went. Each one is a real,
 * unauthenticated request the site already relies on - nothing synthetic, and
 * nothing that costs the visitor anything.
 *
 * A probe that returns normally is a pass. To fail one, throw: a transport
 * failure throws on its own, and a response that arrived but is unusable
 * should throw MalformedResponseError, which is a different colour of problem
 * and is explained differently on the page.
 */
interface Probe {
  id: string;
  name: string;
  description: string;
  run: (signal: AbortSignal) => Promise<string | null>;
}

/**
 * Loads an image and resolves if it arrives.
 *
 * The only way to check a static site from another origin without CORS. It is
 * a weaker signal than a fetch - there is no status code to read, so a 404 and
 * a 500 are both just "did not load" - but it is a true one: nothing resolves
 * here unless DNS, TLS, the host and the path all worked.
 *
 * Cache-busted on every call. Without that the browser answers the second poll
 * from its own cache in about a millisecond, and the page would report a
 * confident 1 ms for a host that has been down for an hour.
 */
function loadImage(url: string, signal: AbortSignal, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      // Cancels an in-flight image request in every browser that matters.
      image.src = '';
    };

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };

    const onAbort = () => finish(new DOMException('Aborted', 'AbortError'));

    const timer = window.setTimeout(
      () => finish(new DOMException('Timed out', 'TimeoutError')),
      timeoutMs
    );

    signal.addEventListener('abort', onAbort, { once: true });

    image.onload = () => finish();
    image.onerror = () => finish(new Error('Did not load'));

    const separator = url.includes('?') ? '&' : '?';
    image.src = `${url}${separator}t=${Date.now()}`;
  });
}

const PROBES: Probe[] = [
  {
    id: 'gateway',
    name: 'Model gateway',
    description: 'The OpenAI-compatible endpoint your calls go through.',
    run: async (signal) => {
      // The one purpose-built health check we have: /health/readiness, no auth.
      const result = (await rovie.litellm.healthCheck({ signal })) as {
        status?: string;
        db?: string;
      } | null;
      if (result?.status && result.status !== 'healthy') {
        throw new MalformedResponseError(`Gateway reported "${result.status}"`);
      }
      return result?.db ? `Database ${result.db}` : null;
    },
  },
  {
    id: 'catalog',
    name: 'Model catalog',
    description: 'The list of models and their prices, served to this site.',
    run: async (signal) => {
      const result = (await rovie.account.getModels({ signal })) as {
        models?: unknown[];
      } | null;
      const count = result?.models?.length ?? 0;
      if (count === 0) throw new MalformedResponseError('Catalog returned no models');
      return `${count} models listed`;
    },
  },
  {
    id: 'fx',
    name: 'Exchange rates',
    description: 'Live conversion into local currency, from the Account Service.',
    run: async (signal) => {
      const result = (await rovie.account.getFxRates({ signal })) as {
        supported?: string[];
        fetchedAt?: number;
      } | null;
      const supported = result?.supported?.length ?? 0;
      if (supported === 0) throw new MalformedResponseError('No currencies returned');
      return `${supported} currencies quoted`;
    },
  },
  {
    id: 'docs',
    name: 'Documentation',
    description: 'docs.rovie.africa — the guides, the API reference and the quickstart.',
    run: async (signal) => {
      // An asset load rather than a fetch: the docs are a separate static site
      // on another origin, and a fetch there would need a CORS header this
      // repository cannot guarantee is deployed. See docs/public/health.svg.
      await loadImage(`${DOCS_URL}/health.svg`, signal);
      // No status code to report - an <img> that loads tells you it arrived and
      // nothing else. Saying what was actually checked beats implying more.
      return 'Site reachable';
    },
  },
];

// The Payment Service has no unauthenticated endpoint to probe - initiating a
// payment is a POST that charges someone. Saying so is better than showing a
// green light we didn't earn.
const UNMONITORED: Omit<ServiceCheck, 'samples'>[] = [
  {
    id: 'payments',
    name: 'Top-ups',
    description: 'Payment initiation and settlement through IvoryPay.',
    state: 'unmonitored',
    latencyMs: null,
    detail: 'No public health endpoint to check from the browser.',
    failure: null,
  },
];

export interface ServiceHealth {
  checks: ServiceCheck[];
  /** The worst state among the services we can actually see. */
  overall: ServiceState;
  lastCheckedAt: number | null;
  isChecking: boolean;
  /** True once a full round has landed - so charts can hold rather than flash. */
  hasResults: boolean;
  /** When the oldest sample still on record was taken. Null before the first. */
  windowStartedAt: number | null;
  refresh: () => void;
  /** Drops the stored history. The page offers it, because it is the visitor's data. */
  clearHistory: () => void;
}

/** Worst-first, so one failure decides the headline. */
function worstOf(checks: ServiceCheck[]): ServiceState {
  const visible = checks.filter((check) => check.state !== 'unmonitored');
  if (visible.some((check) => check.state === 'checking')) return 'checking';
  if (visible.some((check) => check.state === 'down')) return 'down';
  if (visible.some((check) => check.state === 'degraded')) return 'degraded';
  return 'operational';
}

interface Result {
  id: string;
  state: RecordedState;
  latencyMs: number;
  detail: string | null;
  failure: FailureExplanation | null;
}

export function useServiceHealth(pollMs: number = 60_000): ServiceHealth {
  const [results, setResults] = useState<Result[] | null>(null);
  const [history, setHistory] = useState<History>(() => loadHistory());
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  // Held in a ref so the polling effect doesn't restart every time a result
  // lands and changes the callback's identity.
  const runRef = useRef<(signal: AbortSignal) => Promise<void>>(null);

  const runAll = useCallback(async (signal: AbortSignal) => {
    setIsChecking(true);

    const round = await Promise.all(
      PROBES.map(async (probe): Promise<Result> => {
        const startedAt = performance.now();
        try {
          const detail = await probe.run(signal);
          const latencyMs = Math.round(performance.now() - startedAt);
          return {
            id: probe.id,
            state: latencyMs > DEGRADED_ABOVE_MS ? 'degraded' : 'operational',
            latencyMs,
            detail,
            failure: null,
          };
        } catch (error) {
          return {
            id: probe.id,
            state: 'down',
            // How long it took to fail is a real reading, and the difference
            // between failing in 20 ms and failing in 8 s is most of the
            // diagnosis: one is a refused connection, the other is a timeout.
            latencyMs: Math.round(performance.now() - startedAt),
            // The probe's OWN message, kept alongside the classification rather
            // than replaced by it. "Catalog returned no models" is the specific
            // fact; the classification is what it means. Dropping the first for
            // the second would lose the only part that says what actually
            // happened.
            detail: error instanceof Error ? error.message : 'Unreachable',
            failure: classifyFailure(error),
          };
        }
      })
    );

    if (signal.aborted) return;

    const at = Date.now();
    setResults(round);
    setLastCheckedAt(at);
    setIsChecking(false);
    setHistory((previous) => {
      const next = round.reduce(
        (accumulator, result) =>
          appendSample(
            accumulator,
            result.id,
            { at, state: result.state, latencyMs: result.latencyMs },
            at
          ),
        previous
      );
      saveHistory(next);
      return next;
    });
  }, []);

  runRef.current = runAll;

  const [refreshToken, setRefreshToken] = useState(0);
  const refresh = useCallback(() => setRefreshToken((n) => n + 1), []);

  const clearHistory = useCallback(() => {
    setHistory({});
    saveHistory({});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let timer: number | undefined;

    const start = () => {
      if (timer !== undefined) return;
      timer = window.setInterval(() => runRef.current?.(controller.signal), pollMs);
    };

    const stop = () => {
      if (timer === undefined) return;
      window.clearInterval(timer);
      timer = undefined;
    };

    // Polling stops while the tab is hidden, and this is not a micro-optimisation.
    //
    // Nobody is reading a status page they cannot see, and the catalog probe
    // pulls the whole model list - tens of kilobytes - every single minute. On
    // the metered mobile connections this product exists to serve, a
    // forgotten background tab quietly spending someone's data all afternoon
    // is a real cost, and it buys a chart nobody is looking at.
    //
    // Coming back runs a check immediately rather than waiting out the
    // interval: the first thing someone wants on returning is a current
    // reading, not a minute-old one.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        stop();
      } else {
        runRef.current?.(controller.signal);
        start();
      }
    };

    if (document.visibilityState !== 'hidden') {
      runRef.current?.(controller.signal);
      start();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      controller.abort();
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [pollMs, refreshToken]);

  const checks = useMemo<ServiceCheck[]>(() => {
    const byId = new Map(results?.map((result) => [result.id, result]));

    return [
      ...PROBES.map((probe): ServiceCheck => {
        const result = byId.get(probe.id);
        return {
          id: probe.id,
          name: probe.name,
          description: probe.description,
          state: result?.state ?? 'checking',
          latencyMs: result?.latencyMs ?? null,
          detail: result?.detail ?? null,
          failure: result?.failure ?? null,
          samples: history[probe.id] ?? [],
        };
      }),
      ...UNMONITORED.map((check) => ({ ...check, samples: [] })),
    ];
  }, [results, history]);

  const windowStartedAt = useMemo(() => {
    const firsts = Object.values(history)
      .map((samples) => samples[0]?.at)
      .filter((at): at is number => typeof at === 'number');
    return firsts.length > 0 ? Math.min(...firsts) : null;
  }, [history]);

  return {
    checks,
    overall: worstOf(checks),
    lastCheckedAt,
    isChecking,
    hasResults: results !== null,
    windowStartedAt,
    refresh,
    clearHistory,
  };
}
