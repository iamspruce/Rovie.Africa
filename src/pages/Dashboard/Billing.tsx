import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePortalBalance } from '../../hooks/usePortalBalance';
import { formatCurrency, formatUsd } from '../../lib/currency';
import { rovie } from '../../sdk';
import { isAbortError } from '../../sdk/httpClient';
import type { PortalPayment } from '../../sdk/portalService';
import { Card, Empty, ErrorNote, FormNotice, Pending, Stat, StatRow, TableWrap } from './DashboardUi';
import { TopUp } from './TopUp';
import { BalanceAlert } from './BalanceAlert';
import { openReceipt } from './Receipt';
import styles from './Billing.module.scss';

const STATUS_LABEL: Record<PortalPayment['status'], string> = {
  pending: 'Waiting for payment',
  success: 'Credited',
  failed: 'Failed',
  expired: 'Expired',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Minor units (kobo, cents) arrive as a string because they can exceed 2^53. */
function formatMinor(amountMinor: string, currency: string): string {
  const asNumber = Number(amountMinor) / 100;
  if (!Number.isFinite(asNumber)) return `${currency} ${amountMinor}`;
  return formatCurrency(asNumber, currency);
}

export function Billing() {
  const { user } = useAuth();
  const balance = usePortalBalance();
  const [params, setParams] = useSearchParams();
  const [payments, setPayments] = useState<PortalPayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [checking, setChecking] = useState<string | null>(null);
  const [checkNote, setCheckNote] = useState<string | null>(null);

  // Set when the browser comes back from the payment page. It means the user
  // returned, NOT that they paid - crediting is the webhook's job. The copy
  // says so rather than claiming a top-up landed.
  const returned = params.get('topup') === 'return';

  useEffect(() => {
    const controller = new AbortController();

    rovie.portal
      .listPayments(controller.signal)
      .then(({ payments: list }) => setPayments(list))
      .catch((err: unknown) => {
        if (!isAbortError(err)) setError('Could not load your payments. Refresh to try again.');
      });

    return () => controller.abort();
  }, [reloadToken]);

  // Pending payments don't settle themselves here: crediting is driven by the
  // provider's webhook, which needs a publicly reachable URL. This asks the
  // provider directly, which is the only thing that works on a laptop and a
  // useful safety net anywhere.
  async function handleCheck(paymentId: string) {
    setChecking(paymentId);
    setCheckNote(null);
    try {
      const result = await rovie.portal.refreshPayment(paymentId);
      if (result.changed && result.addedUsd) {
        setCheckNote(`Payment confirmed — ${formatUsd(result.addedUsd)} added to your balance.`);
        void balance.reload();
      } else if (result.awaitingPayment) {
        setCheckNote('No payment received yet. If you\u2019ve just paid, give it a minute.');
      } else {
        setCheckNote(`Still ${result.status}.`);
      }
      setReloadToken((n) => n + 1);
    } catch {
      setCheckNote('Could not check that payment. Try again shortly.');
    } finally {
      setChecking(null);
    }
  }

  const localCurrency = balance.data?.localCurrency;
  // True when we quoted dollars because the user's own currency has no rate.
  const quotedInUsd = !localCurrency || localCurrency === 'USD';

  return (
    <>
      {returned && (
        <FormNotice>
          <span>
            Payment page closed. Credit appears here as soon as the payment confirms — that can take
            a few minutes.{' '}
            <button
              type="button"
              className={styles.refresh}
              onClick={() => {
                setReloadToken((n) => n + 1);
                void balance.reload();
                params.delete('topup');
                setParams(params, { replace: true });
              }}
            >
              Check now
            </button>
          </span>
        </FormNotice>
      )}

      <Card title="Route credit" description="Prepaid credit, shared by every Route key. It doesn't expire or reset.">
        {balance.error ? (
          <ErrorNote>{balance.error}</ErrorNote>
        ) : (
          <StatRow>
            {/* Local currency is the figure, dollars the footnote. The whole
                premise of the product is quoting people in their own money,
                so the number they read first is the one in it. */}
            <Stat
              label="Available"
              value={
                balance.data
                  ? quotedInUsd
                    ? formatUsd(balance.data.availableUsd)
                    : formatCurrency(balance.data.availableLocal, localCurrency!)
                  : '—'
              }
              note={balance.data && !quotedInUsd ? `${formatUsd(balance.data.availableUsd)}` : undefined}
            />
            <Stat
              label="Spent so far"
              value={
                balance.data
                  ? quotedInUsd
                    ? formatUsd(balance.data.spendUsd)
                    : formatCurrency(balance.data.spendLocal, localCurrency!)
                  : '—'
              }
              note={balance.data && !quotedInUsd ? `${formatUsd(balance.data.spendUsd)}` : undefined}
            />
            <Stat
              label="Topped up"
              value={
                balance.data
                  ? quotedInUsd
                    ? formatUsd(balance.data.maxBudgetUsd)
                    : formatCurrency(balance.data.maxBudgetLocal, localCurrency!)
                  : '—'
              }
              note="Lifetime total"
            />
          </StatRow>
        )}

        {balance.data && quotedInUsd && user?.country && (
          <p className={styles.rateNote}>
            {/* Honest about the gap rather than silently labelling dollars
                with the user's own currency. */}
            No exchange rate is available for your country&apos;s currency, so amounts are shown in
            US dollars.
          </p>
        )}
      </Card>

      <TopUp onStarted={() => setReloadToken((n) => n + 1)} />

      <BalanceAlert />

      <Card
        title="Payment history"
        description="Credit is added when a payment confirms. Check a pending one if it's taking a while."
      >
        {error && <ErrorNote>{error}</ErrorNote>}
        {checkNote && <FormNotice>{checkNote}</FormNotice>}
        {payments === null && !error && <Pending label="Loading your payments…" />}
        {payments !== null && payments.length === 0 && (
          <Empty>No payments yet. Add credit above and every top-up is listed here.</Empty>
        )}

        {payments !== null && payments.length > 0 && (
          <TableWrap>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Paid</th>
                  <th scope="col">Credited</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className={styles.srOnly}>Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDateTime(payment.createdAt)}</td>
                    <td className={styles.numeric}>
                      {formatMinor(payment.amountMinor, payment.currency)}
                    </td>
                    <td className={styles.numeric}>
                      {payment.usdCreditedMicros
                        ? formatUsd(Number(payment.usdCreditedMicros) / 1_000_000)
                        : '—'}
                    </td>
                    <td>
                      <span className={styles[`status-${payment.status}`]}>
                        {STATUS_LABEL[payment.status]}
                      </span>
                    </td>
                    <td>
                      {payment.status === 'pending' && (
                        <button
                          type="button"
                          className={styles.refresh}
                          onClick={() => handleCheck(payment.id)}
                          disabled={checking === payment.id}
                        >
                          {checking === payment.id ? 'Checking…' : 'Check payment'}
                        </button>
                      )}
                      {/* Only a settled payment has a receipt to give: a
                          pending one has no confirmed amount or date on it. */}
                      {payment.status === 'success' && (
                        <button
                          type="button"
                          className={styles.refresh}
                          onClick={() => openReceipt(payment, user ?? null)}
                        >
                          Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
