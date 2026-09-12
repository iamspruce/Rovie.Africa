import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RequireAuth } from './components/RequireAuth/RequireAuth';
import { RouteProduct } from './pages/Route/Route';
import { Models } from './pages/Models/Models';
import { SignIn } from './pages/SignIn/SignIn';
import { SignUp } from './pages/SignUp/SignUp';
import { ResetPassword } from './pages/ResetPassword/ResetPassword';
import { DashboardLayout } from './pages/Dashboard/DashboardLayout';
import { Overview } from './pages/Dashboard/Overview';
import { Usage } from './pages/Dashboard/Usage';
import { ApiKeys } from './pages/Dashboard/ApiKeys';
import { Billing } from './pages/Dashboard/Billing';
import { Account } from './pages/Dashboard/Account';
import { RouteProductSeo } from './components/Seo/RouteProductSeo';
import { RouteChrome } from './components/RouteChrome/RouteChrome';

/**
 * The Route product application.
 *
 * It is intentionally a different entry point from the Rovie company site:
 * `npm run dev:route` serves it at localhost:5174, and production serves the
 * same entry point at route.rovie.africa. Authentication and account state
 * therefore never need to be presented as part of the umbrella website.
 */
export function RouteApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RouteProductSeo />
        <RouteChrome>
          <Routes>
          <Route path="/" element={<RouteProduct />} />
          <Route path="/models" element={<Models />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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
          {/* Existing umbrella links land on Route's actual homepage. */}
          <Route path="/route" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </RouteChrome>
      </BrowserRouter>
    </AuthProvider>
  );
}
