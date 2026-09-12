import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout/AuthLayout';
import { Button } from '../../components/Button/Button';
import { Field, FormError, FormNotice, SocialAuth } from '../../components/AuthForm/AuthForm';
import { useAuth } from '../../context/AuthContext';
import { useAuthMethods } from '../../hooks/useAuthMethods';
import { rovie } from '../../sdk';
import { messageForAuthError } from '../../lib/authErrors';
import styles from './SignIn.module.scss';

/**
 * All three states are the same form with a different verb, which is why they
 * share one page rather than each getting a route: the email field keeps
 * whatever was typed as you move between them, and someone who mistypes a
 * password doesn't have to retype their address to ask for a reset.
 */
type Mode = 'password' | 'link' | 'reset';

const HEADINGS: Record<Mode, { title: string; subtitle: string }> = {
  password: { title: 'Sign in to Route', subtitle: 'Your keys, balance and top-ups, in one place.' },
  link: { title: 'Sign in to Route', subtitle: 'Your keys, balance and top-ups, in one place.' },
  reset: {
    title: 'Reset your password',
    subtitle: 'We’ll email you a link to set a new one. It lasts an hour and works once.',
  },
};

export function SignIn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isSignedIn, isLoading, refresh } = useAuth();
  const methods = useAuthMethods();

  // `?reset=1` is how the expired-link page hands someone back here to ask
  // for a fresh email, landing them on the right form rather than on a
  // sign-in they already know they can't complete.
  const [mode, setMode] = useState<Mode>(params.get('reset') === '1' ? 'reset' : 'password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

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

  async function handleResetSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await rovie.portal.requestPasswordReset({
        email: email.trim(),
        // Not `next`: a reset ends at a form for setting a password, and
        // portal-api revokes every session when it lands, so there's no
        // session to carry anyone onward to where they were headed.
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setResetSent(true);
    } catch (err) {
      setError(messageForAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const SUBMIT_HANDLERS: Record<Mode, (event: React.FormEvent) => Promise<void>> = {
    password: handlePasswordSubmit,
    link: handleLinkSubmit,
    reset: handleResetSubmit,
  };

  const SUBMIT_LABELS: Record<Mode, { idle: string; busy: string }> = {
    password: { idle: 'Sign in', busy: 'Signing in…' },
    link: { idle: 'Email me a link', busy: 'Sending…' },
    reset: { idle: 'Email me a reset link', busy: 'Sending…' },
  };

  const heading = HEADINGS[mode];
  const label = SUBMIT_LABELS[mode];

  function switchTo(target: Mode) {
    setMode(target);
    setError(null);
  }

  return (
    <AuthLayout
      title={heading.title}
      subtitle={heading.subtitle}
      footer={
        <>
          No account yet? <Link to="/signup">Create one</Link>
        </>
      }
    >
      <div className={styles.stack}>
        {/* Not offered while resetting: at that moment the visitor has said
            they want their password back, and a Google button is an answer to
            a different question. */}
        {mode !== 'reset' && (
          <SocialAuth
            methods={methods.data}
            callbackURL={`${window.location.origin}${next}`}
            disabled={submitting}
          />
        )}

        {linkSent ? (
          <FormNotice>
            Check {email} for a sign-in link. It works once and expires in 15 minutes.
          </FormNotice>
        ) : resetSent ? (
          <>
            {/* Deliberately "if there's an account": portal-api answers the
                same way either way so this form can't be used to find out
                which addresses are registered, and the copy must not give
                away what the API withholds. */}
            <FormNotice>
              If there’s an account for {email}, a reset link is on its way. It expires in an hour
              and works once.
            </FormNotice>
            <button type="button" className={styles.switch} onClick={() => switchTo('password')}>
              Back to sign in
            </button>
          </>
        ) : (
          <form className={styles.form} onSubmit={SUBMIT_HANDLERS[mode]} noValidate>
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
              {submitting ? label.busy : label.idle}
            </Button>

            {/* The alternatives, as text buttons rather than a second call to
                action: the button above is the offer, these only change how
                you prove who you are. */}
            <div className={styles.alternatives}>
              {mode === 'password' && (
                <button
                  type="button"
                  className={styles.switch}
                  onClick={() => switchTo('reset')}
                >
                  Forgot your password?
                </button>
              )}

              {mode === 'reset' && (
                <button
                  type="button"
                  className={styles.switch}
                  onClick={() => switchTo('password')}
                >
                  Back to sign in
                </button>
              )}

              {methods.data?.magicLink && mode !== 'reset' && (
                <button
                  type="button"
                  className={styles.switch}
                  onClick={() => switchTo(mode === 'password' ? 'link' : 'password')}
                >
                  {mode === 'password' ? 'Sign in with a link instead' : 'Use my password instead'}
                </button>
              )}
            </div>
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
