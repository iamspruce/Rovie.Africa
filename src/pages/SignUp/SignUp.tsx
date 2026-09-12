import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout/AuthLayout';
import { Button } from '../../components/Button/Button';
import { Field, FormError, FormNotice, SocialAuth } from '../../components/AuthForm/AuthForm';
import { useAuth } from '../../context/AuthContext';
import { useAuthMethods } from '../../hooks/useAuthMethods';
import { useVisitorCountry } from '../../hooks/useVisitorCountry';
import { AFRICA_COUNTRIES, currencyForAlpha2 } from '../../lib/d3/africaCountries';
import { messageForAuthError } from '../../lib/authErrors';
import { rovie } from '../../sdk';
import styles from './SignUp.module.scss';

const MIN_PASSWORD_LENGTH = 12; // matches portal-api's emailAndPassword.minPasswordLength

export function SignUp() {
  const navigate = useNavigate();
  const { isSignedIn, isLoading, refresh } = useAuth();
  const methods = useAuthMethods();
  const { country: detected } = useVisitorCountry();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('');
  const [touchedCountry, setTouchedCountry] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);

  useEffect(() => {
    if (!isLoading && isSignedIn) navigate('/dashboard', { replace: true });
  }, [isLoading, isSignedIn, navigate]);

  // Pre-fill from the IP lookup, but stop the moment the user touches the
  // field - re-applying detection over a deliberate choice is the bug that
  // makes country pickers infuriating.
  useEffect(() => {
    if (detected && !touchedCountry) setCountry(detected.alpha2);
  }, [detected, touchedCountry]);

  const sortedCountries = useMemo(
    () => [...AFRICA_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  const currency = currencyForAlpha2(country);
  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const canSubmit =
    Boolean(email.trim()) && password.length >= MIN_PASSWORD_LENGTH && Boolean(country) && !submitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await rovie.portal.signUpWithEmail({
        email: email.trim(),
        password,
        name: name.trim(),
        country,
      });
      await refresh();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(messageForAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMagicLink() {
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await rovie.portal.sendMagicLink({
        email: email.trim(),
        callbackURL: `${window.location.origin}/dashboard`,
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
      title="Create your Route account"
      subtitle="Get an API key, top up in your own currency, and call every model through one endpoint."
      footer={
        <>
          Already have an account? <Link to="/signin">Sign in</Link>
        </>
      }
    >
      <div className={styles.stack}>
        <SocialAuth
          methods={methods.data}
          callbackURL={`${window.location.origin}/dashboard`}
          disabled={submitting}
        />

        {linkSent ? (
          <FormNotice>
            Check {email} for a sign-in link. It works once and expires in 15 minutes. You&apos;ll
            pick your country once you&apos;re in.
          </FormNotice>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <Field
              label="Name"
              type="text"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              hint="Optional. Shown on your dashboard."
            />

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

            <Field
              label="Password"
              type="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
              error={passwordTooShort ? `Use at least ${MIN_PASSWORD_LENGTH} characters.` : null}
              required
            />

            {/* A plain <select> for the same reason CountrySelect uses one:
                54 options with names to type, and every platform already
                ships a good one. */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="signup-country">
                Country
              </label>
              <select
                id="signup-country"
                className={styles.select}
                value={country}
                onChange={(event) => {
                  setTouchedCountry(true);
                  setCountry(event.target.value);
                }}
                required
              >
                <option value="" disabled>
                  Select your country
                </option>
                {sortedCountries.map((entry) => (
                  <option key={entry.alpha2} value={entry.alpha2}>
                    {entry.name}
                  </option>
                ))}
              </select>
              <p className={styles.hint}>
                {currency
                  ? `Sets the currency you're billed in — ${currency}. You can change it later.`
                  : 'Sets the currency you’re billed in. You can change it later.'}
              </p>
            </div>

            {error && <FormError>{error}</FormError>}

            <Button type="submit" disabled={!canSubmit}>
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>

            {methods.data?.magicLink && (
              <button
                type="button"
                className={styles.switch}
                onClick={handleMagicLink}
                disabled={submitting}
              >
                Email me a link instead
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
