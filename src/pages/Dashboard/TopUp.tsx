import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/Button/Button';
import { useAuth } from '../../context/AuthContext';
import { currencyForAlpha2 } from '../../lib/d3/africaCountries';
import { formatCurrency, formatUsd } from '../../lib/currency';
import { rovie } from '../../sdk';
import { isAbortError, RovieApiError } from '../../sdk/httpClient';
import type { PaymentMethod, TopUpOptions, TopUpQuote } from '../../sdk/portalService';
import { Card, ErrorNote } from './DashboardUi';
import styles from './TopUp.module.scss';

/** Local major units -> minor units, as an integer. */
function toMinor(amount: string): number | null {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100);
}

/**
 * A limit in the currency the amount box is in.
 *
 * Falls back to the USD figure when the server had no rate for that currency,
 * rather than converting client-side - the server is the authority on what
 * the validator will accept, and a second conversion here could disagree
 * with it by a rounding step.
 */
function formatLimit(
  options: TopUpOptions,
  method: PaymentMethod,
  currency: string,
  bound: 'min' | 'max'
): string {
  const local = options.limits?.[currency];
  if (local) {
    const minor = bound === 'min' ? local.minMinorByMethod[method] : local.maxMinor;
    const major = minor / 100;

    // formatCurrency drops the minor units above 1000, because they stop
    // being meaningful for UGX/NGN-scale amounts. That rounding has to go
    // OUTWARD from the accepted range, or the figure printed here is one the
    // form then rejects: a minimum of ₦1,831.65 shown as "₦1,831" is under
    // the minimum, and a maximum shown rounded up is over it.
    const rounded =
      Math.abs(major) >= 1000 ? (bound === 'min' ? Math.ceil(major) : Math.floor(major)) : major;

    return formatCurrency(rounded, currency);
  }
  return formatUsd(bound === 'min' ? options.minUsdByMethod[method] : options.maxUsd);
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof RovieApiError) {
    const body = err.body as { error?: { message?: string } } | null;
    if (body?.error?.message) return body.error.message;
  }
  return fallback;
}

/**
 * Buying credit.
 *
 * The user names an amount in their own currency; payment is collected by
 * IvoryPay in a stablecoin, and credit is added by its webhook — not on the
 * browser's return. That ordering matters: someone who closes the tab after
 * paying still gets their credit, and nobody can grant themselves credit by
 * forging a return URL.
 */
export function TopUp({ onStarted }: { onStarted?: () => void }) {
  const { user, needsCountry } = useAuth();
  const [options, setOptions] = useState<TopUpOptions | null>(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('');
  // Bank transfer by default: most of Rovie's users have a bank account and
  // no stablecoin, and the crypto-only flow was the reason top-ups looked
  // unusable.
  const [method, setMethod] = useState<PaymentMethod>('bank');
  const [quote, setQuote] = useState<TopUpQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const homeCurrency = currencyForAlpha2(user?.country);

  useEffect(() => {
    const controller = new AbortController();
    rovie.portal
      .getTopUpOptions(controller.signal)
      .then((next) => {
        setOptions(next);
        // Default to the user's own currency when it's one we can settle in,
        // otherwise the first that is - never leave the field empty, since a
        // blank currency is not a meaningful choice here.
        setCurrency((current) => {
          if (current) return current;
          if (homeCurrency && next.payableCurrencies.includes(homeCurrency)) return homeCurrency;
          return next.payableCurrencies[0] ?? '';
        });
      })
      .catch((err: unknown) => {
        if (!isAbortError(err)) setError('Could not load payment options. Refresh to try again.');
      });
    return () => controller.abort();
  }, [homeCurrency]);

  // Re-price as the amount changes, debounced. The quote is what the user is
  // deciding on, so it has to track the field rather than only appear on
  // submit - but every keystroke hitting the FX path would be wasteful.
  const debounce = useRef<number | undefined>(undefined);
  useEffect(() => {
    const minor = toMinor(amount);
    if (!minor || !currency) {
      setQuote(null);
      setQuoteError(null);
      return;
    }

    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => {
      rovie.portal
        .quoteTopUp({ currency, amountMinor: minor, method })
        .then((next) => {
          setQuote(next);
          setQuoteError(null);
        })
        .catch((err: unknown) => {
          setQuote(null);
          setQuoteError(errorMessage(err, 'Could not price that amount.'));
        });
    }, 400);

    return () => window.clearTimeout(debounce.current);
    // `method` is a dependency because the minimum depends on it: $0.60 is
    // fine by bank and refused in stablecoin, so switching must re-price
    // rather than leave a stale quote on screen.
  }, [amount, currency, method]);

  const presets = useMemo(() => {
    // Round local-currency amounts rather than converted dollar figures, so
    // the buttons read as money someone would actually choose to send.
    if (currency === 'NGN') return [5000, 10000, 25000, 50000];
    if (currency === 'KES') return [500, 1000, 2500, 5000];
    if (currency === 'GHS') return [50, 100, 250, 500];
    if (currency === 'UGX') return [20000, 50000, 100000, 200000];
    return [10, 25, 50, 100];
  }, [currency]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const minor = toMinor(amount);
    if (!minor || !currency) return;

    setSubmitting(true);
    setError(null);
    try {
      const charge = await rovie.portal.startTopUp({ currency, amountMinor: minor, method });
      onStarted?.();
      // Full-page navigation, not a new tab: a popup here is blocked as often
      // as not, and the user is meant to come back to the dashboard after.
      window.location.href = charge.checkoutUrl;
    } catch (err) {
      setError(errorMessage(err, 'Could not start the payment. Nothing has been charged.'));
      setSubmitting(false);
    }
  }

  if (needsCountry) {
    return (
      <Card title="Add credit" description="Set your country first — it decides which currencies you can pay in.">
        <p className={styles.blocked}>
          <Link to="/dashboard/account">Set your country</Link> to add credit.
        </p>
      </Card>
    );
  }

  const canPayInHomeCurrency = Boolean(
    homeCurrency && options?.payableCurrencies.includes(homeCurrency)
  );

  return (
    <Card
      title="Add credit"
      description="Pay in your own currency. Credit is added to your account once the payment confirms."
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.amountRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="topup-currency">
              Currency
            </label>
            <select
              id="topup-currency"
              className={styles.select}
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              disabled={submitting || !options}
            >
              {(options?.payableCurrencies ?? []).map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="topup-amount">
              Amount
            </label>
            <input
              id="topup-amount"
              className={styles.input}
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ''))}
              placeholder="0.00"
              disabled={submitting}
              required
            />
          </div>
        </div>

        <div className={styles.presets}>
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={styles.preset}
              onClick={() => setAmount(String(preset))}
              disabled={submitting}
            >
              {formatCurrency(preset, currency || 'USD')}
            </button>
          ))}
        </div>

        <fieldset className={styles.methods}>
          <legend className={styles.label}>How do you want to pay?</legend>
          <label className={method === 'bank' ? styles.methodActive : styles.method}>
            <input
              type="radio"
              name="topup-method"
              value="bank"
              checked={method === 'bank'}
              onChange={() => setMethod('bank')}
              disabled={submitting}
            />
            <span>
              <strong>Bank transfer</strong>
              <span className={styles.methodNote}>
                Pay from your bank account in {currency || 'your currency'}.
              </span>
            </span>
          </label>
          <label className={method === 'crypto' ? styles.methodActive : styles.method}>
            <input
              type="radio"
              name="topup-method"
              value="crypto"
              checked={method === 'crypto'}
              onChange={() => setMethod('crypto')}
              disabled={submitting}
            />
            <span>
              <strong>Stablecoin</strong>
              <span className={styles.methodNote}>Send USDT from a crypto wallet.</span>
            </span>
          </label>
        </fieldset>

        {/* What they get, in the units the balance is kept in. Labelled
            approximate because IvoryPay applies its own rate at checkout. */}
        {quote && (
          <p className={styles.quote}>
            You&apos;ll receive <strong>{formatUsd(quote.creditUsd)}</strong> of credit.
            <span className={styles.quoteNote}>
              The exact amount to pay is set by the payment page, which uses its own exchange rate.
            </span>
          </p>
        )}
        {quoteError && <p className={styles.quoteError}>{quoteError}</p>}

        {!canPayInHomeCurrency && homeCurrency && options && (
          <p className={styles.note}>
            Payments can&apos;t be settled in {homeCurrency} yet, so choose one of the currencies
            above. Your balance is still shown in {homeCurrency}.
          </p>
        )}

        {error && <ErrorNote>{error}</ErrorNote>}

        <div>
          <Button type="submit" disabled={submitting || !quote}>
            {submitting ? 'Opening payment…' : 'Continue to payment'}
          </Button>
        </div>

        {options && (
          <p className={styles.rail}>
            {/* Stated in the currency of the amount box above, and per method,
                because the two floors genuinely differ. */}
            Minimum {formatLimit(options, method, currency, 'min')}, maximum{' '}
            {formatLimit(options, method, currency, 'max')} per payment.
            {options.minUsdByMethod[method] > options.policyMinUsd
              ? ' Bank transfers can be smaller.'
              : ''}
          </p>
        )}
      </form>
    </Card>
  );
}
