import { useId } from 'react';
import { MODALITIES, MODEL_CAPABILITIES } from '../../lib/models';
import type { CapabilityKey, Modality } from '../../lib/models';
import { CONTEXT_STEPS, EMPTY_FILTERS, isFilterActive, toggleValue } from '../../lib/modelFilters';
import type { ModelFilterState } from '../../lib/modelFilters';
import { formatLocalOrUsd } from '../../lib/pricing';
import type { FxRates } from '../../lib/currency';
import styles from './ModelFilters.module.scss';

interface ModelFiltersProps {
  filters: ModelFilterState;
  onChange: (next: ModelFilterState) => void;
  /** Providers actually present in the catalog, with counts. */
  providers: { provider: string; count: number }[];
  /** Top of the price slider, in USD per million blended. Null hides the slider. */
  maxCost: number | null;
  fxRates: FxRates | null;
  currency?: string;
}

const MODALITY_LABELS: Record<Modality, string> = {
  text: 'Text',
  image: 'Image',
  audio: 'Audio',
  video: 'Video',
  pdf: 'PDF',
};

/** A checkbox styled as a chip. Still a checkbox, so it stays keyboard- and SR-navigable. */
function FacetChip({
  checked,
  onToggle,
  children,
  count,
}: {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <label className={`${styles.chip} ${checked ? styles.chipOn : ''}`}>
      <input type="checkbox" checked={checked} onChange={onToggle} className={styles.chipInput} />
      <span>{children}</span>
      {typeof count === 'number' && <span className={styles.chipCount}>{count}</span>}
    </label>
  );
}

export function ModelFilters({
  filters,
  onChange,
  providers,
  maxCost,
  fxRates,
  currency,
}: ModelFiltersProps) {
  const searchId = useId();
  const priceId = useId();
  const contextId = useId();

  const set = <K extends keyof ModelFilterState>(key: K, value: ModelFilterState[K]) =>
    onChange({ ...filters, [key]: value });

  // The slider's own ceiling means "no ceiling" — dragging fully right should
  // clear the filter rather than excluding the dearest model on a rounding edge.
  const priceValue = filters.maxBlendedCost ?? maxCost ?? 0;
  const priceLabel = formatLocalOrUsd(priceValue, fxRates, currency);

  return (
    <aside className={styles.rail} aria-label="Filter models">
      <div className={styles.field}>
        <label className={styles.legend} htmlFor={searchId}>
          Search
        </label>
        <input
          id={searchId}
          type="search"
          className={styles.search}
          placeholder="Model, provider, family…"
          value={filters.search}
          onChange={(event) => set('search', event.target.value)}
        />
      </div>

      {providers.length > 0 && (
        <fieldset className={styles.field}>
          <legend className={styles.legend}>Provider</legend>
          <div className={styles.chips}>
            {providers.map(({ provider, count }) => (
              <FacetChip
                key={provider}
                checked={filters.providers.includes(provider)}
                onToggle={() => set('providers', toggleValue(filters.providers, provider))}
                count={count}
              >
                {provider}
              </FacetChip>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className={styles.field}>
        <legend className={styles.legend}>Accepts</legend>
        <div className={styles.chips}>
          {MODALITIES.map((modality) => (
            <FacetChip
              key={modality}
              checked={filters.modalities.includes(modality)}
              onToggle={() => set('modalities', toggleValue(filters.modalities, modality))}
            >
              {MODALITY_LABELS[modality]}
            </FacetChip>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.field}>
        <legend className={styles.legend}>Capabilities</legend>
        <div className={styles.chips}>
          {MODEL_CAPABILITIES.map(({ key, label }) => (
            <FacetChip
              key={key}
              checked={filters.capabilities.includes(key)}
              onToggle={() =>
                set('capabilities', toggleValue(filters.capabilities, key as CapabilityKey))
              }
            >
              {label}
            </FacetChip>
          ))}
        </div>
      </fieldset>

      {maxCost !== null && (
        <div className={styles.field}>
          <label className={styles.legend} htmlFor={priceId}>
            Max price
            <span className={styles.legendValue}>
              {filters.maxBlendedCost === null ? 'Any' : `${priceLabel.text} / 1M`}
            </span>
          </label>
          <input
            id={priceId}
            type="range"
            className={styles.range}
            min={0}
            max={maxCost}
            step={maxCost > 20 ? 1 : 0.5}
            value={priceValue}
            onChange={(event) => {
              const next = Number(event.target.value);
              set('maxBlendedCost', next >= maxCost ? null : next);
            }}
          />
          <p className={styles.note}>Blended input/output rate per million tokens.</p>
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.legend} htmlFor={contextId}>
          Min context
        </label>
        <select
          id={contextId}
          className={styles.select}
          value={filters.minContext ?? ''}
          onChange={(event) =>
            set('minContext', event.target.value === '' ? null : Number(event.target.value))
          }
        >
          <option value="">Any</option>
          {CONTEXT_STEPS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {isFilterActive(filters) && (
        <button
          type="button"
          className={styles.clear}
          onClick={() => onChange(EMPTY_FILTERS)}
        >
          Clear all filters
        </button>
      )}
    </aside>
  );
}
