import { useId, useMemo, useState } from 'react';
import { useRankings } from '../../hooks/useRankings';
import { useModels } from '../../hooks/useModels';
import { useFxRates } from '../../hooks/useFxRates';
import { useDisplayCountry } from '../../hooks/useDisplayCountry';
import { StatTiles } from '../../components/viz/StatTiles';
import { TrendChart } from '../../components/viz/TrendChart';
import { RankedBars } from '../../components/viz/RankedBars';
import { AfricaUsageMap } from '../../components/viz/AfricaUsageMap';
import { SpeedScatter } from '../../components/viz/SpeedScatter';
import { categoricalAt } from '../../lib/viz/palette';
import { findByAlpha2 } from '../../lib/d3/africaCountries';
import { formatLocalOrUsd } from '../../lib/pricing';
import { formatTokenLimit } from '../../lib/models';
import {
  DEFAULT_WINDOW_DAYS,
  WINDOW_OPTIONS,
  attributedShare,
  contextFillPercent,
  foldProviderTail,
  formatCompactNumber,
  formatDuration,
  toRankedRows,
} from '../../lib/rankings';
import styles from './Rankings.module.scss';

/** A titled block with a one-line explanation of where its numbers come from. */
function Section({
  id,
  title,
  provenance,
  children,
  wide = false,
}: {
  id: string;
  title: string;
  provenance: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={`${styles.section} ${wide ? styles.wide : ''}`} aria-labelledby={id}>
      <div className={styles.sectionHead}>
        <h2 id={id}>{title}</h2>
        <p className={styles.provenance}>{provenance}</p>
      </div>
      {children}
    </section>
  );
}

export function Rankings() {
  const [windowDays, setWindowDays] = useState(DEFAULT_WINDOW_DAYS);
  const { data, error, isLoading, isInitialLoad, isDemo } = useRankings(windowDays);
  const { data: modelsData } = useModels();
  const { data: fxRates } = useFxRates();
  const { currency } = useDisplayCountry();
  const windowId = useId();

  const money = (usd: number) => formatLocalOrUsd(usd, fxRates, currency).text;

  // The catalog's advertised context windows, so "how much context people
  // actually send" can be read against what the model allows.
  const contextWindows = useMemo(() => {
    const map = new Map<string, number>();
    (modelsData?.models ?? []).forEach((model) => {
      if (model.limit?.context) map.set(model.litellmModelName, model.limit.context);
    });
    return map;
  }, [modelsData]);

  const modelRows = useMemo(
    () =>
      toRankedRows(
        (data?.models ?? []).map((model) => ({
          key: model.model,
          label: model.model,
          sublabel: model.provider ?? undefined,
          value: model.tokens,
        }))
      ),
    [data]
  );

  const providerRows = useMemo(() => {
    const folded = foldProviderTail(data?.providers ?? []);
    return toRankedRows(
      folded.map((entry) => ({ key: entry.provider, label: entry.provider, value: entry.tokens }))
      // Colour follows the provider's fixed position in this list, never its
      // rank in a filtered view, so a provider keeps its hue as data moves.
    ).map((row, index) => ({ ...row, color: categoricalAt(index) }));
  }, [data]);

  const countryRows = useMemo(
    () =>
      toRankedRows(
        (data?.countries ?? []).map((entry) => ({
          key: entry.country,
          label: findByAlpha2(entry.country)?.name ?? entry.country,
          sublabel: [
            `${entry.developers} ${entry.developers === 1 ? 'developer' : 'developers'}`,
            entry.topModel ? `mostly ${entry.topModel}` : null,
          ]
            .filter(Boolean)
            .join(' · '),
          value: entry.tokens,
        }))
      ),
    [data]
  );

  const toolRows = useMemo(
    () =>
      toRankedRows(
        (data?.tools ?? []).map((tool) => ({ key: tool.tool, label: tool.tool, value: tool.calls }))
      ),
    [data]
  );

  const appRows = useMemo(
    () =>
      toRankedRows(
        (data?.apps ?? []).map((app) => ({ key: app.app, label: app.app, value: app.tokens }))
      ),
    [data]
  );

  const contextRows = useMemo(
    () =>
      toRankedRows(
        (data?.context ?? []).map((entry) => {
          const window = contextWindows.get(entry.model);
          const fill = contextFillPercent(entry, window);
          return {
            key: entry.model,
            label: entry.model,
            sublabel: window
              ? `${formatTokenLimit(window)} window${fill !== null ? ` · ${Math.round(fill)}% used` : ''}`
              : undefined,
            value: entry.p90PromptTokens,
          };
        })
      ),
    [data, contextWindows]
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

  const appShare = data ? attributedShare(data.apps, data.totals.tokens) : null;

  return (
    <main className={`container ${styles.page}`}>
      {isDemo && (
        <p className={styles.demoBanner} role="alert">
          <strong>Sample data.</strong> Every figure on this page is made up, for previewing the
          layout before real traffic exists. Drop <code>?demo=1</code> from the URL to read the
          live numbers.
        </p>
      )}

      <header className={styles.head}>
        <h1>What Africa is building with</h1>
        <p className={styles.intro}>
          {isDemo
            ? 'This is what the page shows once traffic arrives: measured usage, aggregated across everyone using the API, never identifying an account.'
            : 'Real traffic through Rovie — every figure below is measured, not estimated. Nothing here identifies an account: all of it is aggregated across everyone using the API.'}
        </p>

        <div className={styles.windowPicker}>
          <label htmlFor={windowId}>Window</label>
          <select
            id={windowId}
            value={windowDays}
            onChange={(event) => setWindowDays(Number(event.target.value))}
          >
            {WINDOW_OPTIONS.map((option) => (
              <option key={option.days} value={option.days}>
                Last {option.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {isInitialLoad && <p role="status">Loading usage data…</p>}

      {error && (
        <p role="alert" className={styles.error}>
          We couldn&apos;t load usage data right now. Please try again shortly.
        </p>
      )}

      {data && (
        // Refetching holds the previous slice at reduced opacity rather than
        // flashing a skeleton, so changing the window doesn't jump the page.
        <div className={isLoading ? styles.stale : undefined}>
          <StatTiles
            lead
            stats={[
              {
                key: 'tokens',
                label: 'Tokens processed',
                value: formatCompactNumber(data.totals.tokens),
                note: `across ${data.totals.requests.toLocaleString()} requests`,
              },
              {
                key: 'developers',
                label: 'Developers',
                value: data.totals.developers.toLocaleString(),
                note: `in ${data.totals.countries} ${data.totals.countries === 1 ? 'country' : 'countries'}`,
              },
              {
                key: 'spend',
                label: 'Spent on inference',
                value: money(data.totals.spendUsd),
                note: 'at cost, in the window',
              },
            ]}
          />

          <Section
            id="trend"
            title="Daily volume"
            provenance="Tokens processed per day, from LiteLLM's own spend rollups."
            wide
          >
            <TrendChart
              data={data.trend.map((point) => ({ date: point.date, value: point.tokens }))}
              seriesLabel="Tokens"
              formatValue={formatCompactNumber}
            />
          </Section>

          <Section
            id="countries"
            title="Where the continent is building"
            provenance="Usage by the country each developer signed up from. No aggregator outside Africa can publish this."
            wide
          >
            <div className={styles.mapLayout}>
              <AfricaUsageMap countries={data.countries} />
              <RankedBars
                rows={countryRows}
                valueLabel="Tokens"
                formatValue={formatCompactNumber}
                caption="Token usage by country"
              itemNoun="countries"
                emptyMessage="No country usage recorded in this window yet."
              />
            </div>
          </Section>

          <Section
            id="top-models"
            title="Top models"
            provenance="Ranked by tokens processed through the proxy."
          >
            <RankedBars
              rows={modelRows}
              valueLabel="Tokens"
              formatValue={formatCompactNumber}
              caption="Models ranked by tokens processed"
              itemNoun="models"
            />
          </Section>

          <Section
            id="market-share"
            title="Market share"
            provenance="Share of all tokens by the lab that served them. Anything past the eighth provider is folded into Other."
          >
            <RankedBars
              rows={providerRows}
              valueLabel="Tokens"
              formatValue={formatCompactNumber}
              caption="Provider share of tokens processed"
              itemNoun="providers"
            />
          </Section>

          <Section
            id="speed"
            title="Fastest models"
            provenance="Median output tokens per second, measured on real requests — not a vendor's published figure."
            wide
          >
            <div className={styles.splitLayout}>
              <SpeedScatter models={data.latency} />
              <RankedBars
                rows={latencyRows}
                valueLabel="Tokens/sec"
                formatValue={(value) => value.toFixed(1)}
                caption="Models ranked by median output speed"
              itemNoun="models"
                showShare={false}
                emptyMessage="Not enough timed requests yet to rank speed."
              />
            </div>
          </Section>

          <Section
            id="sessions"
            title="Cost per session"
            provenance={
              data.sessions.sessions > 0
                ? `Across ${data.sessions.sessions.toLocaleString()} sessions from clients that send a session id.`
                : 'Needs clients that send a session id — see the client setup docs.'
            }
          >
            {data.sessions.sessions > 0 ? (
              <StatTiles
                stats={[
                  {
                    key: 'median',
                    label: 'Median session',
                    value: money(data.sessions.medianSpendUsd),
                    note: `${formatCompactNumber(data.sessions.medianTokens)} tokens, ${data.sessions.medianRequests} requests`,
                  },
                  {
                    key: 'p90',
                    label: 'Heavy session (top 10%)',
                    value: money(data.sessions.p90SpendUsd),
                    note: 'what a long working session costs',
                  },
                ]}
              />
            ) : (
              <p className={styles.pending}>
                No sessions recorded yet. Sessions are grouped by the id a client sends — some
                tools do it automatically, others need one header. Nothing is inferred, so this
                stays empty rather than guessing where one session ends.
              </p>
            )}
          </Section>

          <Section
            id="context"
            title="Context length"
            provenance="How much context people actually send — the 90th percentile prompt, against the model's advertised window."
          >
            <RankedBars
              rows={contextRows}
              valueLabel="Prompt tokens"
              formatValue={formatCompactNumber}
              caption="Models ranked by prompt size at the 90th percentile"
              itemNoun="models"
              showShare={false}
            />
          </Section>

          <Section
            id="tools"
            title="Tool calls"
            provenance="MCP tools invoked through the proxy, by name."
          >
            <RankedBars
              rows={toolRows}
              valueLabel="Calls"
              formatValue={(value) => value.toLocaleString()}
              caption="MCP tools ranked by calls"
              itemNoun="tools"
              emptyMessage="No MCP tool calls recorded in this window yet."
            />
          </Section>

          <Section
            id="apps"
            title="Top apps"
            provenance={
              appShare !== null
                ? `Covers ${appShare.toFixed(0)}% of traffic — apps appear here only once they identify themselves.`
                : 'Apps appear here once they identify themselves with a header.'
            }
          >
            {appRows.length > 0 ? (
              <RankedBars
                rows={appRows}
                valueLabel="Tokens"
                formatValue={formatCompactNumber}
                caption="Apps ranked by tokens processed"
              itemNoun="apps"
              />
            ) : (
              <p className={styles.pending}>
                No apps have identified themselves yet. A client is counted here when it sends an{' '}
                <code>x-litellm-tags</code> header; we don&apos;t guess from the user agent, so
                this list is empty rather than approximate.
              </p>
            )}
          </Section>

          <p className={styles.footnote}>
            Window: last {data.windowDays} days, from {data.since}. Figures update every few
            minutes. Prices shown at what inference cost, converted from USD at today&apos;s rate.
          </p>
        </div>
      )}
    </main>
  );
}
