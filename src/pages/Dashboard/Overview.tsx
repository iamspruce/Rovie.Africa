import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/Button/Button';
import { usePortalBalance } from '../../hooks/usePortalBalance';
import { useUsage } from '../../hooks/useUsage';
import { useAccountMoney } from '../../hooks/useAccountMoney';
import { formatCurrency, formatUsd } from '../../lib/currency';
import { formatCompactNumber } from '../../lib/rankings';
import { rovie } from '../../sdk';
import { isAbortError } from '../../sdk/httpClient';
import type { ApiKeySummary } from '../../sdk/portalService';
import { config } from '../../sdk/config';
import { Card, CopyField, ErrorNote, Meter, Stat, StatRow } from './DashboardUi';
import styles from './Overview.module.scss';

/** Below this share of what's been topped up, the meter starts warning. */
const WARN_AT_PERCENT = 25;
const DANGER_AT_PERCENT = 10;

export function Overview() {
  const balance = usePortalBalance();
  const { money } = useAccountMoney();
  const usage = useUsage(7);

  const [keys, setKeys] = useState<ApiKeySummary[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    rovie.portal
      .listApiKeys(controller.signal)
      .then(({ keys: list }) => setKeys(list))
      .catch((err: unknown) => {
        // The balance and the connection details are the point of this
        // screen; a key list that didn't load must not take them down.
        if (!isAbortError(err)) setKeys([]);
      });
    return () => controller.abort();
  }, []);

  const activeKeys = useMemo(() => (keys ?? []).filter((key) => !key.revokedAt), [keys]);
  const firstActive = activeKeys[0];

  const localCurrency = balance.data?.localCurrency;
  const quotedInUsd = !localCurrency || localCurrency === 'USD';
  const amount = (usd: number, local: number) =>
    quotedInUsd ? formatUsd(usd) : formatCurrency(local, localCurrency!);

  // What's left as a share of what's been bought. Not a share of any cap:
  // credit is prepaid, so "topped up" is the only meaningful denominator.
  const remainingPercent =
    balance.data && balance.data.maxBudgetUsd > 0
      ? (balance.data.availableUsd / balance.data.maxBudgetUsd) * 100
      : 0;
  const tone =
    remainingPercent <= DANGER_AT_PERCENT
      ? 'danger'
      : remainingPercent <= WARN_AT_PERCENT
        ? 'warning'
        : 'normal';

  const isEmpty = (balance.data?.availableUsd ?? 0) <= 0;
  const isLow = !isEmpty && balance.data !== null && remainingPercent <= WARN_AT_PERCENT;

  // The gateway enforces per-key limits, so any active key answers "what
  // applies to me" — they are issued identically.
  const limits = activeKeys.find((key) => key.limits)?.limits ?? null;

  return (
    <>
      {isEmpty && balance.data && (
        <p className={styles.alert} role="status">
          Your balance is empty — requests are being refused.{' '}
          <Link to="/dashboard/billing">Top up</Link>
        </p>
      )}
      {isLow && (
        <p className={styles.warn} role="status">
          Balance running low. Requests stop at zero.{' '}
          <Link to="/dashboard/billing">Top up</Link>
        </p>
      )}

      <Card
        title="Balance"
        action={
          <Button as={Link} to="/dashboard/billing" variant="secondary">
            Top up
          </Button>
        }
      >
        {balance.error ? (
          <ErrorNote>{balance.error}</ErrorNote>
        ) : (
          <>
            <StatRow>
              {/* The user's own currency is the headline figure and dollars
                  the footnote - quoting people in their own money is the
                  product. Falls back to dollars only when no rate exists,
                  and says so rather than mislabelling them. */}
              <Stat
                label="Available"
                value={balance.data ? amount(balance.data.availableUsd, balance.data.availableLocal) : '—'}
                note={balance.data && !quotedInUsd ? formatUsd(balance.data.availableUsd) : undefined}
              />
              <Stat
                label="Spent"
                value={balance.data ? amount(balance.data.spendUsd, balance.data.spendLocal) : '—'}
                note="All keys"
              />
              <Stat
                label="Last 7 days"
                value={usage.data?.totals ? money(usage.data.totals.spendUsd) : '—'}
                note={
                  usage.data?.totals && usage.data.totals.requests > 0
                    ? `${usage.data.totals.requests.toLocaleString()} requests`
                    : undefined
                }
              />
              <Stat
                label="Active keys"
                value={keys === null ? '—' : String(activeKeys.length)}
                note={keys !== null && activeKeys.length === 0 ? 'Create one to start' : undefined}
              />
            </StatRow>

            {balance.data && balance.data.maxBudgetUsd > 0 && (
              <div className={styles.meter}>
                <Meter
                  percent={remainingPercent}
                  tone={tone}
                  label="Credit remaining"
                  value={`${Math.max(0, Math.round(remainingPercent))}% of ${amount(
                    balance.data.maxBudgetUsd,
                    balance.data.maxBudgetLocal
                  )}`}
                />
              </div>
            )}
          </>
        )}
      </Card>

      <Card
        title="Connect to Rovie Route"
        description="Rovie Route uses the OpenAI API format. Point any compatible client here and change nothing else."
        action={
          <Button as={Link} to="/dashboard/keys" variant="secondary">
            Manage keys
          </Button>
        }
      >
        <div className={styles.connect}>
          <CopyField label="Base URL" value={`${config.litellmUrl.replace(/\/+$/, '')}/v1`} />
          <CopyField
            label="Model"
            value={usage.data?.models[0]?.model ?? 'claude-sonnet-5'}
          />
          <CopyField
            label="Test it"
            multiline
            value={curlExample(config.litellmUrl, usage.data?.models[0]?.model ?? 'claude-sonnet-5')}
          />
        </div>

        <p className={styles.hint}>
          {firstActive ? (
            <>
              Use the key you saved when you created it. Lost it?{' '}
              <Link to="/dashboard/keys">Rotate the key</Link> to get a new one.
            </>
          ) : (
            <Link to="/dashboard/keys">Create your first key</Link>
          )}{' '}
          · <Link to="/models">Browse models and rates</Link>
        </p>
      </Card>

      <Card title="Limits">
        <StatRow>
          <Stat
            label="Requests / minute"
            value={limits?.rpmLimit ? limits.rpmLimit.toLocaleString() : 'Unlimited'}
          />
          <Stat
            label="Tokens / minute"
            value={limits?.tpmLimit ? formatCompactNumber(limits.tpmLimit) : 'Unlimited'}
          />
          <Stat
            label="Concurrent requests"
            value={
              limits?.maxParallelRequests ? limits.maxParallelRequests.toLocaleString() : 'Unlimited'
            }
          />
          <Stat label="Models" value={limits && limits.models.length > 0 ? String(limits.models.length) : 'All'} />
        </StatRow>
      </Card>
    </>
  );
}

/** The shortest request that proves the key, the URL and the model all work. */
function curlExample(baseUrl: string, model: string): string {
  return [
    `curl ${baseUrl.replace(/\/+$/, '')}/v1/chat/completions \\`,
    `  -H "Authorization: Bearer $ROVIE_API_KEY" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"model":"${model}","messages":[{"role":"user","content":"hello"}]}'`,
  ].join('\n');
}
