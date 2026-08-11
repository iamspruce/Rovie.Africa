import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Home } from '../pages/Home/Home';
import { RequireAuth } from '../components/RequireAuth/RequireAuth';
import { ExternalRedirect } from '../components/ExternalRedirect/ExternalRedirect';
import { PLACEHOLDER_PAGES } from '../content/placeholderPages';
import { LEGAL_DOCS } from '../content/legalDocs';
import { DOCS_URL } from '../content/navLinks';

// -----------------------------------------------------------------------
// Home is imported eagerly; everything else is split.
//
// The homepage is where most first visits land, and its heading is the thing
// that has to paint fast. Making it a lazy chunk would put a second network
// round trip between the entry script and the first pixel of text, which is
// the opposite of the point.
//
// Every other route pays its own way. The weight is not evenly spread: the
// auth pages carry ~170 KB of projected map geometry for the plate, the legal
// pages carry react-markdown and three documents, and the dashboard carries
// five screens nobody signed out will ever open. None of that belongs in the
// bundle someone downloads to read the homepage.
//
// The globe is split separately, from inside Home - see AfricaMapLazy - so
// the hero's text does not wait on 170 KB of coastline either.
// -----------------------------------------------------------------------
const Models = lazy(() => import('../pages/Models/Models').then((m) => ({ default: m.Models })));
const Rankings = lazy(() =>
  import('../pages/Rankings/Rankings').then((m) => ({ default: m.Rankings }))
);
const Status = lazy(() => import('../pages/Status/Status').then((m) => ({ default: m.Status })));
const Support = lazy(() =>
  import('../pages/Support/Support').then((m) => ({ default: m.Support }))
);
// Split for its typeface as much as for its markup: About is the only page
// that loads Borel, and that file has no business in the bundle someone
// downloads to read the homepage.
const About = lazy(() => import('../pages/About/About').then((m) => ({ default: m.About })));
const Legal = lazy(() => import('../pages/Legal/Legal').then((m) => ({ default: m.Legal })));
const Placeholder = lazy(() =>
  import('../pages/Placeholder/Placeholder').then((m) => ({ default: m.Placeholder }))
);
const SignIn = lazy(() => import('../pages/SignIn/SignIn').then((m) => ({ default: m.SignIn })));
const SignUp = lazy(() => import('../pages/SignUp/SignUp').then((m) => ({ default: m.SignUp })));
const ResetPassword = lazy(() =>
  import('../pages/ResetPassword/ResetPassword').then((m) => ({ default: m.ResetPassword }))
);

const DashboardLayout = lazy(() =>
  import('../pages/Dashboard/DashboardLayout').then((m) => ({ default: m.DashboardLayout }))
);
const Overview = lazy(() =>
  import('../pages/Dashboard/Overview').then((m) => ({ default: m.Overview }))
);
const Usage = lazy(() => import('../pages/Dashboard/Usage').then((m) => ({ default: m.Usage })));
const ApiKeys = lazy(() =>
  import('../pages/Dashboard/ApiKeys').then((m) => ({ default: m.ApiKeys }))
);
const Billing = lazy(() =>
  import('../pages/Dashboard/Billing').then((m) => ({ default: m.Billing }))
);
const Account = lazy(() =>
  import('../pages/Dashboard/Account').then((m) => ({ default: m.Account }))
);

export function AppRoutes(): React.JSX.Element {
  return (
    // No spinner. A route chunk is a local, cached, sub-100ms fetch on
    // anything but a first visit, and a spinner that flashes for 60ms reads as
    // a fault rather than as progress. The header and footer stay on screen
    // throughout, so the page never looks empty.
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/models" element={<Models />} />
        <Route path="/rankings" element={<Rankings />} />
        <Route path="/status" element={<Status />} />
        <Route path="/support" element={<Support />} />
        <Route path="/about" element={<About />} />

        {/* Auth pages render their own full-page two-column layout and are
            deliberately outside the site header/footer - see AuthLayout. */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        {/* Where portal-api sends the browser after checking an emailed reset
            token. Reached by link only, never linked to from the site. */}
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Everything below the guard is session-only. The guard is a
            convenience: portal-api authorises every request itself, so a
            bypass here reaches no data. */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Overview />} />
          <Route path="usage" element={<Usage />} />
          <Route path="keys" element={<ApiKeys />} />
          <Route path="billing" element={<Billing />} />
          <Route path="account" element={<Account />} />
        </Route>

        {/* Privacy, Data policy and Terms - one page component, three documents. */}
        {LEGAL_DOCS.map((doc) => (
          <Route key={doc.path} path={doc.path} element={<Legal />} />
        ))}

        {/* Routes whose content isn't written yet. They're real routes rather
            than dead footer links, and each one disappears from here the moment
            a real page replaces it. */}
        {PLACEHOLDER_PAGES.map((page) => (
          <Route key={page.path} path={page.path} element={<Placeholder />} />
        ))}

        {/* Retired. /models is the pricing page - every model's rate in local
            currency, cheapest first. Old links land somewhere useful rather
            than on nothing. */}
        <Route path="/pricing" element={<Navigate to="/models" replace />} />
        <Route path="/leaderboard" element={<Navigate to="/models" replace />} />

        {/* Moved off this host entirely, to the Astro site in docs/. These are
            a fallback: public/_redirects gives the host a real 301 for each
            one, which is what preserves the old URLs' ranking. See
            components/ExternalRedirect for why both exist.

            /docs/* keeps its path because the docs site has a page at every
            one of those slugs; the other two do not, so they land on the
            section front page rather than on a 404 with our name on it. */}
        <Route path="/docs/*" element={<ExternalRedirect to={DOCS_URL} preservePath />} />
        <Route path="/docs" element={<ExternalRedirect to={`${DOCS_URL}/start/quickstart/`} />} />
        <Route path="/api-reference" element={<ExternalRedirect to={`${DOCS_URL}/api/`} />} />
        <Route path="/sdk" element={<ExternalRedirect to={`${DOCS_URL}/sdks/overview/`} />} />

        {/* Common aliases people type or arrive on from old links. */}
        <Route path="/login" element={<Navigate to="/signin" replace />} />
        <Route path="/register" element={<Navigate to="/signup" replace />} />

        <Route path="*" element={<Placeholder />} />
      </Routes>
    </Suspense>
  );
}

/**
 * Routes that draw their own full-page chrome. App uses this to leave the
 * site header and footer off them - a sign-in page offering eight other
 * destinations works against the one thing the visitor came to do.
 */
export const CHROMELESS_ROUTES: readonly string[] = ['/signin', '/signup', '/reset-password'];
