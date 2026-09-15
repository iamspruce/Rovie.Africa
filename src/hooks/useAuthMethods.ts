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
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();

    async function load(attempt = 1) {
      try {
        const methods = await rovie.portal.getAuthMethods(controller.signal);
        if (active) {
          setData(methods);
          setError(null);
        }
      } catch (err: unknown) {
        if (!active || isAbortError(err)) return;
        // Backend cold-starts (scale-to-zero) can take several seconds to boot.
        // Automatically retry twice before displaying an error banner.
        if (attempt < 3) {
          timer = setTimeout(() => {
            if (active) void load(attempt + 1);
          }, 1500);
        } else {
          setError(err as Error);
        }
      }
    }

    void load();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return { data, error };
}
