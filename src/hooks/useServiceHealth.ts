import { useCallback, useEffect, useRef, useState } from 'react';
import { rovie } from '../sdk';

export type ServiceState = 'operational' | 'degraded' | 'down' | 'unmonitored' | 'checking';

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
}

/**
 * A probe that reaches a service and reports how it went. Each one is a real,
 * unauthenticated request the site already relies on - nothing synthetic, and
 * nothing that costs the visitor anything.
 */
interface Probe {
  id: string;
  name: string;
  description: string;
  run: (signal: AbortSignal) => Promise<string | null>;
}

// Anything slower than this is up, but not well. Chosen to be forgiving of
// the connections a lot of this audience is on - it should flag a struggling
// service, not a slow phone.
const DEGRADED_ABOVE_MS = 2500;

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
        throw new Error(`Reported ${result.status}`);
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
      if (count === 0) throw new Error('Catalog returned no models');
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
      if (supported === 0) throw new Error('No currencies returned');
      return `${supported} currencies quoted`;
    },
  },
];

// The Payment Service has no unauthenticated endpoint to probe - initiating a
// payment is a POST that charges someone. Saying so is better than showing a
// green light we didn't earn.
const UNMONITORED: ServiceCheck[] = [
  {
    id: 'payments',
    name: 'Top-ups',
    description: 'Payment initiation and settlement through IvoryPay.',
    state: 'unmonitored',
    latencyMs: null,
    detail: 'No public health endpoint to check from the browser.',
  },
];

function initialChecks(): ServiceCheck[] {
  return [
    ...PROBES.map((probe) => ({
      id: probe.id,
      name: probe.name,
      description: probe.description,
      state: 'checking' as ServiceState,
      latencyMs: null,
      detail: null,
    })),
    ...UNMONITORED,
  ];
}

export interface ServiceHealth {
  checks: ServiceCheck[];
  /** The worst state among the services we can actually see. */
  overall: ServiceState;
  lastCheckedAt: number | null;
  isChecking: boolean;
  refresh: () => void;
}

/** Worst-first, so one failure decides the headline. */
function worstOf(checks: ServiceCheck[]): ServiceState {
  const visible = checks.filter((check) => check.state !== 'unmonitored');
  if (visible.some((check) => check.state === 'checking')) return 'checking';
  if (visible.some((check) => check.state === 'down')) return 'down';
  if (visible.some((check) => check.state === 'degraded')) return 'degraded';
  return 'operational';
}

export function useServiceHealth(pollMs: number = 60_000): ServiceHealth {
  const [checks, setChecks] = useState<ServiceCheck[]>(initialChecks);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  // Held in a ref so the polling effect doesn't restart every time a result
  // lands and changes the callback's identity.
  const runRef = useRef<(signal: AbortSignal) => Promise<void>>(null);

  const runAll = useCallback(async (signal: AbortSignal) => {
    setIsChecking(true);

    const results = await Promise.all(
      PROBES.map(async (probe): Promise<ServiceCheck> => {
        const startedAt = performance.now();
        try {
          const detail = await probe.run(signal);
          const latencyMs = Math.round(performance.now() - startedAt);
          return {
            id: probe.id,
            name: probe.name,
            description: probe.description,
            state: latencyMs > DEGRADED_ABOVE_MS ? 'degraded' : 'operational',
            latencyMs,
            detail,
          };
        } catch (error) {
          return {
            id: probe.id,
            name: probe.name,
            description: probe.description,
            state: 'down',
            latencyMs: Math.round(performance.now() - startedAt),
            detail: error instanceof Error ? error.message : 'Unreachable',
          };
        }
      })
    );

    if (signal.aborted) return;
    setChecks([...results, ...UNMONITORED]);
    setLastCheckedAt(Date.now());
    setIsChecking(false);
  }, []);

  runRef.current = runAll;

  const [refreshToken, setRefreshToken] = useState(0);
  const refresh = useCallback(() => setRefreshToken((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    runRef.current?.(controller.signal);

    const timer = window.setInterval(() => {
      runRef.current?.(controller.signal);
    }, pollMs);

    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [pollMs, refreshToken]);

  return {
    checks,
    overall: worstOf(checks),
    lastCheckedAt,
    isChecking,
    refresh,
  };
}
