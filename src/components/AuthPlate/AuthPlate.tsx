import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LogoMap } from '../LogoMap/LogoMap';
import { useVisitorCountry } from '../../hooks/useVisitorCountry';
import { currencyForAlpha2 } from '../../lib/d3/africaCountries';
import {
  PLATE_COUNTRIES,
  PLATE_HEIGHT,
  PLATE_OUTLINE,
  PLATE_WIDTH,
} from '../../lib/d3/plateGeometry';
import styles from './AuthPlate.module.scss';

/**
 * The panel beside the sign-in and sign-up forms.
 *
 * It isn't an illustration dropped in to fill the column - it's the same
 * `world-atlas` geometry the homepage globe draws, and it lights up the
 * visitor's own country in amber using the same IP lookup the homepage cost
 * badge uses. Amber means "your country" everywhere else on the site
 * (base/_theme.scss says so explicitly); it means exactly that here too.
 *
 * The caption states the concrete consequence of signing up from where you
 * are - which currency you'll be billed in - rather than describing the
 * picture. When detection fails or the visitor is outside Africa, it says the
 * neutral true thing instead of guessing.
 */
export function AuthPlate() {
  // `rawCountryName` is deliberately not used: it's whatever the IP provider
  // called the place, which may be somewhere outside Africa or spelled in a
  // way the rest of the site doesn't. The plate only names a country it can
  // actually draw, so it uses the resolved one or says nothing.
  const { country, isLoading } = useVisitorCountry();

  const marked = useMemo(
    () => (country ? PLATE_COUNTRIES.find((entry) => entry.alpha2 === country.alpha2) : undefined),
    [country]
  );

  const currency = country ? currencyForAlpha2(country.alpha2) : undefined;

  return (
    <aside className={styles.plate}>
      <Link to="/" className={styles.brand} aria-label="Rovie.africa home">
        <LogoMap size={26} />
        <span>Rovie</span>
      </Link>

      <div className={styles.figure}>
        <svg
          className={styles.map}
          viewBox={`0 0 ${PLATE_WIDTH} ${PLATE_HEIGHT}`}
          role="img"
          aria-label={
            country
              ? `Map of Africa with ${country.name} marked`
              : 'Map of Africa'
          }
        >
          {/* The continent as one shape, under the country fills. Without it
              the hairline borders read as the edge of the landmass rather
              than as divisions inside it. */}
          <path d={PLATE_OUTLINE} className={styles.landmass} />

          {PLATE_COUNTRIES.map((entry) => (
            <path
              key={entry.alpha2 || entry.path.slice(0, 24)}
              d={entry.path}
              className={
                marked && entry.alpha2 === marked.alpha2 ? styles.countryMarked : styles.country
              }
            />
          ))}

          {marked && (
            <g className={styles.marker}>
              {/* A real parallel through the marked country's centroid,
                  drawn from the projection rather than placed by eye. */}
              <line
                x1={0}
                x2={PLATE_WIDTH}
                y1={marked.centroid[1]}
                y2={marked.centroid[1]}
                className={styles.parallel}
              />
              <circle cx={marked.centroid[0]} cy={marked.centroid[1]} r={16} className={styles.halo} />
              <circle cx={marked.centroid[0]} cy={marked.centroid[1]} r={4.5} className={styles.dot} />
            </g>
          )}
        </svg>
      </div>

      <div className={styles.caption}>
        {country && currency ? (
          <>
            <p className={styles.captionLead}>
              <span className={styles.pin} aria-hidden="true" />
              {country.name}
            </p>
            <p className={styles.captionBody}>
              You&apos;ll be billed in <span className={styles.code}>{currency}</span>, converted at
              the live rate on every top-up.
            </p>
          </>
        ) : (
          <>
            <p className={styles.captionLead}>
              {isLoading ? 'Finding your country…' : 'Frontier AI, priced for Africa'}
            </p>
            <p className={styles.captionBody}>
              {/* Reached when the IP lookup fails, is blocked, or the visitor
                  is outside Africa. Saying so beats naming a country we
                  guessed - the whole promise here is quoting the right one. */}
              One key, every frontier model, billed in your own currency. Pick your country when you
              sign up.
            </p>
          </>
        )}
      </div>
    </aside>
  );
}
