export interface RouteSeoEntry {
  path: string;
  title: string;
  description: string;
  noindex?: boolean;
}

export const SITE_URL = 'https://route.rovie.africa';
export const SITE_NAME = 'Rovie Route';

export const ROUTE_SEO: readonly RouteSeoEntry[] = [
  {
    path: '/',
    title: 'Rovie Route — AI infrastructure for Africa',
    description:
      'One API for leading AI models, with local-currency pricing and payments built for African developers.',
  },
  {
    path: '/models',
    title: 'Models and pricing',
    description:
      'Browse the AI models available through Rovie Route, with capabilities and live local-currency prices.',
  },
  { path: '/signin', title: 'Sign in to Rovie Route', description: 'Sign in to your Route account.', noindex: true },
  { path: '/signup', title: 'Create a Rovie Route account', description: 'Create an account and start building with Route.', noindex: true },
  { path: '/reset-password', title: 'Reset your Route password', description: 'Set a new Route account password.', noindex: true },
  { path: '/dashboard', title: 'Rovie Route dashboard', description: 'Your Route API keys, usage, credit and settings.', noindex: true },
];

export const INDEXABLE_ROUTES = ROUTE_SEO.filter((entry) => !entry.noindex);

export function titleFor(entry: RouteSeoEntry): string {
  return entry.title;
}

export function canonicalFor(path: string): string {
  const clean = path.split('?')[0].split('#')[0].replace(/\/+$/, '');
  return `${SITE_URL}${clean || '/'}`;
}

export function seoForPath(pathname: string): RouteSeoEntry {
  const clean = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  return (
    ROUTE_SEO.find((entry) => entry.path === clean) ??
    ROUTE_SEO.find((entry) => entry.path === '/dashboard' && clean.startsWith('/dashboard/')) ??
    ROUTE_SEO[0]
  );
}
