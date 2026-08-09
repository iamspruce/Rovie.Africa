import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { rovie } from '../sdk';
import type { MeResponse, PortalUser } from '../sdk/portalService';

/**
 * Who is signed in, backed by the portal-api session cookie.
 *
 * This replaced an earlier version that treated "has an API key in
 * localStorage" as being signed in. That had no way to tell a real user from
 * anyone who had seen a key, and it kept a live spending credential in
 * storage that any script on the page could read. The cookie is HttpOnly and
 * never visible to JavaScript, so there is deliberately no token in this
 * context to hand around - components ask the server instead.
 */

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  user: PortalUser | null;
  status: Status;
  isSignedIn: boolean;
  /** True until the first session check finishes. Guards must wait for this. */
  isLoading: boolean;
  /** Google and magic-link signups arrive with no country set. */
  needsCountry: boolean;
  /** portal-api unreachable, as opposed to signed out. */
  error: Error | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Applies a fresh /me payload after the user edits their profile. */
  applyMe: (me: MeResponse) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [needsCountry, setNeedsCountry] = useState(false);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      const me = await rovie.portal.getMe();
      setError(null);
      if (me) {
        setUser(me.user);
        setNeedsCountry(me.needsCountry);
        setStatus('authenticated');
      } else {
        setUser(null);
        setNeedsCountry(false);
        setStatus('anonymous');
      }
    } catch (err) {
      // getMe() already turns a 401 into null, so reaching here means the
      // service is unreachable or broken. Report that as itself rather than
      // as "signed out", which would bounce a signed-in user to /signin
      // every time portal-api restarts.
      setError(err as Error);
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await rovie.portal.signOut();
    } finally {
      // Clear locally even if the request failed. The cookie may well be
      // gone; leaving the UI claiming otherwise is the worse outcome.
      setUser(null);
      setNeedsCountry(false);
      setStatus('anonymous');
    }
  }, []);

  const applyMe = useCallback((me: MeResponse) => {
    setUser(me.user);
    setNeedsCountry(me.needsCountry);
    setStatus('authenticated');
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isSignedIn: status === 'authenticated',
      isLoading: status === 'loading',
      needsCountry,
      error,
      refresh,
      signOut,
      applyMe,
    }),
    [user, status, needsCountry, error, refresh, signOut, applyMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
