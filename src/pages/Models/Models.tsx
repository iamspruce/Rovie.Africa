import { useId, useMemo, useState } from 'react';
import { useModels } from '../../hooks/useModels';
import { useFxRates } from '../../hooks/useFxRates';
import { useDisplayCountry } from '../../hooks/useDisplayCountry';
import { CountrySelect } from '../../components/CountrySelect/CountrySelect';
import { ModelFilters } from '../../components/ModelFilters/ModelFilters';
import { ModelsTable } from '../../components/ModelsTable/ModelsTable';
import {
  DEFAULT_SORT,
  EMPTY_FILTERS,
  SORT_OPTIONS,
  filterAndSortModels,
  isFilterActive,
  maxBlendedCostOf,
  providerFacets,
} from '../../lib/modelFilters';
import type { ModelFilterState, SortKey } from '../../lib/modelFilters';
import styles from './Models.module.scss';

export function Models() {
  const { data, error, isLoading } = useModels();
  const { data: fxRates } = useFxRates();
  const {
    alpha2,
    currency,
    isDetected,
    detectedCountry,
    isLoading: isDetecting,
    selectCountry,
    useDetectedCountry,
  } = useDisplayCountry();

  const [filters, setFilters] = useState<ModelFilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const sortId = useId();

  const models = useMemo(() => data?.models ?? [], [data]);
  const providers = useMemo(() => providerFacets(models), [models]);
  const maxCost = useMemo(() => maxBlendedCostOf(models), [models]);
  const visible = useMemo(
    () => filterAndSortModels(models, filters, sort),
    [models, filters, sort]
  );

  const filtered = isFilterActive(filters);

  return (
    <main className={`containerWide ${styles.page}`}>
      <header className={styles.head}>
        <h1>Models &amp; pricing</h1>
        <p className={styles.intro}>
          Every model available through your Rovie API key, pulled live from our catalog. Prices are
          per million tokens, converted from USD at today&apos;s rate.
        </p>
        <CountrySelect
          value={alpha2}
          onChange={selectCountry}
          onUseDetected={useDetectedCountry}
          isDetected={isDetected}
          detectedCountryName={detectedCountry?.name ?? null}
          isDetecting={isDetecting}
          fxRates={fxRates}
          className={styles.country}
        />
      </header>

      {isLoading && <p role="status">Loading the model catalog…</p>}

      {error && (
        <p role="alert" className={styles.error}>
          We couldn&apos;t load the model catalog right now. Please try again shortly.
        </p>
      )}

      {data && (
        <div className={styles.layout}>
          <ModelFilters
            filters={filters}
            onChange={setFilters}
            providers={providers}
            maxCost={maxCost}
            fxRates={fxRates}
            currency={currency}
          />

          <section className={styles.results} aria-label="Model catalog">
            <div className={styles.resultsBar}>
              <p className={styles.count} role="status">
                {visible.length} of {models.length} models
                {filtered ? ' match your filters' : ''}
              </p>

              <div className={styles.sortField}>
                <label htmlFor={sortId}>Sort by</label>
                <select
                  id={sortId}
                  className={styles.sortSelect}
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortKey)}
                >
                  {SORT_OPTIONS.map(({ key, label }) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {visible.length === 0 ? (
              <div className={styles.noMatches}>
                <p>No models match these filters.</p>
                <button type="button" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className={styles.tableScroll}>
                <ModelsTable
                  models={visible}
                  fxRates={fxRates}
                  currency={currency}
                  sort={sort}
                  onSortChange={setSort}
                />
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
