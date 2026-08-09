import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button/Button';
import { FormError, FormNotice } from '../../components/AuthForm/AuthForm';
import { useAuth } from '../../context/AuthContext';
import { AFRICA_COUNTRIES, currencyForAlpha2 } from '../../lib/d3/africaCountries';
import { rovie } from '../../sdk';
import { RovieApiError } from '../../sdk/httpClient';
import { Card } from './DashboardUi';
import { DeleteAccount } from './DeleteAccount';
import styles from './Account.module.scss';

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
      <Card title="Profile" description="Your country decides which currency prices and balances are quoted in.">
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

      <Card title="Sign-in details" description="How you get into this account.">
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
