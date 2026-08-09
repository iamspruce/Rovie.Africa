import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout/AuthLayout';
import { Button } from '../../components/Button/Button';
import { Divider, Field, FormError, FormNotice, GoogleButton } from '../../components/AuthForm/AuthForm';
import { useAuth } from '../../context/AuthContext';
import { useAuthMethods } from '../../hooks/useAuthMethods';
import { rovie } from '../../sdk';
import { messageForAuthError } from '../../lib/authErrors';
import styles from './SignIn.module.scss';

type Mode = 'password' | 'link';

export function SignIn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isSignedIn, isLoading, refresh } = useAuth();
  const methods = useAuthMethods();

  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);

  // Where to land after signing in: back where they were sent from, or the
  // dashboard. Only same-origin paths are honoured, so `?next=` can't be used
  // to bounce someone to another site off the back of a Rovie sign-in.
  const rawNext = params.get('next');
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard';

  useEffect(() => {
    if (!isLoading && isSignedIn) navigate(next, { replace: true });
  }, [isLoading, isSignedIn, navigate, next]);

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await rovie.portal.signInWithEmail({ email: email.trim(), password });
      await refresh();
      navigate(next, { replace: true });
    } catch (err) {
      setError(messageForAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLinkSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await rovie.portal.sendMagicLink({
        email: email.trim(),
        callbackURL: `${window.location.origin}${next}`,
      });
      setLinkSent(true);
    } catch (err) {
      setError(messageForAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Your keys, balance and top-ups, in one place."
      footer={
        <>
          No account yet? <Link to="/signup">Create one</Link>
        </>
      }
    >
      <div className={styles.stack}>
        {methods.data?.google && (
          <>
            <GoogleButton
              disabled={submitting}
              onClick={() => {
                window.location.href = rovie.portal.googleSignInUrl(
                  `${window.location.origin}${next}`
                );
              }}
            />
            <Divider label="or" />
          </>
        )}

        {linkSent ? (
          <FormNotice>
            Check {email} for a sign-in link. It works once and expires in 15 minutes.
          </FormNotice>
        ) : (
          <form
            className={styles.form}
            onSubmit={mode === 'password' ? handlePasswordSubmit : handleLinkSubmit}
            noValidate
          >
            <Field
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            {mode === 'password' && (
              <Field
                label="Password"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            )}

            {error && <FormError>{error}</FormError>}

            <Button type="submit" disabled={submitting || !email.trim()}>
              {submitting
                ? mode === 'password'
                  ? 'Signing in…'
                  : 'Sending…'
                : mode === 'password'
                  ? 'Sign in'
                  : 'Email me a link'}
            </Button>

            {methods.data?.magicLink && (
              <button
                type="button"
                className={styles.switch}
                onClick={() => {
                  setMode(mode === 'password' ? 'link' : 'password');
                  setError(null);
                }}
              >
                {mode === 'password' ? 'Sign in with a link instead' : 'Use my password instead'}
              </button>
            )}
          </form>
        )}

        {methods.error && (
          <FormError>
            Can&apos;t reach Rovie right now. Check that portal-api is running, then try again.
          </FormError>
        )}
      </div>
    </AuthLayout>
  );
}
