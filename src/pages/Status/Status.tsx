import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useServiceHealth } from '../../hooks/useServiceHealth';
import type { ServiceCheck, ServiceState } from '../../hooks/useServiceHealth';
import { CONTACT_EMAIL } from '../../content/navLinks';
import { categoricalAt } from '../../lib/viz/palette';
import {
  availability,
  DEGRADED_ABOVE_MS,
  incidents,
  looksLikeLocalNetwork,
  percentile,
} from '../../lib/statusHistory';
import type { RecordedState } from '../../lib/statusHistory';
import { couldBeLocal } from '../../lib/statusFailures';
import { StatTiles } from '../../components/viz/StatTiles';
import { Sparkline } from '../../components/viz/Sparkline';
import { StatusTimeline } from '../../components/viz/StatusTimeline';
import { LatencyChart } from '../../components/viz/LatencyChart';
import styles from './Status.module.scss';

const STATE_LABEL: Record<ServiceState, string> = {
  operational: 'Operational',
  degraded: 'Slow',
  down: 'Not responding',
  unmonitored: 'Not monitored',
  checking: 'Checking…',
};

const HEADLINE: Record<ServiceState, string> = {
  operational: 'All systems operational',
  degraded: 'Some systems are slow',
  down: 'Something is not responding',
  unmonitored: 'Nothing to report',
  checking: 'Checking systems…',
};

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatSince(from: number, to: number): string {
  const minutes = Math.round((to - from) / 60_000);
  if (minutes < 1) return 'less than a minute';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

export function Status() {
  const { checks, overall, lastCheckedAt, isChecking, hasResults, windowStartedAt, refresh, clearHistory } =
    useServiceHealth();
  const [showTable, setShowTable] = useState(false);

  const monitored = useMemo(
    () => checks.filter((check) => check.state !== 'unmonitored'),
    [checks]
  );

  // Colour follows the service, by its fixed position in the probe list - never
  // by rank, and never recomputed from the current state. A reader who learned
  // that the gateway is blue must not find it orange after an outage reorders
  // anything.
  const colorFor = useMemo(() => {
    const byId = new Map(monitored.map((check, index) => [check.id, categoricalAt(index)]));
    return (id: string) => byId.get(id) ?? categoricalAt(0);
  }, [monitored]);

  const series = useMemo(
    () =>
      monitored.map((check) => ({
        id: check.id,
        label: check.name,
        color: colorFor(check.id),
        samples: check.samples,
      })),
    [monitored, colorFor]
  );

  const allSamples = useMemo(() => monitored.flatMap((check) => check.samples), [monitored]);

  const timelineSlots = useMemo(
    () => Math.max(1, ...monitored.map((check) => check.samples.length)),
    [monitored]
  );

  // Every service unhappy in the same round is the strongest signal this page
  // can offer, and it points away from us: the one thing four independent
  // services share is the connection used to reach them.
  const roundStates = monitored
    .map((check) => check.state)
    .filter((state): state is RecordedState => state !== 'checking');
  const failureKinds = monitored
    .map((check) => check.failure?.kind)
    .filter((kind): kind is NonNullable<typeof kind> => kind !== undefined);
  const suspectLocalNetwork =
    hasResults && looksLikeLocalNetwork(roundStates) && couldBeLocal(failureKinds);

  const stats = useMemo(() => {
    const uptime = availability(allSamples);
    const p50 = percentile(allSamples, 50);
    const p95 = percentile(allSamples, 95);
    const checksRun = allSamples.length;

    return [
      {
        key: 'uptime',
        label: 'Checks that got an answer',
        value: uptime === null ? '—' : `${uptime.toFixed(uptime === 100 ? 0 : 1)}%`,
        note:
          windowStartedAt && lastCheckedAt
            ? `Across ${formatSince(windowStartedAt, lastCheckedAt)} in this browser`
            : 'Building up as checks run',
      },
      {
        key: 'p50',
        label: 'Median response',
        value: p50 === null ? '—' : `${p50} ms`,
        note: 'Half of all checks were faster than this',
      },
      {
        key: 'p95',
        label: '95th percentile',
        value: p95 === null ? '—' : `${p95} ms`,
        note: 'The slow tail — what a bad moment feels like',
      },
      {
        key: 'checks',
        label: 'Checks recorded',
        value: checksRun.toLocaleString(),
        note: `${monitored.length} services, once a minute`,
      },
    ];
  }, [allSamples, windowStartedAt, lastCheckedAt, monitored.length]);

  const openIncidents = useMemo(
    () =>
      monitored
        .map((check) => ({ check, runs: incidents(check.samples) }))
        .filter((entry) => entry.runs.length > 0),
    [monitored]
  );

  return (
    <main className={`containerWide ${styles.page}`}>
      <header className={styles.head}>
        <span className={styles.eyebrow}>Status</span>
        <h1>{HEADLINE[overall]}</h1>
        <p className={styles.intro}>
          Checked live from your browser, right now — these are the same requests this site makes to
          run. Everything below is <strong>your</strong> view of Rovie: measured from your network,
          on this device, and stored only here. It is not an uptime record, and someone on another
          connection may honestly see something different.
        </p>

        <div className={styles.meta}>
          <p className={styles.checked} role="status">
            {lastCheckedAt
              ? `Last checked at ${formatTime(lastCheckedAt)}. Rechecks every minute.`
              : 'Running the first check…'}
          </p>
          <button type="button" className={styles.refresh} onClick={refresh} disabled={isChecking}>
            {isChecking ? 'Checking…' : 'Check again'}
          </button>
        </div>
      </header>

      {suspectLocalNetwork && (
        <aside className={styles.localNetwork} role="alert">
          <h2>Check your connection first</h2>
          <p>
            Every service failed or slowed in the same round, and all of them failed in ways that a
            network problem would also cause. Four independent services rarely break at the same
            instant — but the one thing they share is the connection used to reach them.
          </p>
          <p>
            Try again on another network before reporting this. If it persists on a connection you
            know is good, we want to hear about it.
          </p>
        </aside>
      )}

      {/* The KPI row. Figures, not charts - a single value with no shape has
          nothing to draw. */}
      <section aria-labelledby="status-summary-heading" className={styles.summary}>
        <h2 id="status-summary-heading" className={styles.sectionHeading}>
          This browser&apos;s window
        </h2>
        <StatTiles stats={stats} />
      </section>

      {/* Held at reduced opacity while a round is in flight rather than swapped
          for a skeleton: the previous reading is still true, and a flash of
          empty chart every sixty seconds is worse than a slightly dim one. */}
      <div className={styles.live} data-refreshing={isChecking && hasResults ? '' : undefined}>
        <ul className={styles.list} aria-label="Service status">
          {checks.map((check) => (
            <li key={check.id} className={styles.row} data-state={check.state}>
              <span className={styles.dot} aria-hidden="true" />

              <div className={styles.identity}>
                <h2>{check.name}</h2>
                <p>{check.description}</p>
              </div>

              <div className={styles.trend}>
                {check.state !== 'unmonitored' && (
                  <Sparkline
                    samples={check.samples}
                    color={colorFor(check.id)}
                    label={check.name}
                  />
                )}
              </div>

              <div className={styles.reading}>
                <span className={styles.state}>{STATE_LABEL[check.state]}</span>
                {check.latencyMs !== null && check.state !== 'checking' && (
                  <span className={styles.latency}>{check.latencyMs} ms</span>
                )}
                {check.detail && <span className={styles.detail}>{check.detail}</span>}
              </div>

              {/* The outage explanation. A status code and a stack trace tell a
                  visitor nothing about whose problem this is, which is the only
                  thing they came to find out. */}
              {check.failure && (
                <div className={styles.failure}>
                  <p className={styles.failureLabel}>{check.failure.label}</p>
                  <p>{check.failure.meaning}</p>
                  <p className={styles.failureAdvice}>{check.failure.advice}</p>
                </div>
              )}
            </li>
          ))}
        </ul>

        <section className={styles.chart} aria-labelledby="status-latency-heading">
          <h2 id="status-latency-heading" className={styles.sectionHeading}>
            Response time
          </h2>
          <p className={styles.sectionNote}>
            Every service on one scale, because the comparison is the point. Lines that climb
            together are the connection they share; one line climbing alone is that service. The
            scale follows the checks that succeeded — a failed check always takes exactly as long
            as the timeout, so letting those set the ceiling would flatten everything else. They
            are marked at the top instead, where the line breaks.
          </p>
          <LatencyChart series={series} degradedAboveMs={DEGRADED_ABOVE_MS} />
        </section>

        <section className={styles.chart} aria-labelledby="status-timeline-heading">
          <h2 id="status-timeline-heading" className={styles.sectionHeading}>
            Every check, oldest first
          </h2>
          <p className={styles.sectionNote}>
            One mark per check. Taller is worse — a healthy check is a low tick, slow is half
            height, and a failure is the full bar, so the shape reads without relying on colour.
          </p>

          <ul className={styles.legend}>
            <li>
              <span className={styles.legendMark} data-state="operational" aria-hidden="true" />
              Operational
            </li>
            <li>
              <span className={styles.legendMark} data-state="degraded" aria-hidden="true" />
              Slow (over {DEGRADED_ABOVE_MS} ms)
            </li>
            <li>
              <span className={styles.legendMark} data-state="down" aria-hidden="true" />
              Not responding
            </li>
          </ul>

          <div className={styles.timelines}>
            {monitored.map((check) => (
              <div key={check.id} className={styles.timelineRow}>
                <h3>{check.name}</h3>
                {/* Every strip reserves the same number of cells - the longest
                    history on the page - so the columns line up between
                    services without leaving two thirds of a young window blank. */}
                <StatusTimeline samples={check.samples} label={check.name} slots={timelineSlots} />
              </div>
            ))}
          </div>
        </section>

        {openIncidents.length > 0 && (
          <section className={styles.chart} aria-labelledby="status-incidents-heading">
            <h2 id="status-incidents-heading" className={styles.sectionHeading}>
              Failures in this window
            </h2>
            <p className={styles.sectionNote}>
              Grouped into runs rather than counted. Twelve separate one-minute failures is a
              service flapping; one twelve-minute run is an outage. They read the same as a total.
            </p>
            <ul className={styles.incidents}>
              {openIncidents.flatMap(({ check, runs }) =>
                runs.map((run) => (
                  <li key={`${check.id}-${run.startedAt}`}>
                    <span className={styles.incidentService}>{check.name}</span>
                    <span className={styles.incidentWhen}>
                      {formatTime(run.startedAt)}
                      {run.samples > 1 && ` – ${formatTime(run.endedAt)}`}
                    </span>
                    <span className={styles.incidentLength}>
                      {run.samples} failed check{run.samples === 1 ? '' : 's'}
                      {run.ongoing && ' · ongoing'}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>
        )}
      </div>

      {/* The table view. Every figure in the charts above is reachable here
          without reading a colour or landing a hover. */}
      <section className={styles.chart} aria-labelledby="status-table-heading">
        <div className={styles.tableHead}>
          <h2 id="status-table-heading" className={styles.sectionHeading}>
            The same figures, as a table
          </h2>
          <button
            type="button"
            className={styles.refresh}
            onClick={() => setShowTable((open) => !open)}
            aria-expanded={showTable}
          >
            {showTable ? 'Hide table' : 'Show table'}
          </button>
        </div>

        {showTable && (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <caption>
                Per service, over this browser&apos;s stored window
                {windowStartedAt && lastCheckedAt
                  ? ` of ${formatSince(windowStartedAt, lastCheckedAt)}`
                  : ''}
                .
              </caption>
              <thead>
                <tr>
                  <th scope="col">Service</th>
                  <th scope="col">Now</th>
                  <th scope="col">Checks</th>
                  <th scope="col">Answered</th>
                  <th scope="col">Median</th>
                  <th scope="col">95th</th>
                  <th scope="col">Slowest</th>
                </tr>
              </thead>
              <tbody>
                {monitored.map((check) => (
                  <TableRow key={check.id} check={check} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.note} aria-labelledby="status-note-heading">
        <h2 id="status-note-heading">If something looks wrong</h2>
        <p>
          A failure here can be your network as easily as ours — the checks run from your browser.
          If a service stays red after a refresh, tell us what you&apos;re seeing and we&apos;ll
          look at it from our side. The rows above say which kind of failure it was, which is worth
          quoting.
        </p>
        <div className={styles.actions}>
          <a
            className={styles.action}
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Status report')}`}
          >
            Report a problem
          </a>
          <Link className={styles.action} to="/support">
            Get support
          </Link>
          <button type="button" className={styles.action} onClick={clearHistory}>
            Clear this history
          </button>
        </div>
        <p className={styles.privacy}>
          The history behind these charts is stored in this browser and sent nowhere. Clearing it
          removes it.
        </p>
      </section>
    </main>
  );
}

function TableRow({ check }: { check: ServiceCheck }) {
  const p50 = percentile(check.samples, 50);
  const p95 = percentile(check.samples, 95);
  const worst = check.samples.reduce<number | null>(
    (max, sample) =>
      sample.latencyMs === null ? max : max === null ? sample.latencyMs : Math.max(max, sample.latencyMs),
    null
  );
  const uptime = availability(check.samples);

  return (
    <tr>
      <th scope="row">{check.name}</th>
      <td>{STATE_LABEL[check.state]}</td>
      <td>{check.samples.length}</td>
      <td>{uptime === null ? '—' : `${uptime.toFixed(uptime === 100 ? 0 : 1)}%`}</td>
      <td>{p50 === null ? '—' : `${p50} ms`}</td>
      <td>{p95 === null ? '—' : `${p95} ms`}</td>
      <td>{worst === null ? '—' : `${worst} ms`}</td>
    </tr>
  );
}
