import { Routes, Route, Navigate } from 'react-router-dom';
import { Home } from '../pages/Home/Home';
import { Models } from '../pages/Models/Models';
import { Rankings } from '../pages/Rankings/Rankings';
import { Status } from '../pages/Status/Status';
import { Support } from '../pages/Support/Support';
import { Legal, LEGAL_DOCS } from '../pages/Legal/Legal';
import { Placeholder } from '../pages/Placeholder/Placeholder';
import { SignIn } from '../pages/SignIn/SignIn';
import { SignUp } from '../pages/SignUp/SignUp';
import { DashboardLayout } from '../pages/Dashboard/DashboardLayout';
import { Overview } from '../pages/Dashboard/Overview';
import { Usage } from '../pages/Dashboard/Usage';
import { ApiKeys } from '../pages/Dashboard/ApiKeys';
import { Billing } from '../pages/Dashboard/Billing';
import { Account } from '../pages/Dashboard/Account';
import { RequireAuth } from '../components/RequireAuth/RequireAuth';
import { PLACEHOLDER_PAGES } from '../content/placeholderPages';

export function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/models" element={<Models />} />
      <Route path="/rankings" element={<Rankings />} />
      <Route path="/status" element={<Status />} />
      <Route path="/support" element={<Support />} />

      {/* Auth pages render their own full-page two-column layout and are
          deliberately outside the site header/footer - see AuthLayout. */}
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />

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
          currency, cheapest first - and the docs section was removed. Old
          links land somewhere useful rather than on nothing. */}
      <Route path="/pricing" element={<Navigate to="/models" replace />} />
      <Route path="/leaderboard" element={<Navigate to="/models" replace />} />
      <Route path="/docs/:slug" element={<Navigate to="/docs" replace />} />

      {/* Common aliases people type or arrive on from old links. */}
      <Route path="/login" element={<Navigate to="/signin" replace />} />
      <Route path="/register" element={<Navigate to="/signup" replace />} />

      <Route path="*" element={<Placeholder />} />
    </Routes>
  );
}

/**
 * Routes that draw their own full-page chrome. App uses this to leave the
 * site header and footer off them - a sign-in page offering eight other
 * destinations works against the one thing the visitor came to do.
 */
export const CHROMELESS_ROUTES: readonly string[] = ['/signin', '/signup'];
