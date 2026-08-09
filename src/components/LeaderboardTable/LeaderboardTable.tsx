import type { Model } from '../../lib/models';
import { sortModelsByAffordability, formatCostPerMillion, formatTokenLimit } from '../../lib/models';
import styles from './LeaderboardTable.module.scss';

interface LeaderboardTableProps {
  models: Model[];
}

export function LeaderboardTable({ models }: LeaderboardTableProps) {
  const ranked = sortModelsByAffordability(models);

  if (ranked.length === 0) {
    return <p className={styles.empty}>No priced models are available right now.</p>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Rank</th>
          <th scope="col">Model</th>
          <th scope="col">Provider</th>
          <th scope="col">Blended cost</th>
          <th scope="col">Context window</th>
        </tr>
      </thead>
      <tbody>
        {ranked.map(({ model, blendedCostPerMillion }, index) => (
          <tr key={model.litellmModelName}>
            <td className={styles.rank}>{index + 1}</td>
            <th scope="row">{model.name}</th>
            <td>{model.provider}</td>
            <td>{formatCostPerMillion(blendedCostPerMillion!)}</td>
            <td>{formatTokenLimit(model.limit?.context!)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
