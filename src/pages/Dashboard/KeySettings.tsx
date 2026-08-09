import { useState } from 'react';
import { Button } from '../../components/Button/Button';
import { rovie } from '../../sdk';
import { RovieApiError } from '../../sdk/httpClient';
import type { ApiKeyLimits } from '../../sdk/portalService';
import { ErrorNote } from './DashboardUi';
import styles from './KeySettings.module.scss';

/**
 * The two restrictions a user can put on one of their own keys.
 *
 * Both only ever narrow it: a spend cap stops a runaway job from draining
 * the shared balance, and a model list stops a key reaching the expensive
 * models at all. Neither can widen access, which is why this needs no
 * confirmation step - the worst outcome is a key that does less.
 */
export function KeySettings({
  keyId,
  limits,
  servedModels,
  onSaved,
}: {
  keyId: string;
  limits: ApiKeyLimits | null;
  servedModels: string[];
  onSaved: () => void;
}) {
  const [capEnabled, setCapEnabled] = useState(limits?.maxBudgetUsd != null);
  const [cap, setCap] = useState(limits?.maxBudgetUsd != null ? String(limits.maxBudgetUsd) : '');
  const [selected, setSelected] = useState<string[]>(limits?.models ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleModel(model: string) {
    setSelected((current) =>
      current.includes(model) ? current.filter((entry) => entry !== model) : [...current, model]
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await rovie.portal.updateApiKey(keyId, {
        maxBudgetUsd: capEnabled ? Number(cap) : null,
        // An empty list is how the gateway spells "no restriction", so
        // clearing every checkbox removes the limit rather than creating a
        // key that can call nothing.
        models: selected,
      });
      onSaved();
    } catch (err) {
      const body = err instanceof RovieApiError ? (err.body as { error?: { message?: string } }) : null;
      setError(body?.error?.message ?? 'Could not save those settings. Try again shortly.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.panel}>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Spend cap</legend>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={capEnabled}
            onChange={(event) => setCapEnabled(event.target.checked)}
          />
          <span>Stop this key after a set amount</span>
        </label>
        {capEnabled && (
          <div className={styles.capRow}>
            <span className={styles.prefix}>$</span>
            <input
              type="number"
              className={styles.capInput}
              value={cap}
              min={1}
              step={1}
              onChange={(event) => setCap(event.target.value)}
              aria-label="Spend cap in US dollars"
            />
            <span className={styles.note}>Lifetime, not per month.</span>
          </div>
        )}
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Models</legend>
        <p className={styles.note}>
          {selected.length === 0
            ? 'This key can call every model.'
            : `This key can call ${selected.length} of ${servedModels.length} models.`}
        </p>
        <div className={styles.models}>
          {servedModels.map((model) => (
            <label key={model} className={styles.model}>
              <input
                type="checkbox"
                checked={selected.includes(model)}
                onChange={() => toggleModel(model)}
              />
              <span>{model}</span>
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <button type="button" className={styles.clear} onClick={() => setSelected([])}>
            Allow every model
          </button>
        )}
      </fieldset>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className={styles.actions}>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
}
