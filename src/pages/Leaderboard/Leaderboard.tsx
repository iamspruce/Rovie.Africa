import { useModels } from '../../hooks/useModels';
import { LeaderboardTable } from '../../components/LeaderboardTable/LeaderboardTable';
import styles from './Leaderboard.module.scss';

export function Leaderboard() {
  const { data, error, isLoading } = useModels();

  return (
    <main className={`container ${styles.page}`}>
      <h1>Affordability leaderboard</h1>
      <p className={styles.intro}>
        The same live model catalog as the Models page, ranked cheapest-first by blended cost per
        million tokens - a quick way to see which frontier models stretch your budget furthest.
      </p>

      {isLoading && <p role="status">Loading the leaderboard…</p>}

      {error && (
        <p role="alert" className={styles.error}>
          We couldn&apos;t load the leaderboard right now. Please try again shortly.
        </p>
      )}

      {data && <LeaderboardTable models={data.models} />}
    </main>
  );
}
