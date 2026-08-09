import { apiCall } from './httpClient';
import { config } from './config';

export interface InitiatePaymentPayload {
  userId: string;
  currency: string;
  amountMinor: number;
  apiKey: string;
}

export function initiatePayment({ userId, currency, amountMinor, apiKey }: InitiatePaymentPayload): Promise<unknown> {
  if (!userId) throw new Error('initiatePayment: "userId" is required');
  if (!currency) throw new Error('initiatePayment: "currency" is required');
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new Error('initiatePayment: "amountMinor" must be a positive integer');
  }
  return apiCall({
    baseUrl: config.paymentServiceUrl,
    path: '/payments/initiate',
    method: 'POST',
    body: { userId, currency, amountMinor },
    apiKey,
  });
}
