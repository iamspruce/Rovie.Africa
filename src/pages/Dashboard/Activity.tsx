import { useState } from 'react';
import { useRequests } from '../../hooks/useRequests';
import { useAccountMoney } from '../../hooks/useAccountMoney';
import { formatCompactNumber, formatDuration } from '../../lib/rankings';
import { Card, Empty, ErrorNote, Pending, TableWrap, Tag } from './DashboardUi';
import styles from './Activity.module.scss';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * The last requests this account made, newest first.
 *
 * The one screen that answers "is my client actually reaching the gateway",
 * which is why a failed request is a first-class row rather than an absence:
 * a 429 or a budget stop shows up here with a timestamp instead of only in
 * the client's own console.
 */
export function Activity() {
  const [onlyFailures, setOnlyFailures] = useState(false);
  const { data, error, isLoading } = useRequests({ limit: 50, onlyFailures });
  const { money } = useAccountMoney();

  return (
    <Card
      title="Recent requests"
      action={
        <label className={styles.filter}>
          <input
            type="checkbox"
            checked={onlyFailures}
            onChange={(event) => setOnlyFailures(event.target.checked)}
          />
          <span>Failures only</span>
        </label>
      }
    >
      {error && <ErrorNote>{error}</ErrorNote>}
      {isLoading && data === null && !error && <Pending label="Loading recent requests…" />}

      {data !== null && data.length === 0 && (
        <Empty>
          {onlyFailures
            ? 'No failed requests. Nothing to fix.'
            : 'No requests yet. Point a client at the gateway and calls appear here within seconds.'}
        </Empty>
      )}

      {data !== null && data.length > 0 && (
        <TableWrap>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Model</th>
                <th scope="col">Key</th>
                <th scope="col" className={styles.numeric}>Tokens</th>
                <th scope="col" className={styles.numeric}>Time</th>
                <th scope="col" className={styles.numeric}>Cost</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((request) => (
                <tr key={request.id}>
                  <td className={styles.time}>{formatTime(request.startedAt)}</td>
                  <td>
                    <span className={styles.model}>{request.model ?? '—'}</span>
                    {request.cacheHit && <span className={styles.cached}>cached</span>}
                  </td>
                  <td className={styles.key}>
                    {request.keyLabel || request.keyPrefix || '—'}
                  </td>
                  <td className={styles.numeric}>
                    {formatCompactNumber(request.promptTokens + request.completionTokens)}
                  </td>
                  <td className={styles.numeric}>{formatDuration(request.durationMs)}</td>
                  <td className={styles.numeric}>{money(request.spendUsd)}</td>
                  <td>
                    {/* The word carries the state; the colour only reinforces it. */}
                    {request.status === 'success' ? (
                      <Tag tone="muted">OK</Tag>
                    ) : (
                      <Tag tone="danger">{request.status}</Tag>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </Card>
  );
}
