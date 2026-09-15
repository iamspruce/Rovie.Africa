export interface Config {
  accountServiceUrl: string;
  portalApiUrl: string;
  paymentServiceUrl: string;
  litellmUrl: string;
  ipGeolocationUrl: string;
}

const isProd = import.meta.env.PROD;
const isRouteApp =
  import.meta.env.VITE_APP_TARGET === 'route' ||
  (typeof window !== 'undefined' &&
    (window.location.hostname === 'route.rovie.africa' ||
      window.location.hostname.includes('route') ||
      window.location.port === '5174'));

// Per-service Fly.io URLs (scale-to-zero, ~300ms cold start)
const PROD_ACCOUNT_URL  = 'https://rovie-account-service.fly.dev';
const PROD_PORTAL_URL   = 'https://rovie-portal-api.fly.dev';
const PROD_PAYMENT_URL  = 'https://rovie-payment-service.fly.dev';
const PROD_LITELLM_URL  = 'https://api.rovie.africa';
const ROUTE_PRODUCTION_ORIGIN = 'https://route.rovie.africa';
const browserOrigin = typeof window !== 'undefined' ? window.location.origin : ROUTE_PRODUCTION_ORIGIN;

export const config: Config = {
  // In dev this is a same-origin path, not an origin: the Vite server proxies
  // /api/account to account-service and attaches the shared secret there, so
  // the key stays out of the bundle and there's no cross-origin request to
  // need CORS for. See vite.config.js.
  accountServiceUrl:
    import.meta.env.VITE_ACCOUNT_SERVICE_URL ||
    (isProd
      ? PROD_ACCOUNT_URL
      : typeof window !== 'undefined'
        ? `${window.location.origin}/api/account`
        : 'http://localhost:4001'),

  // portal-api, the only service the browser is meant to talk to directly.
  // In dev it points to localhost:4002. In production for Route, Netlify proxies
  // /auth and /me to Fly.io so cookies stay strictly first-party.
  portalApiUrl:
    import.meta.env.VITE_PORTAL_API_URL ||
    (isProd
      ? isRouteApp
        ? browserOrigin
        : PROD_PORTAL_URL
      : 'http://localhost:4002'),

  paymentServiceUrl:
    import.meta.env.VITE_PAYMENT_SERVICE_URL ||
    (isProd ? PROD_PAYMENT_URL : 'http://localhost:4003'),

  litellmUrl:
    import.meta.env.VITE_LITELLM_URL ||
    (isProd ? PROD_LITELLM_URL : 'http://localhost:4000'),

  ipGeolocationUrl:
    import.meta.env.VITE_IP_GEO_URL || 'https://get.geojs.io/v1/ip/geo.json',
};

// Currencies a top-up can be settled in - gated by IvoryPay and the
// compliance work behind holding funds, so this is a business decision.
// NOT the same as the currencies we can quote a price in: /fx/rates covers
// every African currency the rate feed carries, which is what the map reads.
export const PAYABLE_CURRENCIES: string[] = ['NGN', 'UGX', 'GHS', 'KES'];

export const REFERENCE_USD_AMOUNT = 0.5;
