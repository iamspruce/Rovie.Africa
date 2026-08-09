import { Fragment, useState } from 'react';
import type { Model } from '../../lib/models';
import {
  cacheDiscountPercent,
  capabilitiesOf,
  formatMonth,
  formatTokenLimit,
  hasCost,
  inputModalities,
} from '../../lib/models';
import type { SortKey } from '../../lib/modelFilters';
import { formatLocalOrUsd, modelFamily } from '../../lib/pricing';
import type { FxRates } from '../../lib/currency';
import { ModelLogo } from '../ModelLogo/ModelLogo';
import styles from './ModelsTable.module.scss';

interface ModelsTableProps {
  models: Model[];
  fxRates?: FxRates | null;
  /** ISO 4217 code to quote in. Falls back to USD when absent or unquotable. */
  currency?: string;
  sort?: SortKey;
  onSortChange?: (sort: SortKey) => void;
}

/**
 * Columns that can be sorted from their header, and the sort key each one
 * cycles between. Two keys means the header toggles direction; one means it
 * only ever sorts one way (there's no useful "oldest first").
 */
const SORTABLE_COLUMNS: Partial<Record<string, SortKey[]>> = {
  provider: ['provider-asc'],
  context: ['context-desc'],
  cost: ['cost-asc', 'cost-desc'],
};

function SortableHeader({
  column,
  label,
  sort,
  onSortChange,
  align = 'left',
}: {
  column: keyof typeof SORTABLE_COLUMNS;
  label: string;
  sort?: SortKey;
  onSortChange?: (sort: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const keys = SORTABLE_COLUMNS[column] ?? [];
  const activeIndex = sort ? keys.indexOf(sort) : -1;
  const isActive = activeIndex !== -1;

  if (!onSortChange || keys.length === 0) {
    return <th scope="col">{label}</th>;
  }

  // Cycle to this column's next direction, or start it at its first.
  const next = isActive ? keys[(activeIndex + 1) % keys.length] : keys[0];
  const ariaSort = !isActive ? 'none' : sort!.endsWith('-desc') ? 'descending' : 'ascending';

  return (
    <th scope="col" aria-sort={ariaSort} className={align === 'right' ? styles.numeric : undefined}>
      <button
        type="button"
        className={`${styles.sortButton} ${isActive ? styles.sortActive : ''}`}
        onClick={() => onSortChange(next)}
      >
        {label}
        <span aria-hidden="true" className={styles.sortArrow}>
          {!isActive ? '↕' : ariaSort === 'descending' ? '↓' : '↑'}
        </span>
      </button>
    </th>
  );
}

function DetailRow({
  model,
  fxRates,
  currency,
  columnCount,
}: {
  model: Model;
  fxRates?: FxRates | null;
  currency?: string;
  columnCount: number;
}) {
  const cacheDiscount = cacheDiscountPercent(model);
  const cacheRead =
    typeof model.cost?.cache_read === 'number'
      ? formatLocalOrUsd(model.cost.cache_read, fxRates, currency).text
      : null;

  const facts: { label: string; value: string }[] = [
    { label: 'API model name', value: model.litellmModelName },
    { label: 'Accepts', value: inputModalities(model).join(', ') },
    { label: 'Context window', value: formatTokenLimit(model.limit?.context as number) },
    { label: 'Max output', value: formatTokenLimit(model.limit?.output as number) },
  ];

  if (!hasCost(model)) {
    facts.push({ label: 'Pricing', value: 'Not published for this model' });
  }

  const released = formatMonth(model.release_date);
  if (released) facts.push({ label: 'Released', value: released });
  const knowledge = formatMonth(model.knowledge);
  if (knowledge) facts.push({ label: 'Knowledge cutoff', value: knowledge });
  if (cacheRead) {
    facts.push({
      label: 'Cached input',
      value: cacheDiscount ? `${cacheRead} / 1M · ${cacheDiscount}% off` : `${cacheRead} / 1M`,
    });
  }

  return (
    <tr className={styles.detailRow}>
      <td colSpan={columnCount}>
        <div className={styles.detail}>
          {model.description && <p className={styles.description}>{model.description}</p>}
          <dl className={styles.facts}>
            {facts.map(({ label, value }) => (
              <div key={label} className={styles.fact}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </td>
    </tr>
  );
}

export function ModelsTable({ models, fxRates, currency, sort, onSortChange }: ModelsTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  if (!models || models.length === 0) {
    return <p className={styles.empty}>No models are available right now.</p>;
  }

  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const price = (usd?: number) =>
    typeof usd === 'number' ? formatLocalOrUsd(usd, fxRates, currency).text : null;

  const COLUMN_COUNT = 6;

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Model</th>
          <SortableHeader
            column="provider"
            label="Provider"
            sort={sort}
            onSortChange={onSortChange}
          />
          <SortableHeader
            column="context"
            label="Context"
            sort={sort}
            onSortChange={onSortChange}
            align="right"
          />
          <SortableHeader
            column="cost"
            label="Input / 1M"
            sort={sort}
            onSortChange={onSortChange}
            align="right"
          />
          <th scope="col" className={styles.numeric}>
            Output / 1M
          </th>
          <th scope="col">
            <span className={styles.srOnly}>Details</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {models.map((model) => {
          const isOpen = expanded.has(model.litellmModelName);
          const capabilities = capabilitiesOf(model);
          return (
            <Fragment key={model.litellmModelName}>
              <tr className={isOpen ? styles.openRow : undefined}>
                <th scope="row" className={styles.modelCell}>
                  <ModelLogo
                    family={modelFamily(model)}
                    fallbackLabel={model.provider}
                    className={styles.logo}
                  />
                  <span className={styles.modelText}>
                    <span className={styles.modelName}>{model.name}</span>
                    {capabilities.length > 0 && (
                      <span className={styles.badges}>
                        {capabilities.map(({ key, label }) => (
                          <span key={key} className={styles.badge}>
                            {label}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </th>
                <td className={styles.provider}>{model.provider}</td>
                <td className={styles.numeric}>
                  {formatTokenLimit(model.limit?.context as number)}
                </td>
                {/* An unpriced model still belongs in the table — it's callable.
                    A dash keeps the numeric columns readable; the detail row
                    says why in words. */}
                <td className={styles.numeric}>
                  {hasCost(model) ? price(model.cost!.input) : <span className={styles.unpriced}>—</span>}
                </td>
                <td className={styles.numeric}>
                  {hasCost(model) ? price(model.cost!.output) : <span className={styles.unpriced}>—</span>}
                </td>
                <td className={styles.expandCell}>
                  <button
                    type="button"
                    className={styles.expand}
                    aria-expanded={isOpen}
                    onClick={() => toggle(model.litellmModelName)}
                  >
                    {/* "Details" is enough next to the row it belongs to, but a
                        screen reader hears these buttons out of that context —
                        so the accessible name carries the model name. */}
                    <span aria-hidden="true">{isOpen ? 'Hide' : 'Details'}</span>
                    <span className={styles.srOnly}>
                      {`${isOpen ? 'Hide' : 'Show'} details for ${model.name}`}
                    </span>
                  </button>
                </td>
              </tr>
              {isOpen && (
                <DetailRow
                  model={model}
                  fxRates={fxRates}
                  currency={currency}
                  columnCount={COLUMN_COUNT}
                />
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
