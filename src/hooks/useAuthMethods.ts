import { useEffect, useState } from 'react';
import { rovie } from '../sdk';
import { isAbortError } from '../sdk/httpClient';
import type { AuthMethods } from '../sdk/portalService';

/**
 * Which sign-in methods this deployment actually has configured.
 *
 * The Google button is drawn only when portal-api reports credentials are
 * present, so a self-hosted stack without a Google OAuth client never shows a
 * button that 500s on click. Until the answer arrives, nothing extra is
 * rendered - email and password are always available, so the form is usable
 * immediately rather than waiting on this.
 */
export function useAuthMethods() {
  const [data, setData] = useState<AuthMethods | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    rovie.portal
      .getAuthMethods(controller.signal)
      .then((methods) => setData(methods))
      .catch((err: unknown) => {
        if (!isAbortError(err)) setError(err as Error);
      });

    return () => controller.abort();
  }, []);

  return { data, error };
}
