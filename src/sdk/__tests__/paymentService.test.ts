import { describe, it, expect } from 'vitest';
import { initiatePayment } from '../paymentService';
import type { InitiatePaymentPayload } from '../paymentService';

describe('initiatePayment validation', () => {
  it('throws when userId is missing', () => {
    expect(() =>
      initiatePayment({ currency: 'NGN', amountMinor: 500000 } as InitiatePaymentPayload)
    ).toThrow(/userId/i);
  });

  it('throws when currency is missing', () => {
    expect(() =>
      initiatePayment({ userId: 'u1', amountMinor: 500000 } as InitiatePaymentPayload)
    ).toThrow(/currency/i);
  });

  it('throws when amountMinor is not a positive integer', () => {
    expect(() =>
      initiatePayment({ userId: 'u1', currency: 'NGN', amountMinor: -5 } as InitiatePaymentPayload)
    ).toThrow(/amountMinor/i);
    expect(() =>
      initiatePayment({ userId: 'u1', currency: 'NGN', amountMinor: 1.5 } as InitiatePaymentPayload)
    ).toThrow(/amountMinor/i);
    expect(() =>
      initiatePayment({ userId: 'u1', currency: 'NGN', amountMinor: 0 } as InitiatePaymentPayload)
    ).toThrow(/amountMinor/i);
  });

  it('passes validation with correct arguments', () => {
    let result;
    expect(() => {
      result = initiatePayment({ userId: 'u1', currency: 'NGN', amountMinor: 500000 } as InitiatePaymentPayload);
    }).not.toThrow();
    expect(result).toBeInstanceOf(Promise);
    (result as unknown as Promise<unknown>).catch(() => {});
  });
});
