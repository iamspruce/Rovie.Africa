import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/Button/Button';
import { useAuth } from '../../context/AuthContext';
import { useAccountMoney } from '../../hooks/useAccountMoney';
import { useModels } from '../../hooks/useModels';
import { rovie } from '../../sdk';
import { isAbortError, RovieApiError } from '../../sdk/httpClient';
import type { ApiKeySummary } from '../../sdk/portalService';
import { formatCompactNumber } from '../../lib/rankings';
import { Card, Empty, ErrorNote, Pending, Tag } from './DashboardUi';
import { RevealedKey } from './RevealedKey';
import { KeySettings } from './KeySettings';
import styles from './ApiKeys.module.scss';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** "3 hours ago", "yesterday" — precise enough to spot a key still in use. */
function formatRelative(iso: string | null): string {
  if (!iso) return 'Never used';
  const elapsedMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(elapsedMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export function ApiKeys() {
  const { needsCountry } = useAuth();
  const { money } = useAccountMoney();
  const { data: modelsData } = useModels();
  const [keys, setKeys] = useState<ApiKeySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [busyKeyId, setBusyKeyId] = useState<string | null>(null);
  const [openSettingsId, setOpenSettingsId] = useState<string | null>(null);

  // The one and only time a full key exists in the browser. Held in component
  // state, never written to storage - it's gone on navigation, which is what
  // "shown once" has to mean to be worth saying.
  const [revealed, setRevealed] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const { keys: list } = await rovie.portal.listApiKeys(signal);
      setKeys(list);
      setError(null);
    } catch (err) {
      if (isAbortError(err)) return;
      setError('Could not load your keys. Refresh to try again.');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function messageFor(err: unknown, fallback: string): string {
    const body = err instanceof RovieApiError ? (err.body as { error?: { message?: string } }) : null;
    return body?.error?.message ?? fallback;
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const { apiKey } = await rovie.portal.createApiKey(label.trim() || undefined);
      setRevealed(apiKey);
      setLabel('');
      await load();
    } catch (err) {
      // portal-api's 409s (no country, key limit) carry a message that tells
      // the user exactly what to do, so prefer it over anything generic.
      setError(messageFor(err, 'Could not create a key. Try again shortly.'));
    } finally {
      setCreating(false);
    }
  }

  async function handleRotate(key: ApiKeySummary) {
    const confirmed = window.confirm(
      `Rotate ${key.keyPrefix}…? A new key replaces it immediately and the old one stops working. You'll see the new key once.`
    );
    if (!confirmed) return;

    setBusyKeyId(key.id);
    setError(null);
    try {
      const { apiKey } = await rovie.portal.rotateApiKey(key.id);
      setRevealed(apiKey);
      await load();
    } catch (err) {
      setError(messageFor(err, 'Could not rotate that key. Try again shortly.'));
    } finally {
      setBusyKeyId(null);
    }
  }

  async function handleRevoke(key: ApiKeySummary) {
    const confirmed = window.confirm(
      `Revoke ${key.keyPrefix}…? Anything using this key stops working immediately. This can't be undone.`
    );
    if (!confirmed) return;

    setBusyKeyId(key.id);
    setError(null);
    try {
      await rovie.portal.revokeApiKey(key.id);
      await load();
    } catch (err) {
      setError(messageFor(err, 'Could not revoke that key. Try again shortly.'));
    } finally {
      setBusyKeyId(null);
    }
  }

  const active = keys?.filter((key) => !key.revokedAt) ?? [];
  const revoked = keys?.filter((key) => key.revokedAt) ?? [];
  const servedModels = (modelsData?.models ?? []).map((model) => model.litellmModelName);

  return (
    <>
      {revealed && <RevealedKey apiKey={revealed} onDismiss={() => setRevealed(null)} />}

      <Card
        title="Create a Route API key"
        description="Every Route key spends from the same credit balance. Revoking one doesn't strand credit."
      >
        <form className={styles.createForm} onSubmit={handleCreate}>
          <label className={styles.labelField}>
            <span className={styles.labelText}>Label</span>
            <input
              type="text"
              className={styles.input}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Laptop, CI, side project…"
              maxLength={60}
              disabled={creating || needsCountry}
            />
          </label>
          <Button type="submit" disabled={creating || needsCountry}>
            {creating ? 'Creating…' : 'Create key'}
          </Button>
        </form>

        {needsCountry && (
          <p className={styles.blocked}>
            Set your country first — it decides the currency your balance is quoted in.{' '}
            <Link to="/dashboard/account">Set it now</Link>
          </p>
        )}

        {error && <ErrorNote>{error}</ErrorNote>}
      </Card>

      <Card title="Your Route API keys" description="Spend shown covers the last 30 days.">
        {keys === null && !error && <Pending label="Loading your keys…" />}

        {keys !== null && active.length === 0 && revoked.length === 0 && (
          <Empty>
            No keys yet. Create one above, then paste it into OpenCode, Continue, Cline or any
            OpenAI-compatible client.
          </Empty>
        )}

        {(active.length > 0 || revoked.length > 0) && (
          <ul className={styles.keyList}>
            {[...active, ...revoked].map((key) => {
              const isBusy = busyKeyId === key.id;
              const capped = key.limits?.maxBudgetUsd ?? null;
              const restricted = (key.limits?.models.length ?? 0) > 0;

              return (
                <li key={key.id} className={key.revokedAt ? styles.keyRevoked : styles.key}>
                  <div className={styles.keyMain}>
                    <div className={styles.keyIdentity}>
                      <code className={styles.keyPrefix}>{key.keyPrefix}…</code>
                      <span className={styles.keyLabel}>{key.label || 'No label'}</span>
                    </div>

                    <div className={styles.keyTags}>
                      {key.revokedAt ? (
                        <Tag tone="muted">Revoked {formatDate(key.revokedAt)}</Tag>
                      ) : (
                        <>
                          {/* Blocked but not revoked means the gateway is
                              refusing it for a reason we didn't set here —
                              it would otherwise look perfectly healthy. */}
                          {key.limits?.blocked && <Tag tone="danger">Blocked</Tag>}
                          {key.limits?.expiresAt && (
                            <Tag tone="muted">Expires {formatDate(key.limits.expiresAt)}</Tag>
                          )}
                          {capped !== null && <Tag tone="neutral">Cap ${capped}</Tag>}
                          {restricted && (
                            <Tag tone="neutral">{key.limits!.models.length} models</Tag>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {!key.revokedAt && (
                    <dl className={styles.keyStats}>
                      <div>
                        <dt>Spent</dt>
                        <dd>{key.usage ? money(key.usage.spendUsd) : '—'}</dd>
                      </div>
                      <div>
                        <dt>Requests</dt>
                        <dd>{key.usage ? key.usage.requests.toLocaleString() : '—'}</dd>
                      </div>
                      <div>
                        <dt>Tokens</dt>
                        <dd>{key.usage ? formatCompactNumber(key.usage.tokens) : '—'}</dd>
                      </div>
                      <div>
                        <dt>Last used</dt>
                        <dd>{key.usage ? formatRelative(key.usage.lastUsedAt) : '—'}</dd>
                      </div>
                    </dl>
                  )}

                  <div className={styles.keyActions}>
                    <span className={styles.created}>Created {formatDate(key.createdAt)}</span>

                    {!key.revokedAt && (
                      <div className={styles.buttons}>
                        <button
                          type="button"
                          className={styles.action}
                          aria-expanded={openSettingsId === key.id}
                          onClick={() =>
                            setOpenSettingsId((current) => (current === key.id ? null : key.id))
                          }
                        >
                          {openSettingsId === key.id ? 'Close' : 'Settings'}
                        </button>
                        <button
                          type="button"
                          className={styles.action}
                          onClick={() => handleRotate(key)}
                          disabled={isBusy}
                        >
                          {isBusy ? 'Working…' : 'Rotate'}
                        </button>
                        <button
                          type="button"
                          className={styles.revoke}
                          onClick={() => handleRevoke(key)}
                          disabled={isBusy}
                        >
                          Revoke
                        </button>
                      </div>
                    )}
                  </div>

                  {openSettingsId === key.id && !key.revokedAt && (
                    <KeySettings
                      keyId={key.id}
                      limits={key.limits}
                      servedModels={servedModels}
                      onSaved={() => {
                        setOpenSettingsId(null);
                        void load();
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
