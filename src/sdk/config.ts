export interface Config {
  accountServiceUrl: string;
  portalApiUrl: string;
  paymentServiceUrl: string;
  litellmUrl: string;
  ipGeolocationUrl: string;
}

const isProd = import.meta.env.PROD;

const PRODUCTION_BASE_URL = 'https://api.getrovie.com';

export const config: Config = {
  // In dev this is a same-origin path, not an origin: the Vite server proxies
  // /api/account to account-service and attaches the shared secret there, so
  // the key stays out of the bundle and there's no cross-origin request to
  // need CORS for. See vite.config.js.
  accountServiceUrl:
    import.meta.env.VITE_ACCOUNT_SERVICE_URL ||
    (isProd
      ? PRODUCTION_BASE_URL
      : typeof window !== 'undefined'
        ? `${window.location.origin}/api/account`
        : 'http://localhost:4001'),

  // portal-api, the only service the browser is meant to talk to directly.
  // Unlike account-service above this is NOT proxied through Vite: sign-in
  // sets a session cookie, and the Google and magic-link callbacks land on
  // portal-api's own origin rather than the dev server's. Routing normal
  // calls through a proxy while those two arrive direct would put the cookie
  // in one place and look for it in another.
  //
  // Cookies ignore ports, so a cookie set by localhost:4002 is sent with
  // requests from localhost:5173 - dev works without SameSite=None. In
  // production Caddy serves the app and /auth|/me from one origin (see
  // infra/caddy/Caddyfile), so it's same-origin there.
  portalApiUrl:
    import.meta.env.VITE_PORTAL_API_URL ||
    (isProd
      ? PRODUCTION_BASE_URL
      : 'http://localhost:4002'),

  paymentServiceUrl:
    import.meta.env.VITE_PAYMENT_SERVICE_URL ||
    (isProd ? PRODUCTION_BASE_URL : 'http://localhost:4003'),

  litellmUrl:
    import.meta.env.VITE_LITELLM_URL ||
    (isProd ? PRODUCTION_BASE_URL : 'http://localhost:4000'),

  ipGeolocationUrl:
    import.meta.env.VITE_IP_GEO_URL || 'https://get.geojs.io/v1/ip/geo.json',
};

// Currencies a top-up can be settled in - gated by IvoryPay and the
// compliance work behind holding funds, so this is a business decision.
// NOT the same as the currencies we can quote a price in: /fx/rates covers
// every African currency the rate feed carries, which is what the map reads.
export const PAYABLE_CURRENCIES: string[] = ['NGN', 'UGX', 'GHS', 'KES'];

export const REFERENCE_USD_AMOUNT = 0.5;
