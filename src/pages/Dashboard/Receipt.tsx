import { formatCurrency, formatUsd } from '../../lib/currency';
import type { PortalPayment, PortalUser } from '../../sdk/portalService';

/**
 * A printable receipt for one confirmed top-up.
 *
 * Built in the browser from data the dashboard already holds rather than
 * fetched from a receipts endpoint: every figure on it - what was paid, at
 * what rate, what credit it produced - is already in the Payment record, and
 * a second source would be a second thing that can disagree with the ledger.
 *
 * Opened in a new window and handed to the browser's own print dialog, which
 * is also how it becomes a PDF. No print stylesheet on the dashboard itself,
 * because printing the dashboard is not the same job.
 */
export function openReceipt(payment: PortalPayment, user: PortalUser | null): void {
  const win = window.open('', '_blank', 'width=720,height=900');
  if (!win) return; // popup blocked — the caller's link still works on retry

  win.document.write(receiptHtml(payment, user));
  win.document.close();
  win.focus();
  win.print();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMinor(amountMinor: string, currency: string): string {
  const asNumber = Number(amountMinor) / 100;
  if (!Number.isFinite(asNumber)) return `${currency} ${amountMinor}`;
  return formatCurrency(asNumber, currency);
}

function receiptHtml(payment: PortalPayment, user: PortalUser | null): string {
  const credited = payment.usdCreditedMicros
    ? formatUsd(Number(payment.usdCreditedMicros) / 1_000_000)
    : '—';
  const paid = formatMinor(payment.amountMinor, payment.currency);
  const date = new Date(payment.confirmedAt ?? payment.createdAt).toLocaleString();

  const rows: [string, string][] = [
    ['Receipt', payment.id],
    ['Date', date],
    ['Account', user?.email ?? user?.id ?? '—'],
    ['Paid', paid],
    ['Credit added', credited],
    ['Payment method', payment.provider],
    ['Status', payment.status === 'success' ? 'Paid' : payment.status],
  ];

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Rovie receipt ${escapeHtml(payment.id)}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; color: #111; margin: 48px; line-height: 1.5; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .muted { color: #666; font-size: 13px; margin: 0 0 32px; }
  table { border-collapse: collapse; width: 100%; max-width: 520px; }
  th, td { text-align: left; padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-size: 14px; vertical-align: top; }
  th { color: #666; font-weight: 500; width: 40%; }
  td { font-variant-numeric: tabular-nums; }
  footer { margin-top: 32px; font-size: 12px; color: #666; max-width: 520px; }
</style>
</head>
<body>
  <h1>Rovie Route</h1>
  <p class="muted">Prepaid Route API credit</p>
  <table>
    ${rows
      .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
      .join('\n    ')}
  </table>
  <footer>
    Credit is prepaid, does not expire and is shared by every API key on this account.
  </footer>
</body>
</html>`;
}
