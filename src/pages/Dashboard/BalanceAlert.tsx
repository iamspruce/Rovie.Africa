import { useState } from 'react';
import { Button } from '../../components/Button/Button';
import { useAuth } from '../../context/AuthContext';
import { useAccountMoney } from '../../hooks/useAccountMoney';
import { rovie } from '../../sdk';
import { RovieApiError } from '../../sdk/httpClient';
import { Card, ErrorNote, FormNotice } from './DashboardUi';
import styles from './BalanceAlert.module.scss';

/** Offered thresholds, in USD. Round numbers people can reason about. */
const PRESETS = [1, 5, 10, 25];

/**
 * Opt-in email when the balance runs low.
 *
 * The gateway stops a request dead the moment credit reaches zero, so
 * without this the first sign of an empty wallet is an agent failing
 * mid-session. Off by default - an unrequested email about money is worse
 * than no email.
 */
export function BalanceAlert() {
  const { user, applyMe } = useAuth();
  const { money } = useAccountMoney();
  const current = user?.lowBalanceThresholdUsd ?? null;

  const [enabled, setEnabled] = useState(current !== null);
  const [threshold, setThreshold] = useState(current ?? PRESETS[1]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = enabled !== (current !== null) || (enabled && threshold !== current);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const me = await rovie.portal.updateMe({
        lowBalanceThresholdUsd: enabled ? threshold : null,
      });
      applyMe(me);
      setSaved(true);
    } catch (err) {
      const body = err instanceof RovieApiError ? (err.body as { error?: { message?: string } }) : null;
      setError(body?.error?.message ?? 'Could not save that. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Low balance email" description="We'll email you once each time your credit falls this low.">
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        <span>Email me before I run out</span>
      </label>

      {enabled && (
        <div className={styles.choices} role="group" aria-label="Alert threshold">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={preset === threshold ? styles.choiceActive : styles.choice}
              aria-pressed={preset === threshold}
              onClick={() => setThreshold(preset)}
            >
              {money(preset)}
            </button>
          ))}
        </div>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}
      {saved && !dirty && <FormNotice>Saved.</FormNotice>}

      <div className={styles.actions}>
        <Button type="button" onClick={save} disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Card>
  );
}
