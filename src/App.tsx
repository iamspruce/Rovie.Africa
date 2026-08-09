import { BrowserRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/Header/Header';
import { Footer } from './components/Footer/Footer';
import { AppRoutes, CHROMELESS_ROUTES } from './routes/router';

function AppShell() {
  const { pathname } = useLocation();
  // /signin and /signup draw their own full-height two-column layout, so the
  // site header and footer stand down for them.
  const isChromeless = CHROMELESS_ROUTES.includes(pathname);

  if (isChromeless) return <AppRoutes />;

  return (
    <div className="appShell">
      <Header />
      {/* Target for the header's skip link. It wraps the routes rather
          than living on any one page's <main>, so every route has it. */}
      <div id="main-content" tabIndex={-1} className="appMain">
        <AppRoutes />
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
