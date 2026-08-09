import { useId, useMemo, useState } from 'react';
import { useUsage } from '../../hooks/useUsage';
import { useAccountMoney } from '../../hooks/useAccountMoney';
import { TrendChart } from '../../components/viz/TrendChart';
import { RankedBars } from '../../components/viz/RankedBars';
import { categoricalAt } from '../../lib/viz/palette';
import { MAX_COLOURED_SERIES, formatCompactNumber, formatDuration, toRankedRows } from '../../lib/rankings';
import { Card, Empty, ErrorNote, Pending, Stat, StatRow, WindowPicker } from './DashboardUi';
import { Activity } from './Activity';
import { rovie } from '../../sdk';
import styles from './Usage.module.scss';

/** Past this, the tail folds into "Other" — the categorical palette's ceiling. */
const MAX_PROVIDER_SERIES = MAX_COLOURED_SERIES;

export function Usage() {
  const [windowDays, setWindowDays] = useState(30);
  const { data, error, isInitialLoad, isLoading } = useUsage(windowDays);
  const { money } = useAccountMoney();
  const windowId = useId();

  const totals = data?.totals;
  const hasTraffic = (totals?.requests ?? 0) > 0;

  // Spend, not tokens, is the ordering everywhere on this screen: the
  // question it answers is where the balance went, and a cheap model can
  // lead on volume while contributing almost nothing to the bill.
  const modelRows = useMemo(
    () =>
      toRankedRows(
        (data?.models ?? []).map((model) => ({
          key: model.model,
          label: model.model,
          sublabel: [
            `${formatCompactNumber(model.tokens)} tokens`,
            `${model.requests.toLocaleString()} requests`,
            model.failedRequests > 0 ? `${model.failedRequests} failed` : null,
          ]
            .filter(Boolean)
            .join(' · '),
          value: model.spendUsd,
        }))
      ),
    [data]
  );

  const providerRows = useMemo(() => {
    // Ranked and folded by the same measure the rows display, so the "Other"
    // bucket is the sum of exactly the providers it replaced.
    const sorted = [...(data?.providers ?? [])].sort((a, b) => b.spendUsd - a.spendUsd);
    const head = sorted.slice(0, MAX_PROVIDER_SERIES - 1);
    const tail = sorted.slice(MAX_PROVIDER_SERIES - 1);
    const rows = sorted.length > MAX_PROVIDER_SERIES
      ? [
          ...head.map((p) => ({ key: p.provider, label: p.provider, value: p.spendUsd })),
          {
            key: 'other',
            label: 'Other',
            value: tail.reduce((sum, p) => sum + p.spendUsd, 0),
          },
        ]
      : sorted.map((p) => ({ key: p.provider, label: p.provider, value: p.spendUsd }));

    // Colour follows the provider's fixed position, never its rank, so a
    // window change doesn't repaint the survivors.
    return toRankedRows(rows).map((row, index) => ({ ...row, color: categoricalAt(index) }));
  }, [data]);

  const projectRows = useMemo(
    () =>
      toRankedRows(
        (data?.projects ?? []).map((project) => ({
          key: project.tag,
          label: project.tag,
          sublabel: `${project.requests.toLocaleString()} requests`,
          value: project.spendUsd,
        }))
      ),
    [data]
  );

  const latencyRows = useMemo(
    () =>
      toRankedRows(
        (data?.latency ?? []).map((entry) => ({
          key: entry.model,
          label: entry.model,
          sublabel: `${formatDuration(entry.medianFirstTokenMs)} to first token · ${entry.requests.toLocaleString()} requests`,
          value: entry.medianTokensPerSecond,
        }))
      ),
    [data]
  );

  const spendTrend = useMemo(
    () => (data?.trend ?? []).map((point) => ({ date: point.date, value: point.spendUsd })),
    [data]
  );

  const cacheShare =
    totals && totals.promptTokens > 0
      ? Math.round((totals.cachedTokens / totals.promptTokens) * 100)
      : 0;

  return (
    <div className={`${styles.page} ${isLoading && data ? styles.stale : ''}`}>
      <div className={styles.toolbar}>
        <WindowPicker id={windowId} value={windowDays} onChange={setWindowDays} />
        <a
          className={styles.export}
          href={rovie.portal.usageCsvUrl(windowDays)}
          // Same-origin in production, and the session cookie rides along on
          // a top-level navigation either way.
          download
        >
          Export CSV
        </a>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
      {isInitialLoad && !error && <Pending label="Loading your usage…" />}

      {data && (
        <>
          <Card title="Spend">
            <StatRow>
              <Stat label="Spent" value={money(totals!.spendUsd)} note={`Last ${windowDays} days`} />
              <Stat label="Requests" value={totals!.requests.toLocaleString()} />
              <Stat label="Tokens" value={formatCompactNumber(totals!.tokens)} />
              <Stat
                label="Failed"
                value={totals!.failedRequests.toLocaleString()}
                note={totals!.failedRequests > 0 ? 'See recent requests' : undefined}
              />
            </StatRow>

            {hasTraffic && (
              <div className={styles.chart}>
                <TrendChart
                  data={spendTrend}
                  seriesLabel="Spend"
                  formatValue={(value) => money(value)}
                />
              </div>
            )}
          </Card>

          <Card title="By model">
            <RankedBars
              rows={modelRows}
              valueLabel="Spend"
              formatValue={money}
              caption={`Spend per model over the last ${windowDays} days`}
              itemNoun="models"
              emptyMessage="No requests in this period."
            />
          </Card>

          {providerRows.length > 0 && (
            <Card title="By provider">
              <RankedBars
                rows={providerRows}
                valueLabel="Spend"
                formatValue={money}
                caption={`Spend per provider over the last ${windowDays} days`}
                itemNoun="providers"
              />
            </Card>
          )}

          <Card
            title="By project"
            description="Tag requests with an x-litellm-tags header to split spend by project."
          >
            {projectRows.length > 0 ? (
              <RankedBars
                rows={projectRows}
                valueLabel="Spend"
                formatValue={money}
                caption={`Spend per project tag over the last ${windowDays} days`}
                itemNoun="projects"
              />
            ) : (
              <Empty>
                Nothing tagged yet. Send <code>x-litellm-tags: my-project</code> with a request and
                it shows up here.
              </Empty>
            )}
          </Card>

          {data.sessions.sessions > 0 && (
            <Card title="Per session">
              <StatRow>
                <Stat label="Typical session" value={money(data.sessions.medianSpendUsd)} note="Median" />
                <Stat label="Expensive session" value={money(data.sessions.p90SpendUsd)} note="90th percentile" />
                <Stat label="Sessions" value={data.sessions.sessions.toLocaleString()} />
              </StatRow>
            </Card>
          )}

          {totals!.cachedTokens > 0 && (
            <Card title="Cached input">
              <StatRow>
                <Stat label="Cached tokens" value={formatCompactNumber(totals!.cachedTokens)} />
                <Stat label="Of your input" value={`${cacheShare}%`} note="Billed at the provider's cache rate" />
              </StatRow>
            </Card>
          )}

          {latencyRows.length > 0 && (
            <Card title="Speed you got">
              <RankedBars
                rows={latencyRows}
                valueLabel="Tokens/sec"
                formatValue={(value) => value.toFixed(1)}
                caption={`Median output speed per model over the last ${windowDays} days`}
                showShare={false}
                itemNoun="models"
              />
            </Card>
          )}

          <Activity />
        </>
      )}
    </div>
  );
}
