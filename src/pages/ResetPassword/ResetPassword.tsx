import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout/AuthLayout';
import { Button } from '../../components/Button/Button';
import { Field, FormError, FormNotice } from '../../components/AuthForm/AuthForm';
import { messageForAuthError } from '../../lib/authErrors';
import { rovie } from '../../sdk';
import styles from './ResetPassword.module.scss';

const MIN_PASSWORD_LENGTH = 12; // matches portal-api's emailAndPassword.minPasswordLength

/**
 * Where the emailed reset link lands.
 *
 * portal-api checks the token before redirecting here, so this page arrives
 * already knowing the answer: `?token=` when it's good, `?error=INVALID_TOKEN`
 * when it's expired or spent. Both are handled before the form is drawn -
 * asking someone to type a new password twice and only then telling them the
 * link died an hour ago is the failure this page exists to avoid.
 *
 * A successful reset does not sign anyone in. portal-api revokes every
 * session when the password changes, so the honest next step is the sign-in
 * form, and that's where this sends them.
 */
export function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const token = params.get('token');
  const linkError = params.get('error');

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Long enough to read what happened, short enough that nobody wonders
  // whether the page has stalled. The link below it goes to the same place
  // for anyone who doesn't want to wait.
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => navigate('/signin', { replace: true }), 2500);
    return () => clearTimeout(timer);
  }, [done, navigate]);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirmation.length > 0 && confirmation !== password;
  const canSubmit =
    Boolean(token) && password.length >= MIN_PASSWORD_LENGTH && !mismatch && !submitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await rovie.portal.resetPassword({ newPassword: password, token });
      setDone(true);
    } catch (err) {
      setError(messageForAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  // No token means the link was expired, already used, or hand-typed. There
  // is nothing to fill in, so the page offers the one action that helps.
  if (!token || linkError) {
    return (
      <AuthLayout
        title="This link has expired"
        subtitle="Reset links last an hour and work once. Ask for a new one and it'll be in your inbox."
        footer={
          <>
            Remembered it? <Link to="/signin">Sign in</Link>
          </>
        }
      >
        <div className={styles.stack}>
          <FormError>That reset link has expired or was already used.</FormError>
          <Button onClick={() => navigate('/signin?reset=1')}>Request a new link</Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Pick something you haven't used elsewhere. This signs you out everywhere else."
      footer={
        <>
          Remembered it? <Link to="/signin">Sign in</Link>
        </>
      }
    >
      <div className={styles.stack}>
        {done ? (
          <>
            <FormNotice>
              Password changed. Every other device has been signed out — sign in again with your
              new password.
            </FormNotice>
            <Link className={styles.continue} to="/signin">
              Go to sign in
            </Link>
          </>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <Field
              label="New password"
              type="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
              error={tooShort ? `Use at least ${MIN_PASSWORD_LENGTH} characters.` : null}
              required
            />

            {/* Confirmation, because there's no "wrong password" to fall back
                on afterwards: a typo here locks the account out until another
                email is sent. */}
            <Field
              label="Confirm new password"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              error={mismatch ? 'These don’t match.' : null}
              required
            />

            {error && <FormError>{error}</FormError>}

            <Button type="submit" disabled={!canSubmit}>
              {submitting ? 'Saving…' : 'Set new password'}
            </Button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
