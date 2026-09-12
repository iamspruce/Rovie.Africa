import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button/Button';
import { FormError, FormNotice } from '../../components/AuthForm/AuthForm';
import { useAuth } from '../../context/AuthContext';
import { AFRICA_COUNTRIES, currencyForAlpha2 } from '../../lib/d3/africaCountries';
import { rovie } from '../../sdk';
import { RovieApiError } from '../../sdk/httpClient';
import { messageForAuthError } from '../../lib/authErrors';
import { Card } from './DashboardUi';
import { DeleteAccount } from './DeleteAccount';
import styles from './Account.module.scss';

const MIN_PASSWORD_LENGTH = 12; // matches portal-api's emailAndPassword.minPasswordLength

/**
 * Changing a known password, as opposed to recovering a forgotten one - that
 * lives on /signin, since someone who can't get in can't reach this page.
 *
 * The current password is required by portal-api and not just asked for
 * politely: a borrowed session must not be enough to lock the account's owner
 * out of it. An account that only ever signed in with Google or GitHub has no
 * password to change and is told so by the server, which is the one place
 * that actually knows.
 */
function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);

  const tooShort = next.length > 0 && next.length < MIN_PASSWORD_LENGTH;
  const canSubmit = Boolean(current) && next.length >= MIN_PASSWORD_LENGTH && !saving;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setChanged(false);
    try {
      await rovie.portal.changePassword({
        currentPassword: current,
        newPassword: next,
        // A password change is also how someone shuts out a device they've
        // lost. Keeping other sessions alive would defeat that.
        revokeOtherSessions: true,
      });
      setCurrent('');
      setNext('');
      setChanged(true);
    } catch (err) {
      setError(messageForAuthError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      title="Password"
      description="Changing it signs out every other device. This session stays."
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="account-current-password">
            Current password
          </label>
          <input
            id="account-current-password"
            className={styles.input}
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="account-new-password">
            New password
          </label>
          <input
            id="account-new-password"
            className={styles.input}
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            aria-invalid={tooShort ? true : undefined}
            required
          />
          <p className={styles.hint}>At least {MIN_PASSWORD_LENGTH} characters.</p>
        </div>

        {error && <FormError>{error}</FormError>}
        {changed && <FormNotice>Password changed.</FormNotice>}

        <div>
          <Button type="submit" disabled={!canSubmit}>
            {saving ? 'Changing…' : 'Change password'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function Account() {
  const navigate = useNavigate();
  const { user, applyMe, signOut } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [country, setCountry] = useState(user?.country ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Re-sync when the user record changes underneath the form (a refresh
  // elsewhere, or the very first load landing after this mounted).
  useEffect(() => {
    setName(user?.name ?? '');
    setCountry(user?.country ?? '');
  }, [user?.name, user?.country]);

  const sortedCountries = useMemo(
    () => [...AFRICA_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  const currency = currencyForAlpha2(country);
  const dirty = name !== (user?.name ?? '') || country !== (user?.country ?? '');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const me = await rovie.portal.updateMe({ name, country });
      applyMe(me);
      setSaved(true);
    } catch (err) {
      const body = err instanceof RovieApiError ? (err.body as { error?: { message?: string } }) : null;
      setError(body?.error?.message ?? 'Could not save your changes. Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate('/', { replace: true });
  }

  return (
    <>
      <Card title="Route profile" description="Your country decides which currency Route prices and credit are quoted in.">
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="account-name">
              Name
            </label>
            <input
              id="account-name"
              className={styles.input}
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              autoComplete="name"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="account-country">
              Country
            </label>
            <select
              id="account-country"
              className={styles.select}
              value={country}
              onChange={(event) => setCountry(event.target.value)}
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
            {currency && <p className={styles.hint}>Billed in {currency}.</p>}
          </div>

          {error && <FormError>{error}</FormError>}
          {saved && !dirty && <FormNotice>Saved.</FormNotice>}

          <div>
            <Button type="submit" disabled={saving || !dirty || !country}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Sign-in details" description="How you get into your Route account.">
        <dl className={styles.details}>
          <div className={styles.detailRow}>
            <dt className={styles.term}>Email</dt>
            <dd className={styles.value}>{user?.email ?? 'Not set'}</dd>
          </div>
          <div className={styles.detailRow}>
            <dt className={styles.term}>Email verified</dt>
            <dd className={styles.value}>
              {user?.emailVerified ? 'Yes' : 'Not yet — sign-in still works'}
            </dd>
          </div>
          <div className={styles.detailRow}>
            <dt className={styles.term}>Account ID</dt>
            <dd className={styles.value}>
              <code>{user?.id}</code>
            </dd>
          </div>
        </dl>
      </Card>

      <ChangePassword />

      <Card title="Sign out" description="Ends this session on this device. Your keys keep working.">
        <Button variant="secondary" onClick={handleSignOut}>
          Sign out
        </Button>
      </Card>

      {/* Last on the page on purpose - nothing to scroll past it into. */}
      <DeleteAccount />
    </>
  );
}
