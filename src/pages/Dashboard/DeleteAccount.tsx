import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button/Button';
import { useAuth } from '../../context/AuthContext';
import { usePortalBalance } from '../../hooks/usePortalBalance';
import { formatCurrency, formatUsd } from '../../lib/currency';
import { rovie } from '../../sdk';
import { isAbortError, RovieApiError } from '../../sdk/httpClient';
import type { DeletionPreview } from '../../sdk/portalService';
import { Card, ErrorNote } from './DashboardUi';
import styles from './DeleteAccount.module.scss';

const CONFIRM_PHRASE = 'delete my account';

/**
 * Deleting an account.
 *
 * Two things make this more than a confirm dialog:
 *
 *  - Unspent credit is forfeited, and the user is told the real figure in
 *    their own currency rather than warned about it in the abstract. The
 *    server independently refuses unless the balance is acknowledged.
 *  - An account that has ever paid keeps an anonymised row so the payment
 *    ledger stays intact. That's a materially different promise from
 *    "everything is erased", so it's stated up front rather than buried.
 */
export function DeleteAccount() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const balance = usePortalBalance();
  const [preview, setPreview] = useState<DeletionPreview | null>(null);
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    rovie.portal
      .getDeletionPreview(controller.signal)
      .then(setPreview)
      .catch((err: unknown) => {
        if (!isAbortError(err)) setError('Could not check your account. Try again shortly.');
      });
    return () => controller.abort();
  }, [open]);

  const localCurrency = balance.data?.localCurrency;
  const quotedInUsd = !localCurrency || localCurrency === 'USD';
  const hasCredit = (preview?.availableUsd ?? 0) > 0;
  const canDelete = phrase.trim().toLowerCase() === CONFIRM_PHRASE && !deleting && preview !== null;

  async function handleDelete() {
    if (!preview) return;
    setDeleting(true);
    setError(null);
    try {
      await rovie.portal.deleteAccount(preview.availableUsd);
      // Clear local state before navigating so no stale user is rendered on
      // the way out.
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof RovieApiError) {
        const body = err.body as { error?: { message?: string }; availableUsd?: number } | null;
        // 409 means the balance moved between the preview and the confirm.
        // Re-read it rather than letting the user retry against a stale number.
        if (err.status === 409 && typeof body?.availableUsd === 'number') {
          setPreview({ ...preview, availableUsd: body.availableUsd });
        }
        setError(body?.error?.message ?? 'Could not delete your account. Try again shortly.');
      } else {
        setError('Could not delete your account. Try again shortly.');
      }
      setDeleting(false);
    }
  }

  if (!open) {
    return (
      <Card
        title="Delete account"
        description="Closes your account and revokes every API key. Unspent credit is not refunded."
      >
        <Button variant="danger" onClick={() => setOpen(true)}>
          Delete account
        </Button>
      </Card>
    );
  }

  return (
    <Card title="Delete account" description="Read this before confirming — it can't be undone.">
      <div className={styles.panel}>
        {preview === null && !error && <p className={styles.checking}>Checking your account…</p>}

        {preview && (
          <>
            <ul className={styles.consequences}>
              <li>
                <strong>{preview.activeKeys}</strong>{' '}
                {preview.activeKeys === 1 ? 'API key stops' : 'API keys stop'} working immediately.
                Anything using {preview.activeKeys === 1 ? 'it' : 'them'} starts failing.
              </li>

              {!preview.balanceKnown ? (
                <li className={styles.warn}>
                  {/* Never imply there's nothing to lose on a figure we
                      couldn't read. */}
                  Your balance couldn&apos;t be read just now, so we can&apos;t tell you what
                  you&apos;d be giving up. Try again in a moment.
                </li>
              ) : hasCredit ? (
                <li className={styles.warn}>
                  You have{' '}
                  <strong>
                    {quotedInUsd || !balance.data
                      ? formatUsd(preview.availableUsd)
                      : formatCurrency(balance.data.availableLocal, localCurrency!)}
                  </strong>{' '}
                  of unspent credit
                  {!quotedInUsd && balance.data ? ` (${formatUsd(preview.availableUsd)})` : ''}.{' '}
                  <strong>It is forfeited and cannot be refunded.</strong>
                </li>
              ) : (
                <li>You have no unspent credit, so nothing is forfeited.</li>
              )}

              {preview.retainsLedger ? (
                <li>
                  Your name, email and phone number are erased. Your {preview.paymentCount}{' '}
                  {preview.paymentCount === 1 ? 'payment' : 'payments'} stay on record without them —
                  we&apos;re required to keep a financial record of money received.
                </li>
              ) : (
                <li>You&apos;ve never made a payment, so your account is erased outright.</li>
              )}

              <li>
                Signing up again with {user?.email ?? 'the same email'} creates a completely new
                account. Nothing is restored.
              </li>
            </ul>

            <label className={styles.confirmField}>
              <span className={styles.confirmLabel}>
                Type <code>{CONFIRM_PHRASE}</code> to confirm
              </span>
              <input
                type="text"
                className={styles.input}
                value={phrase}
                onChange={(event) => setPhrase(event.target.value)}
                autoComplete="off"
                disabled={deleting || !preview.balanceKnown}
              />
            </label>
          </>
        )}

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className={styles.actions}>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={!canDelete || !preview?.balanceKnown}
          >
            {deleting ? 'Deleting…' : 'Delete my account'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setOpen(false);
              setPhrase('');
              setError(null);
            }}
            disabled={deleting}
          >
            Keep my account
          </Button>
        </div>
      </div>
    </Card>
  );
}
