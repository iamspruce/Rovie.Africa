import * as account from './accountService';
import * as payment from './paymentService';
import * as litellm from './litellmService';
import * as geo from './geoService';
import * as portal from './portalService';

export { RovieApiError } from './httpClient';
export { config, PAYABLE_CURRENCIES, REFERENCE_USD_AMOUNT } from './config';
export type { Config } from './config';
export type {
  RegisterUserPayload,
  GetFxRatesOptions,
  GetModelsOptions,
  GetRankingsOptions,
  IssueApiKeyPayload,
} from './accountService';
export type { InitiatePaymentPayload } from './paymentService';
export type { ChatCompletionPayload } from './litellmService';
export type { DetectVisitorCountryResponse } from './geoService';
export type {
  PortalUser,
  MeResponse,
  AuthMethods,
  SocialProvider,
  ApiKeySummary,
  ApiKeyUsage,
  ApiKeyLimits,
  PortalBalance,
  PortalPayment,
  ClientConfig,
  UsageSnapshot,
  UsageTotals,
  UsageTrendPoint,
  UsageByModel,
  UsageByProvider,
  UsageByProject,
  UsageSessions,
  UsageLatency,
  UsageRequest,
} from './portalService';

export const rovie: {
  account: typeof account;
  payment: typeof payment;
  litellm: typeof litellm;
  geo: typeof geo;
  portal: typeof portal;
} = {
  account,
  payment,
  litellm,
  geo,
  // Session-authenticated calls: sign-in/up and everything under /me. The
  // browser holds a cookie for these, never an internal key.
  portal,
};

export default rovie;
