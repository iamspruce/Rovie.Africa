// -----------------------------------------------------------------------
// Turning a failed probe into something a visitor can act on.
//
// The old page put `error.message` on screen. "Network request to
// https://api.getrovie.com/models failed: Failed to fetch" is true, and it
// tells a visitor nothing about whether the problem is ours, theirs, or
// somewhere in between - which is the only question they came to ask.
//
// So a failure is classified into one of five kinds, each of which has a
// genuinely different answer to "whose problem is this" and "what do I do
// now". The classification is the useful part; the wording is downstream of it.
// -----------------------------------------------------------------------

import { RovieApiError } from '../sdk';

export type FailureKind = 'unreachable' | 'timeout' | 'server' | 'client' | 'malformed';

export interface FailureExplanation {
  kind: FailureKind;
  /** Names the failure in the service row. A few words, no punctuation. */
  label: string;
  /** What actually happened, in one sentence. */
  meaning: string;
  /** Who is likely at fault, and what the visitor should do about it. */
  advice: string;
  /**
   * True when the fault is plausibly at the visitor's end. Drives the page's
   * "check your connection first" note - and it must never be true for a
   * failure we can prove is ours, or the page talks somebody out of reporting
   * a real outage.
   */
  couldBeLocal: boolean;
}

/** Thrown by a probe whose request succeeded but whose payload was unusable. */
export class MalformedResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MalformedResponseError';
  }
}

const EXPLANATIONS: Record<FailureKind, Omit<FailureExplanation, 'kind'>> = {
  unreachable: {
    label: 'Could not connect',
    meaning:
      'The request never got a reply. Nothing came back at all — not an error page, not a status code.',
    advice:
      'This is the one failure that looks identical from a service being down and from a connection that cannot reach it. If the other services below are green, the problem is almost certainly at our end; if they are all red, check your own network first.',
    couldBeLocal: true,
  },
  timeout: {
    label: 'Timed out',
    meaning:
      'The request was accepted but no answer arrived before the client gave up waiting.',
    advice:
      'Usually a service under load rather than one that is down — a retry often succeeds. On a slow connection this can also fire on a service that is working fine, so check whether everything below timed out or just this one.',
    couldBeLocal: true,
  },
  server: {
    label: 'Server error',
    meaning: 'The service answered, and the answer was that something broke on our side.',
    advice:
      'This one is ours. Nothing you can do from your end will help, and it is worth reporting if it lasts — we would rather hear about it twice than not at all.',
    couldBeLocal: false,
  },
  client: {
    label: 'Rejected the request',
    meaning:
      'The service answered and refused the request. These checks send no credentials, so this should not happen.',
    advice:
      'A rejection on an endpoint that needs no key usually means something in front of the service — a proxy, a firewall, a corporate network — is intercepting it rather than the service itself objecting.',
    couldBeLocal: true,
  },
  malformed: {
    label: 'Answered, but wrongly',
    meaning:
      'The service replied successfully and the reply was not usable — an empty catalog, no currencies, a body in the wrong shape.',
    advice:
      'The service is up, so an uptime monitor would call this green. It is not: anything depending on that data is broken. Definitely ours, and worth reporting.',
    couldBeLocal: false,
  },
};

/**
 * What kind of failure was that?
 *
 * Order matters. The specific, provable cases are tested first, and
 * `unreachable` is the fallback rather than a positive identification - a
 * rejection carrying no status is exactly what a DNS failure, a refused
 * connection, a CORS rejection and a service that is genuinely down all look
 * like from inside a browser. The explanation for that kind says so instead of
 * guessing between them.
 */
export function classifyFailure(error: unknown): FailureExplanation {
  const kind = kindOf(error);
  return { kind, ...EXPLANATIONS[kind] };
}

function kindOf(error: unknown): FailureKind {
  // The probe itself rejected a usable-looking response. Checked first: it is
  // the only kind that is not a transport failure at all.
  if (error instanceof MalformedResponseError) return 'malformed';

  // AbortSignal.timeout() rejects with a TimeoutError DOMException. The SDK's
  // httpClient wraps that (a timeout is a real failure, unlike a caller's own
  // abort), so it can arrive either way round.
  if (isTimeout(error)) return 'timeout';

  if (error instanceof RovieApiError && typeof error.status === 'number') {
    if (error.status >= 500) return 'server';
    if (error.status >= 400) return 'client';
  }

  return 'unreachable';
}

function isTimeout(error: unknown): boolean {
  // Read `name` off the object rather than gating on `instanceof Error`.
  // AbortSignal.timeout() rejects with a DOMException, which does not inherit
  // from Error in every environment this runs in - and even where it does,
  // `instanceof` is false for anything thrown across a realm boundary (an
  // iframe, a worker). The name is the reliable signal; the interface is not.
  const name = (error as { name?: unknown } | null)?.name;
  if (name === 'TimeoutError' || name === 'AbortError') return true;

  // RovieApiError stringifies the cause into its message rather than keeping
  // the original around, so this is the only way to recognise a wrapped one.
  return error instanceof RovieApiError && /timed? ?out/i.test(error.message);
}

/** The kinds that could be the visitor's end. Used for the page-level note. */
export function couldBeLocal(kinds: FailureKind[]): boolean {
  return kinds.length > 0 && kinds.every((kind) => EXPLANATIONS[kind].couldBeLocal);
}
