export interface FxRates {
  currencies: Record<string, { ratePerUsd: number }>;
  supported: string[];
  fetchedAt: number;
}

export type CurrencyCode = string;

const CURRENCY_LOCALES: Record<string, string> = {
  NGN: 'en-NG',
  GHS: 'en-GH',
  KES: 'en-KE',
  UGX: 'en-UG',
};

export function convertUsdToLocal(usdAmount: number, fxRates: FxRates, currencyCode: CurrencyCode): number {
  const rate = fxRates?.currencies?.[currencyCode]?.ratePerUsd;
  if (typeof rate !== 'number') {
    throw new Error(`convertUsdToLocal: no rate available for "${currencyCode}"`);
  }
  return usdAmount * rate;
}

export function formatCurrency(amount: number, currencyCode: CurrencyCode): string {
  const locale = CURRENCY_LOCALES[currencyCode] || 'en-US';
  // Minor units stop being meaningful once an amount runs into the
  // thousands (UGX, TZS, SLE...), so drop them there rather than printing
  // "USh 1,860.00".
  const fractionDigits = Math.abs(amount) >= 1000 ? 0 : 2;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(fractionDigits)}`;
  }
}

export function formatUsd(amount: number): string {
  if (amount > 0 && amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}

export function formatUsdAsLocal(usdAmount: number, fxRates: FxRates, currencyCode: CurrencyCode): string {
  const localAmount = convertUsdToLocal(usdAmount, fxRates, currencyCode);
  return formatCurrency(localAmount, currencyCode);
}

export function isCurrencySupported(fxRates: FxRates, currencyCode: CurrencyCode): boolean {
  return Boolean(fxRates?.currencies?.[currencyCode]);
}
