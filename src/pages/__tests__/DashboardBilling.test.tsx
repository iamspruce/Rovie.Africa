import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const getMe = vi.fn();
const getBalance = vi.fn();
const listPayments = vi.fn();
const getTopUpOptions = vi.fn();
const quoteTopUp = vi.fn();
const startTopUp = vi.fn();
const refreshPayment = vi.fn();

vi.mock('../../sdk', () => ({
  rovie: {
    portal: {
      getMe: (...a: unknown[]) => getMe(...a),
      getBalance: (...a: unknown[]) => getBalance(...a),
      listPayments: (...a: unknown[]) => listPayments(...a),
      getTopUpOptions: (...a: unknown[]) => getTopUpOptions(...a),
      quoteTopUp: (...a: unknown[]) => quoteTopUp(...a),
      startTopUp: (...a: unknown[]) => startTopUp(...a),
      refreshPayment: (...a: unknown[]) => refreshPayment(...a),
      signOut: vi.fn(),
    },
  },
}));

import { AuthProvider } from '../../context/AuthContext';
import { Billing } from '../Dashboard/Billing';

const NG_USER = {
  id: 'u1',
  email: 'dev@example.com',
  name: 'Dev',
  emailVerified: false,
  image: null,
  phone: null,
  country: 'NG',
  kycTier: 0,
  createdAt: new Date().toISOString(),
};

function renderBilling() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Billing />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Dashboard billing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMe.mockResolvedValue({ user: NG_USER, needsCountry: false });
    listPayments.mockResolvedValue({ payments: [] });
    getTopUpOptions.mockResolvedValue({
      payableCurrencies: ['NGN', 'UGX', 'GHS', 'KES'],
      methods: ['bank', 'crypto'],
      minUsdByMethod: { bank: 0.5, crypto: 1.45 },
      limits: {
        NGN: { minMinorByMethod: { bank: 63161, crypto: 183165 }, maxMinor: 63160022 },
      },
      policyMinUsd: 0.5,
      maxUsd: 500,
    });
    getBalance.mockResolvedValue({
      availableUsd: 12.5,
      spendUsd: 2,
      maxBudgetUsd: 14.5,
      localCurrency: 'NGN',
      availableLocal: 17053.2,
      spendLocal: 2728.5,
      maxBudgetLocal: 19781.7,
      currency: 'NGN',
      country: 'NG',
    });
  });

  it('leads with the local-currency figure and keeps dollars as the footnote', async () => {
    renderBilling();
    // ₦17,053 is the headline; $12.50 is present but secondary.
    expect(await screen.findByText(/17,053/)).toBeInTheDocument();
    expect(screen.getByText('$12.50')).toBeInTheDocument();
  });

  it('says so when it had to fall back to dollars', async () => {
    // A country whose currency has no FX rate: the server reports USD, and
    // the page must not label dollars with the user's own currency.
    getMe.mockResolvedValue({ user: { ...NG_USER, country: 'ER' }, needsCountry: false });
    getBalance.mockResolvedValue({
      availableUsd: 5,
      spendUsd: 0,
      maxBudgetUsd: 5,
      localCurrency: 'USD',
      availableLocal: 5,
      spendLocal: 0,
      maxBudgetLocal: 5,
      currency: 'USD',
      country: 'ER',
    });

    renderBilling();
    expect(
      await screen.findByText(/No exchange rate is available for your country/)
    ).toBeInTheDocument();
  });

  it('prices a top-up before taking any money', async () => {
    const user = userEvent.setup();
    quoteTopUp.mockResolvedValue({
      currency: 'NGN',
      amountMinor: 2000000,
      creditUsd: 15.83,
      markupPercent: 8,
      method: 'bank',
      indicative: true,
    });

    renderBilling();
    await user.type(await screen.findByLabelText('Amount'), '20000');

    await waitFor(() =>
      expect(quoteTopUp).toHaveBeenCalledWith({ currency: 'NGN', amountMinor: 2000000, method: 'bank' })
    );
    expect(await screen.findByText('$15.83')).toBeInTheDocument();
    expect(startTopUp).not.toHaveBeenCalled();
  });

  it('will not submit until a quote has come back', async () => {
    renderBilling();
    await screen.findByLabelText('Amount');
    expect(screen.getByRole('button', { name: 'Continue to payment' })).toBeDisabled();
  });

  it('defaults the currency to the user’s own when it is payable', async () => {
    renderBilling();
    const select = (await screen.findByLabelText('Currency')) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe('NGN'));
  });

  it('falls back to a payable currency and explains why', async () => {
    // South Africa: balance quotable in ZAR, but payments can't settle in it.
    getMe.mockResolvedValue({ user: { ...NG_USER, country: 'ZA' }, needsCountry: false });
    getBalance.mockResolvedValue({
      availableUsd: 1,
      spendUsd: 0,
      maxBudgetUsd: 1,
      localCurrency: 'ZAR',
      availableLocal: 18,
      spendLocal: 0,
      maxBudgetLocal: 18,
      currency: 'ZAR',
      country: 'ZA',
    });

    renderBilling();
    const select = (await screen.findByLabelText('Currency')) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe('NGN'));
    expect(await screen.findByText(/can't be settled in ZAR|can’t be settled in ZAR/)).toBeInTheDocument();
  });

  it('states the limits in the currency being paid in, not dollars', async () => {
    const user = userEvent.setup();
    renderBilling();

    // ₦631.61 and ₦631,600.22 — the figures the amount box is denominated in.
    // Both sit in one sentence split across text nodes, so assert on the
    // element rather than on each fragment.
    const limits = await screen.findByText(/Minimum/);
    expect(limits.textContent).toMatch(/631\.61/);
    expect(limits.textContent).toMatch(/631,600/);
    expect(limits.textContent).not.toMatch(/\$0\.50/);

    // The two floors genuinely differ, so one figure would mislead whichever
    // method it didn't apply to.
    await user.click(screen.getByRole('radio', { name: /Stablecoin/ }));
    // ₦1,831.65 rounds UP to ₦1,832 for display: rounding a minimum down
    // would print a figure the form rejects.
    await waitFor(() => expect(screen.getByText(/Minimum/).textContent).toMatch(/1,832/));
    expect(screen.getByText(/Minimum/).textContent).toMatch(/Bank transfers can be smaller/);
  });

  it('falls back to dollars when the server had no rate for that currency', async () => {
    getTopUpOptions.mockResolvedValue({
      payableCurrencies: ['NGN'],
      methods: ['bank', 'crypto'],
      minUsdByMethod: { bank: 0.5, crypto: 1.45 },
      limits: {}, // rate briefly unavailable
      policyMinUsd: 0.5,
      maxUsd: 500,
    });

    renderBilling();
    // Better a correct dollar figure than a wrong local one.
    expect((await screen.findByText(/Minimum/)).textContent).toMatch(/\$0\.50/);
  });

  it('re-prices when the method changes, since the floor moves with it', async () => {
    const user = userEvent.setup();
    quoteTopUp.mockResolvedValue({
      currency: 'NGN', amountMinor: 70000, creditUsd: 0.55, markupPercent: 8, method: 'bank', indicative: true,
    });

    renderBilling();
    await user.type(await screen.findByLabelText('Amount'), '700');
    await waitFor(() =>
      expect(quoteTopUp).toHaveBeenCalledWith({ currency: 'NGN', amountMinor: 70000, method: 'bank' })
    );

    await user.click(screen.getByRole('radio', { name: /Stablecoin/ }));
    // A stale quote from the other method must not survive the switch.
    await waitFor(() =>
      expect(quoteTopUp).toHaveBeenCalledWith({ currency: 'NGN', amountMinor: 70000, method: 'crypto' })
    );
  });

  it('points at bank transfer when stablecoin is under its floor', async () => {
    const user = userEvent.setup();
    const { RovieApiError } = await import('../../sdk/httpClient');
    quoteTopUp.mockRejectedValue(
      new RovieApiError('failed', {
        status: 400,
        body: {
          error: {
            code: 'below_minimum',
            message: "Stablecoin payments can't be less than about $1.45. Use a bank transfer for smaller amounts.",
          },
        },
      })
    );

    renderBilling();
    await user.click(await screen.findByRole('radio', { name: /Stablecoin/ }));
    await user.type(screen.getByLabelText('Amount'), '700');

    expect(await screen.findByText(/Use a bank transfer for smaller amounts/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue to payment' })).toBeDisabled();
  });

  it("passes the provider's own minimum through verbatim", async () => {
    const user = userEvent.setup();
    const { RovieApiError } = await import('../../sdk/httpClient');
    quoteTopUp.mockResolvedValue({
      currency: 'UGX', amountMinor: 200000, creditUsd: 0.58, markupPercent: 8, method: 'bank', indicative: true,
    });
    startTopUp.mockRejectedValue(
      new RovieApiError('failed', {
        status: 400,
        body: { error: { code: 'provider_refused', message: 'The minimum amount allowed for collection is 7300UGX' } },
      })
    );

    renderBilling();
    await user.type(await screen.findByLabelText('Amount'), '2000');
    await screen.findByText('$0.58');
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }));

    // Per-currency floors aren't modelled locally; IvoryPay names the exact
    // figure and that is what the user should read.
    expect(await screen.findByRole('alert')).toHaveTextContent('7300UGX');
  });

  it('offers a top-up with no API key, since credit belongs to the account', async () => {
    const user = userEvent.setup();
    quoteTopUp.mockResolvedValue({
      currency: 'NGN',
      amountMinor: 2000000,
      creditUsd: 15.83,
      markupPercent: 8,
      method: 'bank',
      indicative: true,
    });
    startTopUp.mockResolvedValue({
      checkoutUrl: 'https://checkout.ivorypay.io/api/abc',
      reference: 'abc',
      creditUsd: 15.83,
    });

    renderBilling();
    // Nothing in this flow consults the key list at all.
    await user.type(await screen.findByLabelText('Amount'), '20000');
    await screen.findByText('$15.83');
    expect(screen.getByRole('button', { name: 'Continue to payment' })).toBeEnabled();
  });

  it('defaults to bank transfer, not crypto', async () => {
    const user = userEvent.setup();
    quoteTopUp.mockResolvedValue({
      currency: 'NGN', amountMinor: 500000, creditUsd: 3.96, markupPercent: 8, method: 'bank', indicative: true,
    });
    startTopUp.mockResolvedValue({
      checkoutUrl: 'https://checkout.ivorypay.io/api/abc', reference: 'abc', creditUsd: 3.96, method: 'bank',
    });

    renderBilling();
    // Crypto-only was the reason top-ups looked unusable to someone with a
    // bank account and no stablecoin.
    const bank = (await screen.findByRole('radio', { name: /Bank transfer/ })) as HTMLInputElement;
    expect(bank.checked).toBe(true);

    await user.type(screen.getByLabelText('Amount'), '5000');
    await screen.findByText('$3.96');
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }));

    await waitFor(() =>
      expect(startTopUp).toHaveBeenCalledWith({ currency: 'NGN', amountMinor: 500000, method: 'bank' })
    );
  });

  it('sends the crypto method when that is chosen', async () => {
    const user = userEvent.setup();
    quoteTopUp.mockResolvedValue({
      currency: 'NGN', amountMinor: 500000, creditUsd: 3.96, markupPercent: 8, method: 'bank', indicative: true,
    });
    startTopUp.mockResolvedValue({
      checkoutUrl: 'https://checkout.ivorypay.io/api/abc', reference: 'abc', creditUsd: 3.96, method: 'crypto',
    });

    renderBilling();
    await user.click(await screen.findByRole('radio', { name: /Stablecoin/ }));
    await user.type(screen.getByLabelText('Amount'), '5000');
    await screen.findByText('$3.96');
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }));

    await waitFor(() =>
      expect(startTopUp).toHaveBeenCalledWith({ currency: 'NGN', amountMinor: 500000, method: 'crypto' })
    );
  });

  it('lets a pending payment be checked, and reports credit when it lands', async () => {
    const user = userEvent.setup();
    listPayments.mockResolvedValue({
      payments: [{
        id: 'p1', provider: 'ivorypay', currency: 'NGN', amountMinor: '500000',
        usdCreditedMicros: null, status: 'pending',
        createdAt: new Date().toISOString(), confirmedAt: null,
      }],
    });
    refreshPayment.mockResolvedValue({ status: 'success', changed: true, addedUsd: 3.96 });

    renderBilling();
    await user.click(await screen.findByRole('button', { name: 'Check payment' }));

    await waitFor(() => expect(refreshPayment).toHaveBeenCalledWith('p1'));
    expect(await screen.findByText(/Payment confirmed — \$3\.96 added/)).toBeInTheDocument();
  });

  it('says nothing has arrived rather than implying failure', async () => {
    const user = userEvent.setup();
    listPayments.mockResolvedValue({
      payments: [{
        id: 'p1', provider: 'ivorypay', currency: 'NGN', amountMinor: '500000',
        usdCreditedMicros: null, status: 'pending',
        createdAt: new Date().toISOString(), confirmedAt: null,
      }],
    });
    refreshPayment.mockResolvedValue({ status: 'pending', changed: false, awaitingPayment: true });

    renderBilling();
    await user.click(await screen.findByRole('button', { name: 'Check payment' }));

    expect(await screen.findByText(/No payment received yet/)).toBeInTheDocument();
  });

  it('offers no check on a settled payment', async () => {
    listPayments.mockResolvedValue({
      payments: [{
        id: 'p1', provider: 'ivorypay', currency: 'NGN', amountMinor: '500000',
        usdCreditedMicros: '3958200', status: 'success',
        createdAt: new Date().toISOString(), confirmedAt: new Date().toISOString(),
      }],
    });

    renderBilling();
    // "Credited" is also a column header, so scope the query to the row.
    const row = await screen.findByRole('row', { name: /3\.96/ });
    expect(within(row).getByText('Credited')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check payment' })).not.toBeInTheDocument();
  });

  it('surfaces a refused top-up instead of navigating', async () => {
    const user = userEvent.setup();
    const { RovieApiError } = await import('../../sdk/httpClient');
    quoteTopUp.mockResolvedValue({
      currency: 'NGN',
      amountMinor: 2000000,
      creditUsd: 15.83,
      markupPercent: 8,
      method: 'bank',
      indicative: true,
    });
    startTopUp.mockRejectedValue(
      new RovieApiError('failed', {
        status: 502,
        body: { error: { code: 'payment_unavailable', message: "Couldn't start the payment. Nothing has been charged — try again shortly." } },
      })
    );

    renderBilling();
    await user.type(await screen.findByLabelText('Amount'), '20000');
    await screen.findByText('$15.83');
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Nothing has been charged');
  });

  it('does not claim a payment succeeded just because the browser came back', async () => {
    listPayments.mockResolvedValue({
      payments: [
        {
          id: 'p1',
          provider: 'ivorypay',
          currency: 'NGN',
          amountMinor: '2000000',
          usdCreditedMicros: null,
          status: 'pending',
          createdAt: new Date().toISOString(),
          confirmedAt: null,
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/dashboard/billing?topup=return']}>
        <AuthProvider>
          <Billing />
        </AuthProvider>
      </MemoryRouter>
    );

    // Crediting is the webhook's job, so the copy must say "as soon as it
    // confirms", never "added".
    expect(await screen.findByText(/as soon as the payment confirms/)).toBeInTheDocument();
    expect(await screen.findByText('Waiting for payment')).toBeInTheDocument();
  });
});
