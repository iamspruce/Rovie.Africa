import { useId, useMemo } from 'react';
import { AFRICA_COUNTRIES, currencyForAlpha2 } from '../../lib/d3/africaCountries';
import { isCurrencySupported } from '../../lib/currency';
import type { FxRates } from '../../lib/currency';
import styles from './CountrySelect.module.scss';

interface CountrySelectProps {
  /** The country currently being priced in, or null while we're still guessing. */
  value: string | null;
  onChange: (alpha2: string) => void;
  /** Shown as a reset affordance when the visitor has overridden detection. */
  onUseDetected?: () => void;
  isDetected: boolean;
  detectedCountryName?: string | null;
  /** Detection still in flight. Distinguishes "don't know yet" from "couldn't tell". */
  isDetecting?: boolean;
  /** Needed to tell a country we can quote from one that falls back to USD. */
  fxRates: FxRates | null;
  className?: string;
}

/**
 * Picks the country whose currency prices are shown in. Defaults to the
 * visitor's detected location; this is how they correct it.
 *
 * A plain <select> on purpose: 54 options, a name to type, and every
 * platform already ships a good one with search-by-typing, keyboard support
 * and a sensible mobile presentation. A custom combobox here would be worse
 * in every way that matters.
 */
export function CountrySelect({
  value,
  onChange,
  onUseDetected,
  isDetected,
  detectedCountryName,
  isDetecting = false,
  fxRates,
  className = '',
}: CountrySelectProps) {
  const selectId = useId();
  const hintId = useId();

  // Countries we can actually quote lead the list, so the common case is
  // reachable without scrolling past 30 that fall back to dollars. Until the
  // rates land there's nothing to split on, so the list stays flat rather
  // than briefly claiming every country is USD-only.
  const { quotable, usdOnly } = useMemo(() => {
    const sorted = [...AFRICA_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
    if (!fxRates) return { quotable: sorted, usdOnly: [] };
    const canQuote = (alpha2: string) =>
      isCurrencySupported(fxRates, currencyForAlpha2(alpha2) ?? '');
    return {
      quotable: sorted.filter((c) => canQuote(c.alpha2)),
      usdOnly: sorted.filter((c) => !canQuote(c.alpha2)),
    };
  }, [fxRates]);

  const selectedCurrency = currencyForAlpha2(value ?? undefined);
  const quotesLocally = Boolean(fxRates && selectedCurrency && isCurrencySupported(fxRates, selectedCurrency));

  const label = (alpha2: string, name: string) => `${name} (${currencyForAlpha2(alpha2) ?? 'USD'})`;

  return (
    <div className={`${styles.wrap} ${className}`}>
      <label className={styles.label} htmlFor={selectId}>
        Show prices in
      </label>

      <div className={styles.controls}>
        <select
          id={selectId}
          className={styles.select}
          value={value ?? ''}
          aria-describedby={hintId}
          onChange={(event) => onChange(event.target.value)}
        >
          {/* Shown until we have a country. Detection resolving to somewhere
              outside Africa - or failing outright - leaves us with none, and
              the prompt has to ask rather than claim it's still working. */}
          {value === null && (
            <option value="" disabled>
              {isDetecting ? 'Detecting your country…' : 'Select a country'}
            </option>
          )}
          {!fxRates ? (
            quotable.map((country) => (
              <option key={country.alpha2} value={country.alpha2}>
                {label(country.alpha2, country.name)}
              </option>
            ))
          ) : (
            <>
              {quotable.length > 0 && (
                <optgroup label="Priced in local currency">
                  {quotable.map((country) => (
                    <option key={country.alpha2} value={country.alpha2}>
                      {label(country.alpha2, country.name)}
                    </option>
                  ))}
                </optgroup>
              )}
              {usdOnly.length > 0 && (
                <optgroup label="Priced in US dollars">
                  {usdOnly.map((country) => (
                    <option key={country.alpha2} value={country.alpha2}>
                      {country.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </>
          )}
        </select>

        {!isDetected && onUseDetected && detectedCountryName && (
          <button type="button" className={styles.reset} onClick={onUseDetected}>
            Use my location ({detectedCountryName})
          </button>
        )}
      </div>

      <p className={styles.hint} id={hintId}>
        {!fxRates ? (
          <>Fetching today&apos;s exchange rates…</>
        ) : value === null ? (
          <>
            Prices are in US dollars until you pick a country. Billing is always in USD either
            way.
          </>
        ) : quotesLocally ? (
          <>
            Converted from USD at today&apos;s rate
            {isDetected ? ', based on where we think you are' : ''}. Billing is always in USD.
          </>
        ) : (
          <>
            We don&apos;t have a live rate for this country&apos;s currency, so prices stay in US
            dollars rather than being guessed.
          </>
        )}
      </p>
    </div>
  );
}
