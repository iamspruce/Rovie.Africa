import { Link } from 'react-router-dom';
import type { ModelQuote } from '../../lib/pricing';
import { formatReleaseMonth, modelFamily, reachPercentages } from '../../lib/pricing';
import { ModelLogo } from '../ModelLogo/ModelLogo';
import styles from './FeaturedModels.module.scss';

interface FeaturedModelsProps {
  /** Newest model per family, already priced in the visitor's currency. */
  quotes: ModelQuote[];
  /** The reference top-up, formatted in local currency where we have a rate. */
  referencePriceText: string;
  isLoading: boolean;
  error: Error | null;
}

export function FeaturedModels({
  quotes,
  referencePriceText,
  isLoading,
  error,
}: FeaturedModelsProps) {
  // The rules are read against each other, so they're spaced across the range
  // actually on show rather than against an absolute ceiling.
  const reaches = reachPercentages(quotes.map((quote) => quote.tokens));

  return (
    <section className={styles.featured} aria-labelledby="featured-models-heading">
      <div className={styles.head}>
        <span className={styles.eyebrow}>Live catalog</span>
        <h2 id="featured-models-heading">The most {referencePriceText} can buy</h2>
        {/* The heading carries the amount, so this doesn't repeat it - it says
            what the list is and where the numbers come from. */}
        <p>
          One model from each family, newest first. These are the prices we route at today — they
          move when the providers move theirs.
        </p>
      </div>

      {error && (
        <p className={styles.state} role="alert">
          We couldn&apos;t reach the model catalog just now. Refresh to try again.
        </p>
      )}

      {!error && isLoading && quotes.length === 0 && (
        <p className={styles.state}>Checking today&apos;s prices…</p>
      )}

      {!error && !isLoading && quotes.length === 0 && (
        <p className={styles.state}>
          Nothing in the catalog is priced right now. <Link to="/models">Open the full catalog</Link>{' '}
          to see what&apos;s routable.
        </p>
      )}

      {quotes.length > 0 && (
        <>
          <ul className={styles.list}>
            {quotes.map(({ model, tokensLabel, perMillion }, index) => {
              const reach = reaches[index];
              const released = formatReleaseMonth(model.release_date);
              return (
                <li key={model.litellmModelName} className={styles.row}>
                  <div className={styles.line}>
                    <ModelLogo
                      family={modelFamily(model)}
                      fallbackLabel={model.provider}
                      className={styles.logo}
                    />
                    <span className={styles.identity}>
                      <span className={styles.name}>{model.name}</span>
                      {/* The logo says who made it; the date backs up "latest". */}
                      {released && <span className={styles.released}>{released}</span>}
                    </span>
                    <span className={styles.figures}>
                      <span className={styles.yield}>{tokensLabel} tokens</span>
                      <span className={styles.rate}>{perMillion.text} / 1M</span>
                    </span>
                  </div>
                  {/* The row's own underline is the comparison - length is how
                      far the same top-up reaches on this model. */}
                  <div className={styles.reach} aria-hidden="true">
                    <span className={styles.reachFill} style={{ width: `${reach}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>

          <p className={styles.caption}>
            Each rule ranks how far {referencePriceText} reaches on that model. The spread across
            the catalog runs to roughly 40×, so the rules are spaced to stay readable — the token
            counts beside them are the exact figures.
          </p>

          <Link className={styles.catalogLink} to="/models">
            See all models
          </Link>
        </>
      )}
    </section>
  );
}
